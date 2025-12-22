/**
 * Punto de Entrada del Servidor
 * Cobblemon Los Pitufos - Backend API
 * 
 * VERSIÓN COMPLETA con todos los endpoints para el plugin
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Environment variables
const PORT = process.env.PORT || 25617;
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// IP Whitelist for plugin
const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim());

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI environment variable is required!');
  process.exit(1);
}

// MongoDB client
let db = null;
let client = null;

async function connectToDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const dbName = process.env.MONGODB_DATABASE || 'admin';
    db = client.db(dbName);
    console.log('✅ Conectado a MongoDB:', db.databaseName);
    return db;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// Generate verification code
function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));

  const allowedOrigins = [
    FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (isDevelopment && origin.startsWith('http://localhost:')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), port: PORT, environment: NODE_ENV });
  });

  app.get('/server-status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // ============================================
  // PLUGIN ENDPOINTS - CRITICAL
  // ============================================
