/**
 * Punto de Entrada del Servidor
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este archivo inicia el servidor Express y maneja
 * la conexión a la base de datos.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { MongoClient } = require('mongodb');

// Environment variables
const PORT = process.env.PORT || 25617;
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI environment variable is required!');
  console.error('📝 Please set MONGODB_URI in your environment or .env file');
  console.error('Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database');
  process.exit(1);
}

// MongoDB client
let db = null;
let client = null;

/**
 * Conectar a MongoDB
 */
async function connectToDatabase() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('✅ Conectado a MongoDB exitosamente');
    return db;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

/**
 * Cerrar conexión a MongoDB
 */
async function closeDatabase() {
  if (client) {
    await client.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

/**
 * Obtener instancia de la base de datos
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
}

/**
 * Crear aplicación Express
 */
function createApp() {
  const app = express();

  // Middleware de seguridad
  app.use(helmet());

  const allowedOrigins = [
    FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'https://cobblemon-los-pitufos-3m5qcj9kq-zekkjjs-projects.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      if (isDevelopment && origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      
      console.error('❌ CORS - Origin not allowed:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Cobblemon Los Pitufos API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        serverStatus: '/server-status',
        api: '/api/*',
      },
      externalUrl: 'https://api.playadoradarp.xyz/port/25617',
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: PORT,
      environment: NODE_ENV,
    });
  });

  // Server status endpoint
  app.get('/server-status', (req, res) => {
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: PORT,
    });
  });

  // API Routes
  app.get('/api/starters', async (req, res, next) => {
    try {
      const starters = await getDb().collection('starters').find({}).toArray();
      res.json({ starters });
    } catch (error) {
      console.error('Error fetching starters:', error);
      next(error);
    }
  });

  app.get('/api/players', async (req, res, next) => {
    try {
      const players = await getDb().collection('players').find({}).toArray();
      res.json({ players });
    } catch (error) {
      console.error('Error fetching players:', error);
      next(error);
    }
  });

  app.get('/api/tournaments', async (req, res, next) => {
    try {
      const tournaments = await getDb().collection('tournaments').find({}).toArray();
      tournaments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      res.json({ tournaments });
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      next(error);
    }
  });

  app.get('/api/shop/stock', async (req, res, next) => {
    try {
      const stock = await getDb().collection('shop_items').find({}).toArray();
      res.json({ stock });
    } catch (error) {
      console.error('Error fetching shop stock:', error);
      next(error);
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal Server Error',
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Endpoint not found',
        path: req.path,
      },
    });
  });

  return app;
}

/**
 * Inicia el servidor
 */
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log(`📦 Entorno: ${NODE_ENV}`);

    // Conectar a la base de datos
    await connectToDatabase();

    // Crear aplicación Express
    const app = createApp();

    // Iniciar servidor HTTP
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor escuchando en puerto ${PORT}`);
      console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
      console.log(`🔗 Frontend: ${FRONTEND_URL}`);
      
      console.log(`\n📋 Endpoints internos:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /server-status`);
      console.log(`   GET  /api/starters`);
      console.log(`   GET  /api/players`);
      console.log(`   GET  /api/tournaments`);
      console.log(`   GET  /api/shop/stock`);
      console.log(`\n🌐 URLs externas (via proxy):`);
      console.log(`   https://api.playadoradarp.xyz/port/25617/health`);
      console.log(`   https://api.playadoradarp.xyz/port/25617/api/starters\n`);
    });

    // Manejo de señales de terminación
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  Señal ${signal} recibida, cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await closeDatabase();
          console.log('✅ Cierre exitoso');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante el cierre:', error);
          process.exit(1);
        }
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('⚠️  Forzando cierre después de timeout');
        process.exit(1);
      }, 10000);
    };

    // Escuchar señales de terminación
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection en:', promise);
      console.error('❌ Razón:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();

// Export para testing
module.exports = { createApp, connectToDatabase, closeDatabase, getDb };
