"""
FraudShield ML API — FastAPI server for real-time fraud scoring.

Trained on PaySim1 dataset (Kaggle). Accepts raw transaction
features and returns risk scores with explainable reasoning.

Endpoints:
  POST /predict        — Score a transaction
  GET  /model-metrics  — Return model performance metrics
  GET  /health         — Health check
  POST /batch-predict  — Score multiple transactions
"""

import os
import json
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib

# ── Paths ──────────────────────────────────────────────────────────────────────
ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "fraud_model.joblib")
METRICS_PATH = os.path.join(ML_DIR, "model_metrics.json")
FEATURE_NAMES_PATH = os.path.join(ML_DIR, "feature_names.json")

# ── Global state ───────────────────────────────────────────────────────────────
model = None
metrics = None
feature_names = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global model, metrics, feature_names

    if not os.path.exists(MODEL_PATH):
        print("⚠  Model not found. Please run train_model.py first.")
        print("   python backend/ml/train_model.py")
    else:
        print("🔄 Loading fraud detection model...")
        model = joblib.load(MODEL_PATH)

        with open(METRICS_PATH) as f:
            metrics = json.load(f)

        with open(FEATURE_NAMES_PATH) as f:
            feature_names = json.load(f)

        print(f"✅ Model loaded! ({len(feature_names)} features, PR-AUC: {metrics['pr_auc']})")
        print(f"   Dataset: {metrics.get('dataset', 'unknown')}")
    yield
    print("🛑 Shutting down ML API...")


