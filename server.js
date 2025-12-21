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
const PORT = 25573;
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

  // CORS - Allow all origins for now
  app.use(cors({
    origin: '*',
    credentials: true,
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
      proxy: {
        url: 'https://api.playadoradarp.xyz/port/25573',
      },
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
  app.get('/api/starters', (req, res) => {
    res.json({ message: 'Starters endpoint - implement your logic here' });
  });

  app.get('/api/players', (req, res) => {
    res.json({ message: 'Players endpoint - implement your logic here' });
  });

  app.get('/api/tournaments', (req, res) => {
    res.json({ message: 'Tournaments endpoint - implement your logic here' });
  });

  app.get('/api/shop/stock', (req, res) => {
    res.json({ message: 'Shop stock endpoint - implement your logic here' });
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
    const server = app.listen(PORT, () => {
      console.log(`✅ Servidor escuchando en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔗 Frontend: ${FRONTEND_URL}`);
      
      console.log(`\n📋 Endpoints disponibles:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /server-status`);
      console.log(`   GET  /api/starters`);
      console.log(`   GET  /api/players`);
      console.log(`   GET  /api/tournaments`);
      console.log(`   GET  /api/shop/stock`);
      console.log(`\n🌐 Via proxy: https://api.playadoradarp.xyz/port/25573/api/starters`);
      console.log(`🔗 Direct: http://localhost:${PORT}/health\n`);
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
