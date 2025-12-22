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

// Default Pokéballs for the shop - Using exact Cobblemon item IDs
function getDefaultPokeballs() {
  return [
    // Standard Balls
    {
      id: 'poke_ball',
      cobblemonId: 'poke_ball',
      name: 'Poké Ball',
      description: 'La Pokéball estándar. Tasa de captura básica.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      type: 'standard',
      basePrice: 200,
      currentPrice: 200,
      currentStock: 100,
      maxStock: 100,
      catchRate: 1.0,
    },
    {
      id: 'great_ball',
      cobblemonId: 'great_ball',
      name: 'Great Ball',
      description: 'Mejor que una Poké Ball normal. 1.5x tasa de captura.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png',
      type: 'standard',
      basePrice: 600,
      currentPrice: 600,
      currentStock: 50,
      maxStock: 50,
      catchRate: 1.5,
    },
    {
      id: 'ultra_ball',
      cobblemonId: 'ultra_ball',
      name: 'Ultra Ball',
      description: 'Una de las mejores Pokéballs. 2x tasa de captura.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png',
      type: 'standard',
      basePrice: 1200,
      currentPrice: 1200,
      currentStock: 30,
      maxStock: 30,
      catchRate: 2.0,
    },
    {
      id: 'master_ball',
      cobblemonId: 'master_ball',
      name: 'Master Ball',
      description: '¡Captura garantizada! Extremadamente rara.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
      type: 'special',
      basePrice: 50000,
      currentPrice: 50000,
      currentStock: 1,
      maxStock: 1,
      catchRate: 255.0,
    },
    // Special Balls
    {
      id: 'premier_ball',
      cobblemonId: 'premier_ball',
      name: 'Premier Ball',
      description: 'Una Pokéball conmemorativa. Igual que una Poké Ball.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png',
      type: 'special',
      basePrice: 200,
      currentPrice: 200,
      currentStock: 20,
      maxStock: 20,
      catchRate: 1.0,
    },
    {
      id: 'luxury_ball',
      cobblemonId: 'luxury_ball',
      name: 'Luxury Ball',
      description: 'El Pokémon capturado se vuelve más amigable.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/luxury-ball.png',
      type: 'special',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.0,
    },
    // Situational Balls
    {
      id: 'net_ball',
      cobblemonId: 'net_ball',
      name: 'Net Ball',
      description: 'Efectiva contra Pokémon de tipo Agua y Bicho. 3.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.5,
    },
    {
      id: 'dive_ball',
      cobblemonId: 'dive_ball',
      name: 'Dive Ball',
      description: 'Efectiva bajo el agua. 3.5x en agua.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dive-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.5,
    },
    {
      id: 'nest_ball',
      cobblemonId: 'nest_ball',
      name: 'Nest Ball',
      description: 'Más efectiva contra Pokémon de bajo nivel.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nest-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 4.0,
    },
    {
      id: 'repeat_ball',
      cobblemonId: 'repeat_ball',
      name: 'Repeat Ball',
      description: 'Efectiva contra Pokémon ya capturados. 3.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/repeat-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 3.5,
    },
    {
      id: 'timer_ball',
      cobblemonId: 'timer_ball',
      name: 'Timer Ball',
      description: 'Más efectiva cuanto más dure el combate. Hasta 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 4.0,
    },
    {
      id: 'quick_ball',
      cobblemonId: 'quick_ball',
      name: 'Quick Ball',
      description: 'Muy efectiva al inicio del combate. 5x primer turno.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/quick-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 20,
      maxStock: 20,
      catchRate: 5.0,
    },
    {
      id: 'dusk_ball',
      cobblemonId: 'dusk_ball',
      name: 'Dusk Ball',
      description: 'Efectiva de noche o en cuevas. 3x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png',
      type: 'situational',
      basePrice: 1000,
      currentPrice: 1000,
      currentStock: 25,
      maxStock: 25,
      catchRate: 3.0,
    },
    {
      id: 'heal_ball',
      cobblemonId: 'heal_ball',
      name: 'Heal Ball',
      description: 'Cura al Pokémon capturado completamente.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png',
      type: 'special',
      basePrice: 300,
      currentPrice: 300,
      currentStock: 30,
      maxStock: 30,
      catchRate: 1.0,
    },
    // Apricorn Balls (raras)
    {
      id: 'level_ball',
      cobblemonId: 'level_ball',
      name: 'Level Ball',
      description: 'Más efectiva si tu Pokémon es de mayor nivel.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/level-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 8.0,
    },
    {
      id: 'lure_ball',
      cobblemonId: 'lure_ball',
      name: 'Lure Ball',
      description: 'Efectiva contra Pokémon pescados. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/lure-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'moon_ball',
      cobblemonId: 'moon_ball',
      name: 'Moon Ball',
      description: 'Efectiva contra Pokémon que evolucionan con Piedra Lunar. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'friend_ball',
      cobblemonId: 'friend_ball',
      name: 'Friend Ball',
      description: 'El Pokémon capturado empieza con alta amistad.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/friend-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 1.0,
    },
    {
      id: 'love_ball',
      cobblemonId: 'love_ball',
      name: 'Love Ball',
      description: 'Efectiva contra Pokémon del sexo opuesto. 8x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/love-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 8.0,
    },
    {
      id: 'heavy_ball',
      cobblemonId: 'heavy_ball',
      name: 'Heavy Ball',
      description: 'Efectiva contra Pokémon pesados.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heavy-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'fast_ball',
      cobblemonId: 'fast_ball',
      name: 'Fast Ball',
      description: 'Efectiva contra Pokémon rápidos (velocidad >100). 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fast-ball.png',
      type: 'apricorn',
      basePrice: 2000,
      currentPrice: 2000,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    // Safari/Sport/Dream
    {
      id: 'safari_ball',
      cobblemonId: 'safari_ball',
      name: 'Safari Ball',
      description: 'Ball especial de la Zona Safari. 1.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/safari-ball.png',
      type: 'special',
      basePrice: 1500,
      currentPrice: 1500,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.5,
    },
    {
      id: 'sport_ball',
      cobblemonId: 'sport_ball',
      name: 'Sport Ball',
      description: 'Ball especial del Bug-Catching Contest. 1.5x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sport-ball.png',
      type: 'special',
      basePrice: 1500,
      currentPrice: 1500,
      currentStock: 15,
      maxStock: 15,
      catchRate: 1.5,
    },
    {
      id: 'dream_ball',
      cobblemonId: 'dream_ball',
      name: 'Dream Ball',
      description: 'Efectiva contra Pokémon dormidos. 4x',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dream-ball.png',
      type: 'special',
      basePrice: 2500,
      currentPrice: 2500,
      currentStock: 10,
      maxStock: 10,
      catchRate: 4.0,
    },
    {
      id: 'beast_ball',
      cobblemonId: 'beast_ball',
      name: 'Beast Ball',
      description: 'Diseñada para Ultra Bestias. 5x contra ellas, 0.1x contra otros.',
      sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/beast-ball.png',
      type: 'special',
      basePrice: 5000,
      currentPrice: 5000,
      currentStock: 5,
      maxStock: 5,
      catchRate: 5.0,
    },
  ];
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

  // API server status (for frontend)
  app.get('/api/server-status', (req, res) => {
    res.json({ 
      success: true,
      status: 'online', 
      timestamp: new Date().toISOString(), 
      uptime: process.uptime(),
      message: 'Backend API is running'
    });
  });

  // ============================================
  // PLUGIN ENDPOINTS - CRITICAL
  // ============================================

  // POST /api/players/sync - Sync player data from plugin
  app.post('/api/players/sync', async (req, res) => {
    try {
      const { uuid, username, online, party, pcStorage, cobbleDollars, cobbleDollarsBalance, badges, playtime, x, y, z, world } = req.body;
      if (!uuid || !username) {
        return res.status(400).json({ error: 'uuid and username required' });
      }

      const db = getDb();
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      
      // Use cobbleDollarsBalance if cobbleDollars not provided (plugin sends cobbleDollarsBalance)
      const balance = cobbleDollars !== undefined ? cobbleDollars : cobbleDollarsBalance;

      if (!user) {
        // Create new user
        await db.collection('users').insertOne({
          minecraftUuid: uuid,
          minecraftUsername: username,
          online: online || false,
          party: party || [],
          pcStorage: pcStorage || [],
          cobbleDollars: balance || 0,
          badges: badges || 0,
          playtime: playtime || 0,
          x: x,
          y: y,
          z: z,
          world: world || 'overworld',
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return res.json({ success: true, verified: false, banned: false });
      }

      // Update existing user
      const updateData = {
        minecraftUsername: username,
        online: online || false,
        updatedAt: new Date(),
      };
      
      // Only update these if provided
      if (party !== undefined) updateData.party = party;
      if (pcStorage !== undefined) updateData.pcStorage = pcStorage;
      if (balance !== undefined) updateData.cobbleDollars = balance;
      if (badges !== undefined) updateData.badges = badges;
      if (playtime !== undefined) updateData.playtime = playtime;
      if (x !== undefined) updateData.x = x;
      if (y !== undefined) updateData.y = y;
      if (z !== undefined) updateData.z = z;
      if (world !== undefined) updateData.world = world;

      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: updateData }
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
      const users = await getDb().collection('users').find({}).toArray();
      
      // Transformar a formato esperado por el frontend
      const players = users.map(user => ({
        uuid: user.minecraftUuid || user._id.toString(),
        username: user.minecraftUsername || user.discordUsername || 'Unknown',
        totalPokemon: (user.party?.length || 0) + (user.pcStorage?.length || 0),
        shinies: [...(user.party || []), ...(user.pcStorage || [])].filter(p => p?.shiny).length,
        starter: user.starterId ? {
          id: user.starterId,
          name: user.starterName || `Pokemon #${user.starterId}`,
          isShiny: user.starterIsShiny || false,
        } : null,
        partyPreview: (user.party || []).slice(0, 6).map(p => ({
          species: p?.species || 'Unknown',
          speciesId: p?.speciesId || 1,
          level: p?.level || 1,
          shiny: p?.shiny || false,
        })),
        cobbleDollars: user.cobbleDollars || 0,
        badges: user.badges || 0,
        playtime: user.playtime || 0,
        online: user.online || false,
        verified: user.verified || false,
        // Coordenadas para el mapa
        x: user.x,
        y: user.y,
        z: user.z,
        world: user.world || 'overworld',
      }));
      
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

  // GET /api/shop/stock - Get shop stock (Pokéballs)
  app.get('/api/shop/stock', async (req, res) => {
    try {
      const db = getDb();
      let items = await db.collection('shop_items').find({}).toArray();
      
      // Si no hay items, crear los defaults
      if (items.length === 0) {
        const defaultBalls = getDefaultPokeballs();
        await db.collection('shop_items').insertMany(defaultBalls);
        items = defaultBalls;
      }
      
      // Transformar al formato esperado por el frontend
      const balls = items.map(item => ({
        id: item.id || item.ballId,
        name: item.name,
        description: item.description,
        sprite: item.sprite,
        spriteOpen: item.spriteOpen,
        type: item.type || 'standard',
        basePrice: item.basePrice,
        currentPrice: item.currentPrice || item.basePrice,
        currentStock: item.currentStock,
        maxStock: item.maxStock,
        catchRate: item.catchRate,
        cobblemonId: item.cobblemonId, // ID exacto para Cobblemon
      }));
      
      res.json({ balls });
    } catch (error) {
      console.error('[SHOP STOCK] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/shop/purchase - Purchase pokeballs
  app.post('/api/shop/purchase', async (req, res) => {
    try {
      const { uuid, itemId, quantity } = req.body;
      if (!uuid || !itemId || !quantity) {
        return res.status(400).json({ error: 'uuid, itemId and quantity required' });
      }

      if (quantity < 1 || quantity > 999) {
        return res.status(400).json({ error: 'Invalid quantity (1-999)' });
      }

      const db = getDb();
      
      // Buscar usuario por minecraftUuid
      const user = await db.collection('users').findOne({ minecraftUuid: uuid });
      if (!user) {
        return res.status(404).json({ error: 'User not found. You need to be verified.' });
      }

      // Buscar el item
      const item = await db.collection('shop_items').findOne({ 
        $or: [{ id: itemId }, { ballId: itemId }] 
      });
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Verificar stock
      if (item.currentStock < quantity) {
        return res.status(400).json({ error: `Not enough stock. Available: ${item.currentStock}` });
      }

      // Calcular precio total
      const totalPrice = (item.currentPrice || item.basePrice) * quantity;

      // Verificar balance
      const userBalance = user.cobbleDollars || 0;
      if (userBalance < totalPrice) {
        return res.status(400).json({ 
          error: `Insufficient balance. Need: ${totalPrice}, Have: ${userBalance}` 
        });
      }

      // Realizar la compra (transacción)
      const newBalance = userBalance - totalPrice;
      const newStock = item.currentStock - quantity;

      // Actualizar balance del usuario
      await db.collection('users').updateOne(
        { minecraftUuid: uuid },
        { $set: { cobbleDollars: newBalance, updatedAt: new Date() } }
      );

      // Actualizar stock del item
      await db.collection('shop_items').updateOne(
        { $or: [{ id: itemId }, { ballId: itemId }] },
        { $set: { currentStock: newStock, updatedAt: new Date() } }
      );

      // Crear registro de compra pendiente (para que el plugin lo entregue)
      const purchase = {
        minecraftUuid: uuid,
        minecraftUsername: user.minecraftUsername,
        discordId: user.discordId,
        ballId: item.cobblemonId || item.id || itemId, // ID exacto de Cobblemon
        ballName: item.name,
        quantity: quantity,
        pricePerUnit: item.currentPrice || item.basePrice,
        totalPrice: totalPrice,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.collection('shop_purchases').insertOne(purchase);

      console.log(`[SHOP] Purchase: ${user.minecraftUsername} bought ${quantity}x ${item.name} for ${totalPrice} CobbleDollars`);

      res.json({
        success: true,
        message: `¡Compra exitosa! Usa /claim en el juego para recibir tus ${quantity}x ${item.name}`,
        newBalance: newBalance,
        purchase: {
          itemName: item.name,
          quantity: quantity,
          totalPrice: totalPrice,
        }
      });
    } catch (error) {
      console.error('[SHOP PURCHASE] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/shop/balance - Get player balance
  app.get('/api/shop/balance', async (req, res) => {
    try {
      const { discordId, uuid } = req.query;
      if (!discordId && !uuid) {
        return res.status(400).json({ error: 'discordId or uuid required' });
      }

      const db = getDb();
      // Buscar por discordId o minecraftUuid
      const query = discordId ? { discordId } : { minecraftUuid: uuid };
      const user = await db.collection('users').findOne(query);

      res.json({
        success: true,
        balance: user?.cobbleDollars || 0,
        discordId: user?.discordId,
        minecraftUuid: user?.minecraftUuid,
      });
    } catch (error) {
      console.error('[SHOP BALANCE] Error:', error);
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
      
      // Contar starters disponibles y totales
      const totalCount = await db.collection('starters').countDocuments({});
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
        totalCount: totalCount || 27, // Default to 27 if no starters in DB
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
