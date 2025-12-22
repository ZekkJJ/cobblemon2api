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

  // GET /api/shop/purchases - Get pending purchases for player
  app.get('/api/shop/purchases', async (req, res) => {
    try {
      const uuid = req.query.uuid;
      if (!uuid) {
        return res.status(400).json({ error: 'uuid required' });
      }

      const db = getDb();
      const purchases = await db.collection('shop_purchases')
        .find({ minecraftUuid: uuid, status: 'pending' })
        .toArray();

      res.json({ success: true, purchases });
    } catch (error) {
      console.error('[SHOP PURCHASES] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/shop/claim - Claim a purchase
  app.post('/api/shop/claim', async (req, res) => {
    try {
      const { uuid, purchaseId } = req.body;
      if (!uuid || !purchaseId) {
        return res.status(400).json({ error: 'uuid and purchaseId required' });
      }

      const db = getDb();
      const result = await db.collection('shop_purchases').updateOne(
        { _id: new require('mongodb').ObjectId(purchaseId), minecraftUuid: uuid, status: 'pending' },
        { $set: { status: 'claimed', claimedAt: new Date() } }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: 'Purchase not found or already claimed' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[SHOP CLAIM] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================
  // WEB ENDPOINTS
  // ============================================

  // GET /api/verify/check - Check verification code status (web polling)
  app.get('/api/verify/check', async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) {
        return res.status(400).json({ error: 'code required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ verificationCode: code });

      if (!user) {
        return res.json({ valid: false, message: 'Code not found' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ valid: false, message: 'Code expired' });
      }

      res.json({
        valid: true,
        minecraftUsername: user.minecraftUsername,
        verified: user.verified || false,
      });
    } catch (error) {
      console.error('[VERIFY CHECK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/verify/check - Verify code from web and link Discord
  app.post('/api/verify/check', async (req, res) => {
    try {
      const { code, discordId, discordUsername } = req.body;
      if (!code || !discordId) {
        return res.status(400).json({ error: 'code and discordId required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ verificationCode: code });

      if (!user) {
        return res.json({ success: false, message: 'Code not found' });
      }

      if (new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.json({ success: false, message: 'Code expired' });
      }

      // Link Discord account
      await db.collection('users').updateOne(
        { verificationCode: code },
        {
          $set: {
            discordId,
            discordUsername: discordUsername || discordId,
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

      res.json({
        success: true,
        message: 'Account linked successfully',
        minecraftUsername: user.minecraftUsername,
      });
    } catch (error) {
      console.error('[VERIFY CHECK POST] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/starters - Get all starters
  app.get('/api/starters', async (req, res) => {
    try {
      const starters = await getDb().collection('starters').find({}).toArray();
      res.json({ starters });
    } catch (error) {
      console.error('[STARTERS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/players - Get all players
  app.get('/api/players', async (req, res) => {
    try {
      const players = await getDb().collection('users').find({}).toArray();
      res.json({ players });
    } catch (error) {
      console.error('[PLAYERS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/players/:uuid - Get player profile
  app.get('/api/players/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });

      if (!user) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json({ success: true, profile: user });
    } catch (error) {
      console.error('[PLAYER PROFILE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/tournaments - Get all tournaments
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await getDb().collection('tournaments').find({}).toArray();
      tournaments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      res.json({ tournaments });
    } catch (error) {
      console.error('[TOURNAMENTS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/stock - Get shop stock
  app.get('/api/shop/stock', async (req, res) => {
    try {
      const stock = await getDb().collection('shop_items').find({}).toArray();
      res.json({ stock });
    } catch (error) {
      console.error('[SHOP STOCK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/gacha/roll - Check roll status
  app.get('/api/gacha/roll', async (req, res) => {
    try {
      const discordId = req.query.discordId;
      if (!discordId) {
        return res.status(400).json({ error: 'discordId required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ discordId });
      const hasRolled = user && user.starterClaimed === true;
      const availableCount = await db.collection('starters').countDocuments({ isClaimed: false });

      let starter = null;
      if (hasRolled && user.starterId) {
        starter = await db.collection('starters').findOne({ pokemonId: user.starterId });
      }

      res.json({
        canRoll: !hasRolled && availableCount > 0,
        hasRolled,
        starter,
        isShiny: user?.starterIsShiny || false,
        availableCount,
      });
    } catch (error) {
      console.error('[GACHA ROLL STATUS] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/roll - Perform classic roll
  app.post('/api/gacha/roll', async (req, res) => {
    try {
      const { discordId, discordUsername } = req.body;
      if (!discordId) {
        return res.status(400).json({ error: 'discordId required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ discordId });
      if (user && user.starterClaimed) {
        return res.status(400).json({ error: 'Already claimed a starter' });
      }

      const availableStarters = await db.collection('starters').find({ isClaimed: false }).toArray();
      if (availableStarters.length === 0) {
        return res.status(400).json({ error: 'No starters available' });
      }

      const starter = availableStarters[Math.floor(Math.random() * availableStarters.length)];
      const isShiny = Math.random() < (1 / 4096);

      await db.collection('starters').updateOne(
        { _id: starter._id },
        { $set: { isClaimed: true, claimedBy: discordId, claimedByNickname: discordUsername, claimedAt: new Date(), isShiny } }
      );

      await db.collection('users').updateOne(
        { discordId },
        { $set: { starterClaimed: true, starterId: starter.pokemonId, starterIsShiny: isShiny, starterClaimedAt: new Date() } },
        { upsert: true }
      );

      res.json({ starter, isShiny });
    } catch (error) {
      console.error('[GACHA ROLL] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/gacha/soul-driven - Soul driven roll
  app.post('/api/gacha/soul-driven', async (req, res) => {
    try {
      const { discordId, discordUsername, answers } = req.body;
      if (!discordId || !answers) {
        return res.status(400).json({ error: 'discordId and answers required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ discordId });
      if (user && user.starterClaimed) {
        return res.status(400).json({ error: 'Already claimed a starter' });
      }

      // For now, just do a random roll (TODO: implement soul-driven logic)
      const availableStarters = await db.collection('starters').find({ isClaimed: false }).toArray();
      if (availableStarters.length === 0) {
        return res.status(400).json({ error: 'No starters available' });
      }

      const starter = availableStarters[Math.floor(Math.random() * availableStarters.length)];
      const isShiny = Math.random() < (1 / 4096);

      await db.collection('starters').updateOne(
        { _id: starter._id },
        { $set: { isClaimed: true, claimedBy: discordId, claimedByNickname: discordUsername, claimedAt: new Date(), isShiny } }
      );

      await db.collection('users').updateOne(
        { discordId },
        { $set: { starterClaimed: true, starterId: starter.pokemonId, starterIsShiny: isShiny, starterClaimedAt: new Date(), soulDrivenAnswers: answers } },
        { upsert: true }
      );

      res.json({ starter, isShiny });
    } catch (error) {
      console.error('[SOUL DRIVEN] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Discord Auth
  app.get('/api/auth/discord', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || `https://api.playadoradarp.xyz/port/25617/api/auth/discord/callback`;
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
    res.redirect(discordAuthUrl);
  });

  app.get('/api/auth/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}?auth=error`);

    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI || `https://api.playadoradarp.xyz/port/25617/api/auth/discord/callback`,
        }),
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) return res.redirect(`${FRONTEND_URL}?auth=error`);

      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userData = await userResponse.json();

      await getDb().collection('users').updateOne(
        { discordId: userData.id },
        {
          $set: {
            discordId: userData.id,
            discordUsername: userData.global_name || userData.username,
            avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
            email: userData.email,
            lastLogin: new Date(),
          },
        },
        { upsert: true }
      );

      const userForFrontend = {
        discordId: userData.id,
        discordUsername: userData.global_name || userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
      };

      res.redirect(`${FRONTEND_URL}/auth/callback?user=${encodeURIComponent(JSON.stringify(userForFrontend))}`);
    } catch (error) {
      console.error('Discord auth error:', error);
      res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Error al autenticar')}`);
    }
  });

  // Admin endpoints
  app.post('/api/admin/ban', async (req, res) => {
    try {
      const { uuid, banReason, ban } = req.body;
      const db = getDb();

      if (ban) {
        await db.collection('users').updateOne(
          { minecraftUuid: uuid },
          { $set: { banned: true, banReason, bannedAt: new Date() } }
        );
      } else {
        await db.collection('users').updateOne(
          { minecraftUuid: uuid },
          { $set: { banned: false }, $unset: { banReason: '', bannedAt: '' } }
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[ADMIN BAN] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: { message: 'Endpoint not found', path: req.path } });
  });

  return app;
}

async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    await connectToDatabase();
    const app = createApp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor en puerto ${PORT}`);
      console.log(`\n📋 Endpoints del plugin:`);
      console.log(`   POST /api/players/sync`);
      console.log(`   GET  /api/admin/ban-status`);
      console.log(`   POST /api/verification/generate`);
      console.log(`   POST /api/verification/verify`);
      console.log(`   GET  /api/gacha/delivery/status`);
      console.log(`   POST /api/gacha/delivery/start`);
      console.log(`   POST /api/gacha/delivery/success`);
      console.log(`   POST /api/gacha/delivery/failed`);
      console.log(`   GET  /api/level-caps/version`);
      console.log(`   GET  /api/level-caps/effective`);
      console.log(`   GET  /api/shop/purchases`);
      console.log(`   POST /api/shop/claim\n`);
    });

    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

startServer();
module.exports = { createApp, connectToDatabase };
