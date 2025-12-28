/**
 * Script de Migración - Crear Índices de Base de Datos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Crea índices en MongoDB para mejorar el rendimiento de las consultas
 */

import { connectToDatabase, getUsersCollection } from '../config/database.js';
import { MongoClient, Db } from 'mongodb';
import { env } from '../config/env.js';

async function createIndexes() {
  console.log('🔧 Iniciando creación de índices...\n');

  let connection: { client: MongoClient; db: Db } | null = null;

  try {
    // Conectar a la base de datos
    connection = await connectToDatabase();
    const db = connection.db;

    // ============================================
    // ÍNDICES PARA COLECCIÓN: users (players)
    // ============================================
    console.log('📊 Creando índices para colección "users"...');
    
    const usersCollection = await getUsersCollection();

    // Índice único para minecraftUUID
    await usersCollection.createIndex(
      { minecraftUuid: 1 },
      { unique: true, sparse: true, name: 'idx_minecraft_uuid' }
    );
    console.log('  ✓ Índice creado: minecraftUuid (único)');

    // Índice único para discordId
    await usersCollection.createIndex(
      { discordId: 1 },
      { unique: true, sparse: true, name: 'idx_discord_id' }
    );
    console.log('  ✓ Índice creado: discordId (único)');

    // Índice para lastHeartbeat (para cleanup de jugadores desconectados)
    await usersCollection.createIndex(
      { lastHeartbeat: 1 },
      { sparse: true, name: 'idx_last_heartbeat' }
    );
    console.log('  ✓ Índice creado: lastHeartbeat');

    // Índice para banned (para consultas de ban status)
    await usersCollection.createIndex(
      { banned: 1 },
      { name: 'idx_banned' }
    );
    console.log('  ✓ Índice creado: banned');

    // ============================================
    // ÍNDICES PARA COLECCIÓN: shop_transactions
    // ============================================
    console.log('\n📊 Creando índices para colección "shop_transactions"...');
    
    const shopTransactionsCollection = db.collection('shop_transactions');

    // Índice compuesto para playerId + timestamp (para historial de compras)
    await shopTransactionsCollection.createIndex(
      { playerId: 1, timestamp: -1 },
      { name: 'idx_player_timestamp' }
    );
    console.log('  ✓ Índice creado: playerId + timestamp');

    // Índice para status (para consultas de transacciones pendientes/fallidas)
    await shopTransactionsCollection.createIndex(
      { status: 1 },
      { name: 'idx_status' }
    );
    console.log('  ✓ Índice creado: status');

    // Índice para deliveryAttempts (para retry logic)
    await shopTransactionsCollection.createIndex(
      { deliveryAttempts: 1 },
      { sparse: true, name: 'idx_delivery_attempts' }
    );
    console.log('  ✓ Índice creado: deliveryAttempts');

    // ============================================
    // ÍNDICES PARA COLECCIÓN: level_caps
    // ============================================
    console.log('\n📊 Creando índices para colección "level_caps"...');
    
    const levelCapsCollection = db.collection('level_caps');

    // Índice para version (para cache invalidation)
    await levelCapsCollection.createIndex(
      { version: 1 },
      { name: 'idx_version' }
    );
    console.log('  ✓ Índice creado: version');

    // Índice para lastModified (para consultas de cambios recientes)
    await levelCapsCollection.createIndex(
      { lastModified: -1 },
      { sparse: true, name: 'idx_last_modified' }
    );
    console.log('  ✓ Índice creado: lastModified');

    // ============================================
    // ÍNDICES PARA COLECCIÓN: event_log (si existe)
    // ============================================
    console.log('\n📊 Creando índices para colección "event_log"...');
    
    const eventLogCollection = db.collection('event_log');

    // Índice compuesto para timestamp + eventType (para consultas de eventos)
    await eventLogCollection.createIndex(
      { timestamp: -1, eventType: 1 },
      { name: 'idx_timestamp_event_type' }
    );
    console.log('  ✓ Índice creado: timestamp + eventType');

    // Índice para playerId (para consultas de eventos por jugador)
    await eventLogCollection.createIndex(
      { playerId: 1 },
      { sparse: true, name: 'idx_player_id' }
    );
    console.log('  ✓ Índice creado: playerId');

    // ============================================
    // ÍNDICES PARA COLECCIÓN: audit_log (si existe)
    // ============================================
    console.log('\n📊 Creando índices para colección "audit_log"...');
    
    const auditLogCollection = db.collection('audit_log');

    // Índice compuesto para timestamp + adminId (para consultas de auditoría)
    await auditLogCollection.createIndex(
      { timestamp: -1, adminId: 1 },
      { name: 'idx_timestamp_admin_id' }
    );
    console.log('  ✓ Índice creado: timestamp + adminId');

    // Índice para action (para consultas por tipo de acción)
    await auditLogCollection.createIndex(
      { action: 1 },
      { name: 'idx_action' }
    );
    console.log('  ✓ Índice creado: action');

    // ============================================
    // VERIFICAR ÍNDICES CREADOS
    // ============================================
    console.log('\n📋 Verificando índices creados...\n');

    const collections = [
      { name: 'users', collection: usersCollection },
      { name: 'shop_transactions', collection: shopTransactionsCollection },
      { name: 'level_caps', collection: levelCapsCollection },
      { name: 'event_log', collection: eventLogCollection },
      { name: 'audit_log', collection: auditLogCollection },
    ];

    for (const { name, collection } of collections) {
      const indexes = await collection.indexes();
      console.log(`📊 Índices en "${name}":`);
      for (const index of indexes) {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      }
      console.log('');
    }

    console.log('✅ Todos los índices creados exitosamente!\n');
  } catch (error) {
    console.error('❌ Error creando índices:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.client.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar script
createIndexes()
  .then(() => {
    console.log('\n✨ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