app = FastAPI(
    title="FraudShield ML API",
    description="Real-time fraud detection scoring engine — trained on PaySim1 dataset",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ────────────────────────────────────────────────────

class TransactionFeatures(BaseModel):
    """Raw PaySim-style transaction features."""
    step: int = Field(1, description="Time step (1 step = 1 hour)")
    type: str = Field("TRANSFER", description="CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER")
    amount: float = Field(..., description="Transaction amount")
    oldbalanceOrg: float = Field(0, description="Sender balance before")
    newbalanceOrig: float = Field(0, description="Sender balance after")
    oldbalanceDest: float = Field(0, description="Receiver balance before")
    newbalanceDest: float = Field(0, description="Receiver balance after")
    # Optional enrichment fields
    is_merchant_dest: int = Field(0, ge=0, le=1, description="Is receiver a merchant?")
    same_orig_dest: int = Field(0, ge=0, le=1, description="Same sender and receiver name?")
    tx_count_per_step: int = Field(1, ge=1, description="Sender's tx count this step")
    total_amount_per_step: float = Field(0, description="Sender's total amount this step")
    dest_unique_senders: int = Field(1, ge=1, description="Unique senders to this receiver")


class PredictionResponse(BaseModel):
    risk_score: int
    is_fraud: bool
    probability: float
    confidence: str
    explanation: list[str]


class BatchPredictionRequest(BaseModel):
    transactions: list[TransactionFeatures]


# ── Feature Engineering ────────────────────────────────────────────────────────

def engineer_features(tx: TransactionFeatures) -> np.ndarray:
    """Convert raw transaction to the feature vector matching training."""

    # Balance features
    orig_balance_change = tx.newbalanceOrig - tx.oldbalanceOrg
    dest_balance_change = tx.newbalanceDest - tx.oldbalanceDest
    orig_balance_zeroed = 1 if tx.newbalanceOrig == 0 else 0
    amount_to_balance_ratio = tx.amount / (tx.oldbalanceOrg + 1)
    balance_mismatch_orig = abs(tx.oldbalanceOrg - tx.amount - tx.newbalanceOrig)
    balance_mismatch_dest = abs(tx.oldbalanceDest + tx.amount - tx.newbalanceDest)

    # Amount features
    log_amount = np.log1p(tx.amount)
    high_value_tx = 1 if tx.amount > 200000 else 0

    # Temporal features
    hour_of_day = tx.step % 24
    is_night = 1 if hour_of_day >= 22 or hour_of_day <= 5 else 0
    day_of_sim = tx.step // 24

    # Transaction type one-hot
    type_cash_in = 1 if tx.type == "CASH_IN" else 0
    type_cash_out = 1 if tx.type == "CASH_OUT" else 0
    type_debit = 1 if tx.type == "DEBIT" else 0
    type_payment = 1 if tx.type == "PAYMENT" else 0
    type_transfer = 1 if tx.type == "TRANSFER" else 0

    total_amount = tx.total_amount_per_step if tx.total_amount_per_step > 0 else tx.amount

    features = [
        tx.step, tx.amount, tx.oldbalanceOrg, tx.newbalanceOrig,
        tx.oldbalanceDest, tx.newbalanceDest,
        orig_balance_change, dest_balance_change,
        orig_balance_zeroed, amount_to_balance_ratio,
        balance_mismatch_orig, balance_mismatch_dest,
        log_amount, high_value_tx,
        hour_of_day, is_night, day_of_sim,
        tx.is_merchant_dest, tx.same_orig_dest,
        tx.tx_count_per_step, total_amount, tx.dest_unique_senders,
        type_cash_in, type_cash_out, type_debit, type_payment, type_transfer,
    ]

    return np.array([features])


def generate_explanation(tx: TransactionFeatures, probability: float) -> list[str]:
    """Generate human-readable explanations for a prediction."""
    explanations = []

    if tx.newbalanceOrig == 0 and tx.oldbalanceOrg > 0:
        explanations.append(
            f"Sender's entire balance (${tx.oldbalanceOrg:,.2f}) was drained to zero — "
            f"consistent with account takeover or mule behavior."
        )

    if tx.amount > 200000:
        explanations.append(
            f"High-value transaction (${tx.amount:,.2f}) — exceeds $200K threshold "
            f"commonly associated with large-scale laundering."
        )

    balance_mismatch = abs(tx.oldbalanceOrg - tx.amount - tx.newbalanceOrig)
    if balance_mismatch > 1:
        explanations.append(
            f"Balance mismatch detected: sender had ${tx.oldbalanceOrg:,.2f}, "
            f"sent ${tx.amount:,.2f}, but ended with ${tx.newbalanceOrig:,.2f} "
            f"(mismatch: ${balance_mismatch:,.2f}). Potential fraudulent alteration."
        )

    if tx.type in ("TRANSFER", "CASH_OUT") and tx.amount > tx.oldbalanceOrg * 0.9:
        explanations.append(
            f"Transaction uses >90% of sender's balance in a {tx.type} — "
            f"high-risk pattern for fraud."
        )

    hour = tx.step % 24
    if hour >= 22 or hour <= 5:
        explanations.append(
            f"Transaction occurred during off-hours (hour {hour}:00), "
            f"which statistically correlates with higher fraud rates."
        )

    if tx.tx_count_per_step > 5:
        explanations.append(
            f"Velocity alert: {tx.tx_count_per_step} transactions by this sender "
            f"in the same time window — pattern of automated fraud."
        )

    if tx.type == "TRANSFER" and tx.newbalanceDest == 0:
        explanations.append(
            f"Transferred funds to account with zero resulting balance (immediate cash-out) — "
            f"classic layering pattern."
        )

    if not explanations:
        if probability > 0.5:
            explanations.append(
                "Combination of subtle anomalies across multiple features triggered the alert."
            )
        else:
            explanations.append(
                "Transaction profile is consistent with normal behavior patterns."
            )

    return explanations


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "features": len(feature_names) if feature_names else 0,
        "dataset": metrics.get("dataset", "unknown") if metrics else "none",
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(features: TransactionFeatures):
    """Score a single transaction for fraud probability."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    X = engineer_features(features)
    probability = float(model.predict_proba(X)[0, 1])
    is_fraud = probability >= 0.5
    risk_score = int(min(probability * 100, 99))

    if probability > 0.8:
        confidence = "High"
    elif probability > 0.5:
        confidence = "Medium"
    elif probability > 0.2:
        confidence = "Low"
    else:
        confidence = "Very Low"

    explanation = generate_explanation(features, probability)

    return PredictionResponse(
        risk_score=risk_score,
        is_fraud=is_fraud,
        probability=round(probability, 4),
        confidence=confidence,
        explanation=explanation,
    )


@app.post("/batch-predict")
async def batch_predict(request: BatchPredictionRequest):
    """Score multiple transactions."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    results = []
    for tx in request.transactions:
        X = engineer_features(tx)
        probability = float(model.predict_proba(X)[0, 1])
        is_fraud = probability >= 0.5
        risk_score = int(min(probability * 100, 99))
        confidence = "High" if probability > 0.8 else "Medium" if probability > 0.5 else "Low"
        explanation = generate_explanation(tx, probability)
        results.append({
            "risk_score": risk_score,
            "is_fraud": is_fraud,
            "probability": round(probability, 4),
            "confidence": confidence,
            "explanation": explanation,
        })

    return {"predictions": results}


@app.get("/model-metrics")
async def model_metrics():
    """Return model performance metrics and feature importances."""
    if metrics is None:
        raise HTTPException(status_code=503, detail="Metrics not loaded")
    return metrics


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
