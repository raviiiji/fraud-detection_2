"""
XGBoost Fraud Detection Model — Trained on PaySim1 Dataset

Uses the real PaySim mobile money transaction dataset from Kaggle
(ealaxi/paysim1) with engineered features for production-grade
fraud detection.

Dataset: ~6.3M transactions, 11 columns
Fraud rate: ~0.13% (highly imbalanced)
"""

import os
import sys
import json
import glob
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    precision_recall_curve,
    auc,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from xgboost import XGBClassifier
import joblib

# ── Configuration ──────────────────────────────────────────────────────────────
ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "fraud_model.joblib")
METRICS_PATH = os.path.join(ML_DIR, "model_metrics.json")
FEATURE_NAMES_PATH = os.path.join(ML_DIR, "feature_names.json")
RANDOM_SEED = 42


def find_paysim_csv():
    """Locate the PaySim CSV file in kagglehub cache."""
    home = os.path.expanduser("~")
    pattern = os.path.join(
        home, ".cache", "kagglehub", "datasets", "ealaxi", "paysim1", "**", "*.csv"
    )
    files = glob.glob(pattern, recursive=True)
    if not files:
        print("❌ PaySim CSV not found. Make sure you've run:")
        print("   python -c \"import kagglehub; kagglehub.dataset_download('ealaxi/paysim1')\"")
        sys.exit(1)
    return files[0]


def load_and_engineer_features(csv_path: str) -> pd.DataFrame:
    """Load PaySim data and engineer fraud-detection features."""
    print(f"  Loading: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"  Raw shape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"  Fraud: {df['isFraud'].sum():,} ({df['isFraud'].mean()*100:.3f}%)")

    # ── Core Feature Engineering ───────────────────────────────────────────

    # 1. One-hot encode transaction type
    type_dummies = pd.get_dummies(df["type"], prefix="type")
    df = pd.concat([df, type_dummies], axis=1)

    # 2. Balance-based features (key fraud indicators)
    df["orig_balance_change"] = df["newbalanceOrig"] - df["oldbalanceOrg"]
    df["dest_balance_change"] = df["newbalanceDest"] - df["oldbalanceDest"]

    # Zero origin balance after transaction (suspicious: entire balance drained)
    df["orig_balance_zeroed"] = (df["newbalanceOrig"] == 0).astype(int)

    # Amount vs origin balance ratio (how much of balance was used)
    df["amount_to_balance_ratio"] = df["amount"] / (df["oldbalanceOrg"] + 1)

    # Large amount deviation from sender's balance
    df["balance_mismatch_orig"] = (
        abs(df["oldbalanceOrg"] - df["amount"] - df["newbalanceOrig"])
    )
    df["balance_mismatch_dest"] = (
        abs(df["oldbalanceDest"] + df["amount"] - df["newbalanceDest"])
    )

    # 3. Amount-based features
    df["log_amount"] = np.log1p(df["amount"])
    df["high_value_tx"] = (df["amount"] > 200000).astype(int)

    # 4. Temporal features
    df["hour_of_day"] = df["step"] % 24
    df["is_night"] = ((df["hour_of_day"] >= 22) | (df["hour_of_day"] <= 5)).astype(int)
    df["day_of_sim"] = df["step"] // 24

    # 5. Merchant indicator (PaySim merchants start with 'M')
    df["is_merchant_dest"] = df["nameDest"].str.startswith("M").astype(int)

    # 6. Same name origin and destination (round-tripping indicator)
    df["same_orig_dest"] = (df["nameOrig"] == df["nameDest"]).astype(int)

    # 7. Velocity features (grouped by sender within same step)
    sender_velocity = df.groupby(["nameOrig", "step"]).agg(
        tx_count_per_step=("amount", "count"),
        total_amount_per_step=("amount", "sum"),
    ).reset_index()
    df = df.merge(sender_velocity, on=["nameOrig", "step"], how="left")

    # 8. Receiver popularity (how many senders send to this account)
    dest_popularity = df.groupby("nameDest")["nameOrig"].nunique().reset_index()
    dest_popularity.columns = ["nameDest", "dest_unique_senders"]
    df = df.merge(dest_popularity, on="nameDest", how="left")

    print(f"  Engineered features: {df.shape[1]} total columns")
    return df


