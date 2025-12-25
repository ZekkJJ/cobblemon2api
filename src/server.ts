/**
 * Punto de Entrada del Servidor
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este archivo inicia el servidor Express y maneja
 * la conexión a la base de datos.
 */

import { createApp } from './app.js';
import { connectToDatabase, closeDatabase, getMongoClient } from './config/database.js';
import { env, isDevelopment } from './config/env.js';
import { initializeWebSocket, getWebSocketService } from './modules/tournaments/index.js';
import { PlayerShopService } from './modules/player-shop/player-shop.service.js';
import { TransactionManager } from './shared/utils/transaction-manager.js';
import { Listing, Bid, PendingDelivery } from './shared/types/player-shop.types.js';

// Auction processor interval (every 60 seconds)
let auctionProcessorInterval: NodeJS.Timeout | null = null;

/**
 * Inicia el servidor
 */
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log(`📦 Entorno: ${env.NODE_ENV}`);

    // Conectar a la base de datos
    await connectToDatabase();

    // Crear aplicación Express (ahora es asíncrona)
    const app = await createApp();

    // Iniciar servidor HTTP
    const server = app.listen(env.PORT, () => {
      console.log(`✅ Servidor escuchando en puerto ${env.PORT}`);
      console.log(`🌐 URL: http://localhost:${env.PORT}`);
      console.log(`🔗 Frontend: ${env.FRONTEND_URL}`);
      
      if (isDevelopment) {
        console.log(`\n📋 Endpoints disponibles:`);
        console.log(`   GET  /health`);
        console.log(`   GET  /api/auth/discord`);
        console.log(`   POST /api/gacha/roll`);
        console.log(`   GET  /api/starters`);
        console.log(`   POST /api/players/sync`);
        console.log(`   GET  /api/shop/stock`);
        console.log(`   GET  /api/tournaments`);
        console.log(`   GET  /api/level-caps/effective`);
        console.log(`   WS   /ws (WebSocket para torneos)`);
        console.log(`   ... y más\n`);
      }
    });

    // Inicializar WebSocket para torneos
    const corsOrigins = [
      env.FRONTEND_URL,
      'https://cobblemon-los-pitufos.vercel.app',
      'http://localhost:3000',
    ].filter(Boolean) as string[];
    
    initializeWebSocket(server, corsOrigins);
    console.log('🔌 WebSocket inicializado para torneos');

    // Inicializar procesador de subastas expiradas
    const mongoClient = await getMongoClient();
    const db = mongoClient.db();
    const transactionManager = new TransactionManager(mongoClient);
    const playerShopService = new PlayerShopService(
      db.collection('users'),
      db.collection<Listing>('player_shop_listings'),
      db.collection<Bid>('player_shop_bids'),
      db.collection<PendingDelivery>('player_shop_deliveries'),
      transactionManager
    );

    // Process expired auctions every 60 seconds
    auctionProcessorInterval = setInterval(async () => {
      try {
        await playerShopService.processExpiredAuctions();
      } catch (error) {
        console.error('Error processing expired auctions:', error);
      }
    }, 60000);
    console.log('⏰ Procesador de subastas expiradas iniciado (cada 60s)');

    // Manejo de señales de terminación
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  Señal ${signal} recibida, cerrando servidor...`);
      
      // Detener procesador de subastas
      if (auctionProcessorInterval) {
        clearInterval(auctionProcessorInterval);
        console.log('⏰ Procesador de subastas detenido');
      }
      
      // Cerrar WebSocket
      const wsService = getWebSocketService();
      wsService.close();
      console.log('🔌 WebSocket cerrado');
      
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
