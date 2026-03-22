/**
 * FraudShield — JWT Authentication & RBAC
 *
 * Routes:  POST /api/auth/login, POST /api/auth/register
 * Middleware: requireAuth, requireRole('admin')
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByUsername, createUser, getAllUsers } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fraudshield_secret_key_2025';
const JWT_EXPIRY = '8h';

// ── Middleware ─────────────────────────────────────────────────────────────────

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerAuthRoutes(app) {
  // Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      expiresIn: JWT_EXPIRY,
    });
  });

  // Register (admin only)
  app.post('/api/auth/register', requireAuth, requireRole('admin'), (req, res) => {
    const { username, password, name, role = 'viewer' } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name required' });
    }

    if (!['admin', 'analyst'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or analyst' });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    createUser(username, hash, name, role);

    res.status(201).json({ message: 'User created', username, role });
  });

  // Get current user info
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // List users (admin only)
  app.get('/api/auth/users', requireAuth, requireRole('admin'), (req, res) => {
    res.json({ users: getAllUsers() });
  });
}