def train_model():
    """Train XGBoost model on PaySim data."""
    print("=" * 60)
    print("  FraudShield — XGBoost Model Training (PaySim Dataset)")
    print("=" * 60)

    # Load and engineer features
    print(f"\n[1/5] Loading and engineering features...")
    csv_path = find_paysim_csv()
    df = load_and_engineer_features(csv_path)

    # Select features
    feature_cols = [
        "step", "amount", "oldbalanceOrg", "newbalanceOrig",
        "oldbalanceDest", "newbalanceDest",
        # Balance features
        "orig_balance_change", "dest_balance_change",
        "orig_balance_zeroed", "amount_to_balance_ratio",
        "balance_mismatch_orig", "balance_mismatch_dest",
        # Amount features
        "log_amount", "high_value_tx",
        # Temporal features
        "hour_of_day", "is_night", "day_of_sim",
        # Entity features
        "is_merchant_dest", "same_orig_dest",
        # Velocity
        "tx_count_per_step", "total_amount_per_step", "dest_unique_senders",
    ]

    # Add type dummies
    type_cols = [c for c in df.columns if c.startswith("type_")]
    feature_cols.extend(type_cols)

    X = df[feature_cols].fillna(0)
    y = df["isFraud"]

    print(f"\n[2/5] Preparing training data...")
    print(f"  Features: {len(feature_cols)}")
    print(f"  Fraud: {y.sum():,} ({y.mean()*100:.3f}%)")
    print(f"  Legit: {(~y.astype(bool)).sum():,} ({(1-y.mean())*100:.3f}%)")

    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    # Train
    print(f"\n[3/5] Training XGBoost model ({len(X_train):,} training samples)...")
    fraud_weight = (len(y_train) - y_train.sum()) / y_train.sum()
    print(f"  Class weight (scale_pos_weight): {fraud_weight:.1f}")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=fraud_weight,
        eval_metric="aucpr",
        random_state=RANDOM_SEED,
        use_label_encoder=False,
        tree_method="hist",  # Fast for large datasets
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluate
    print(f"\n[4/5] Evaluating model...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    precision_vals, recall_vals, _ = precision_recall_curve(y_test, y_proba)
    pr_auc_score = auc(recall_vals, precision_vals)
    recall_val = recall_score(y_test, y_pred)
    precision_val = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    print(f"\n{'─' * 50}")
    print(classification_report(y_test, y_pred, target_names=["Legitimate", "Fraud"]))
    print(f"{'─' * 50}")
    print(f"  PR-AUC:      {pr_auc_score:.4f}")
    print(f"  Recall:      {recall_val:.4f}")
    print(f"  Precision:   {precision_val:.4f}")
    print(f"  F1-Score:    {f1:.4f}")
    print(f"  TP: {tp:,}  FP: {fp:,}  FN: {fn:,}  TN: {tn:,}")
    print(f"{'─' * 50}")

    # Feature importance
    importance = dict(zip(feature_cols, model.feature_importances_.tolist()))
    sorted_importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))

    print(f"\n  Top 10 Features:")
    for i, (feat, imp) in enumerate(list(sorted_importance.items())[:10]):
        bar = "█" * int(imp * 150)
        print(f"    {i+1:2d}. {feat:<28s} {imp:.4f}  {bar}")

    # Save
    print(f"\n[5/5] Saving model and metrics...")
    joblib.dump(model, MODEL_PATH)

    metrics = {
        "dataset": "PaySim1 (Kaggle ealaxi/paysim1)",
        "total_samples": len(df),
        "pr_auc": round(pr_auc_score, 4),
        "recall": round(recall_val, 4),
        "precision": round(precision_val, 4),
        "f1_score": round(f1, 4),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "n_features": len(feature_cols),
        "fraud_ratio": round(y.mean(), 6),
        "confusion_matrix": {"TP": int(tp), "FP": int(fp), "FN": int(fn), "TN": int(tn)},
        "feature_importance": {k: round(v, 4) for k, v in sorted_importance.items()},
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    with open(FEATURE_NAMES_PATH, "w") as f:
        json.dump(feature_cols, f, indent=2)

    print(f"  Model saved to: {MODEL_PATH}")
    print(f"  Metrics saved to: {METRICS_PATH}")
    print(f"\n{'=' * 60}")
    print("  Training complete on real PaySim data!")
    print(f"{'=' * 60}\n")

    return model, metrics


if __name__ == "__main__":
    train_model()
