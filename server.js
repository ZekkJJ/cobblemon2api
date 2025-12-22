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

  // POST /api/players/sync - Sync player data from plugin
  app.post('/api/players/sync', async (req, res) => {
    try {
      const { uuid, username, online, party, pcStorage } = req.body;
      if (!uuid || !username) {
        return res.status(400).json({ error: 'uuid and username required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        // Create new user
        await db.collection('users').insertOne({
          minecraftUuid: uuid,
          minecraftUsername: username,
          online: online || false,
          party: party || [],
          pcStorage: pcStorage || [],
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return res.json({ success: true, verified: false, banned: false });
      }

      // Update existing user
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            minecraftUsername: username,
            online: online || false,
            party: party || user.party || [],
            pcStorage: pcStorage || user.pcStorage || [],
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        verified: user.verified || false,
        banned: user.banned || false,
        banReason: user.banReason,
      });
    } catch (error) {
      console.error('[PLAYERS SYNC] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/admin/ban-status - Check if player is banned
  app.get('/api/admin/ban-status', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.json({ banned: false });
      }

      res.json({
        banned: user.banned || false,
        banReason: user.banReason,
      });
    } catch (error) {
      console.error('[BAN STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/verification/generate - Generate verification code
  app.post('/api/verification/generate', async (req, res) => {
    try {
      const { minecraftUuid, minecraftUsername } = req.body;
      if (!minecraftUuid || !minecraftUsername) {
        return res.status(400).json({ error: 'minecraftUuid and minecraftUsername required' });
      }

      const db = getDb();
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.collection('users').updateOne(
        { minecraftUuid },
        {
          $set: {
            minecraftUuid,
            minecraftUsername,
            verificationCode: code,
            verificationCodeExpiresAt: expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            verified: false,
          },
        },
        { upsert: true }
      );

      res.json({ success: true, code });
    } catch (error) {
      console.error('[VERIFICATION GENERATE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/verification/verify - Verify code from plugin
  app.post('/api/verification/verify', async (req, res) => {
    try {
      const { minecraftUuid, code } = req.body;
      if (!minecraftUuid || !code) {
        return res.status(400).json({ error: 'minecraftUuid and code required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid });

      if (!user) {
        return res.json({ success: false, message: 'User not found' });
      }

      if (user.verified) {
        return res.json({ success: true, message: 'Already verified' });
      }

      if (user.verificationCode !== code) {
        return res.json({ success: false, message: 'Invalid code' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ success: false, message: 'Code expired' });
      }

      // Check if Discord is linked
      if (!user.discordId) {
        return res.json({ success: false, message: 'Discord not linked yet' });
      }

      // Mark as verified
      await db.collection('users').updateOne(
        { minecraftUuid },
        {
          $set: {
            verified: true,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $unset: {
            verificationCode: '',
            verificationCodeExpiresAt: '',
          },
        }
      );

      res.json({ success: true, message: 'Verified successfully' });
    } catch (error) {
      console.error('[VERIFICATION VERIFY] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/gacha/delivery/status - Check starter delivery status
  app.get('/api/gacha/delivery/status', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.json({ deliveryInProgress: false, hasPendingStarter: false });
      }

      res.json({
        deliveryInProgress: user.starterDeliveryInProgress || false,
        hasPendingStarter: user.starterClaimed && !user.starterDelivered,
        starterId: user.starterId,
        starterIsShiny: user.starterIsShiny || false,
      });
    } catch (error) {
      console.error('[DELIVERY STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/start - Mark delivery as started
  app.post('/api/gacha/delivery/start', async (req, res) => {
    try {
      const { uuid } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: { starterDeliveryInProgress: true, updatedAt: new Date() } }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY START] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/success - Mark delivery as successful
  app.post('/api/gacha/delivery/success', async (req, res) => {
    try {
      const { uuid } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDelivered: true,
            starterDeliveryInProgress: false,
            starterDeliveredAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY SUCCESS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/delivery/failed - Mark delivery as failed
  app.post('/api/gacha/delivery/failed', async (req, res) => {
    try {
      const { uuid, reason } = req.body;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        {
          $set: {
            starterDeliveryInProgress: false,
            starterDeliveryFailedReason: reason,
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('[DELIVERY FAILED] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/level-caps/version - Get level caps config version
  app.get('/api/level-caps/version', async (req, res) => {
    try {
      const db = getDb();
      const config = await db.collection('level_caps').findOne({});

      res.json({
        version: config?.version || 1,
        lastUpdated: config?.lastModified || config?.updatedAt || new Date(),
      });
    } catch (error) {
      console.error('[LEVEL CAPS VERSION] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/level-caps/effective - Get effective caps for player
  app.get('/api/level-caps/effective', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const config = await db.collection('level_caps').findOne({});

      // Default caps if no config
      if (!config) {
        return res.json({
          success: true,
          captureCap: 100,
          ownershipCap: 100,
          appliedRules: [],
          calculatedAt: new Date(),
        });
      }

      // For now, return global defaults
      // TODO: Implement full formula evaluation
      res.json({
        success: true,
        captureCap: config.globalConfig?.defaultCaptureCap || 100,
        ownershipCap: config.globalConfig?.defaultOwnershipCap || 100,
        appliedRules: [],
        calculatedAt: new Date(),
      });
    } catch (error) {
      console.error('[LEVEL CAPS EFFECTIVE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/level-caps/config - Update level caps config (admin)
  app.put('/api/level-caps/config', async (req, res) => {
    try {
      const db = getDb();
      const existing = await db.collection('level_caps').findOne({});
      const newVersion = (existing?.version || 0) + 1;

      await db.collection('level_caps').updateOne(
        {},
        {
          $set: {
            ...req.body,
            version: newVersion,
            lastModified: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      const updated = await db.collection('level_caps').findOne({});
      console.log(`[LEVEL CAPS] Config updated to version ${newVersion}`);
      res.json(updated);
    } catch (error) {
      console.error('[LEVEL CAPS CONFIG] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
