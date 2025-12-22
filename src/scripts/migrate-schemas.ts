/**
 * Script de Migración - Actualizar Esquemas de Base de Datos
 * Cobblemon Los Pitufos - Backend API
 * 
 * Agrega campos nuevos a las colecciones existentes
 */

import { connectToDatabase, getUsersCollection } from '../config/database.js';
import { MongoClient } from 'mongodb';

async function migrateSchemas() {
  console.log('🔧 Iniciando migración de esquemas...\n');

  let client: MongoClient | null = null;

  try {
    // Conectar a la base de datos
    const connection = await connectToDatabase();
    client = connection.client;
    const db = connection.db;

    // ============================================
    // MIGRACIÓN: users collection
    // ============================================
    console.log('📊 Migrando colección "users"...');
    
    const usersCollection = await getUsersCollection();

    // Agregar campo lastHeartbeat a todos los usuarios
    const usersResult = await usersCollection.updateMany(
      { lastHeartbeat: { $exists: false } },
      { $set: { lastHeartbeat: new Date() } }
    );
    console.log(`  ✓ Agregado lastHeartbeat a ${usersResult.modifiedCount} usuarios`);

    // Agregar campos de starter delivery
    const starterResult = await usersCollection.updateMany(
      { starterDeliveryInProgress: { $exists: false } },
      {
        $set: {
          starterDeliveryInProgress: false,
          starterDeliveryAttempts: 0,
        },
      }
    );
    console.log(`  ✓ Agregados campos de starter delivery a ${starterResult.modifiedCount} usuarios`);

    // ============================================
    // MIGRACIÓN: level_caps collection
    // ============================================
    console.log('\n📊 Migrando colección "level_caps"...');
    
    const levelCapsCollection = db.collection('level_caps');

    // Agregar campo version a level_caps
    const levelCapsResult = await levelCapsCollection.updateMany(
      { version: { $exists: false } },
      {
        $set: {
          version: 1,
          lastModified: new Date(),
          modifiedBy: 'system',
        },
      }
    );
    console.log(`  ✓ Agregado version a ${levelCapsResult.modifiedCount} configuraciones`);

    // ============================================
    // MIGRACIÓN: shop_transactions collection
    // ============================================
    console.log('\n📊 Migrando colección "shop_transactions"...');
    
    const shopTransactionsCollection = db.collection('shop_transactions');

    // Agregar campos de status y delivery
    const shopResult = await shopTransactionsCollection.updateMany(
      { status: { $exists: false } },
      {
        $set: {
          status: 'completed',
          deliveryAttempts: 0,
        },
      }
    );
    console.log(`  ✓ Agregados campos de status a ${shopResult.modifiedCount} transacciones`);

    // ============================================
    // CREAR COLECCIONES NUEVAS
    // ============================================
    console.log('\n📊 Creando colecciones nuevas...');

    // Crear colección audit_log si no existe
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes('audit_log')) {
      await db.createCollection('audit_log');
      console.log('  ✓ Colección "audit_log" creada');
    } else {
      console.log('  ℹ Colección "audit_log" ya existe');
    }

    if (!collectionNames.includes('event_log')) {
      await db.createCollection('event_log');
      console.log('  ✓ Colección "event_log" creada');
    } else {
      console.log('  ℹ Colección "event_log" ya existe');
    }

    // ============================================
    // VERIFICAR MIGRACIONES
    // ============================================
    console.log('\n📋 Verificando migraciones...\n');

    // Verificar users
    const sampleUser = await usersCollection.findOne({});
    if (sampleUser) {
      console.log('📊 Campos en "users":');
      console.log(`  - lastHeartbeat: ${sampleUser.lastHeartbeat ? '✓' : '✗'}`);
      console.log(`  - starterDeliveryInProgress: ${sampleUser.starterDeliveryInProgress !== undefined ? '✓' : '✗'}`);
      console.log(`  - starterDeliveryAttempts: ${sampleUser.starterDeliveryAttempts !== undefined ? '✓' : '✗'}`);
    }

    // Verificar level_caps
    const sampleLevelCaps = await levelCapsCollection.findOne({});
    if (sampleLevelCaps) {
      console.log('\n📊 Campos en "level_caps":');
      console.log(`  - version: ${sampleLevelCaps.version ? '✓' : '✗'}`);
      console.log(`  - lastModified: ${sampleLevelCaps.lastModified ? '✓' : '✗'}`);
      console.log(`  - modifiedBy: ${sampleLevelCaps.modifiedBy ? '✓' : '✗'}`);
    }

    // Verificar shop_transactions
    const sampleTransaction = await shopTransactionsCollection.findOne({});
    if (sampleTransaction) {
      console.log('\n📊 Campos en "shop_transactions":');
      console.log(`  - status: ${sampleTransaction.status ? '✓' : '✗'}`);
      console.log(`  - deliveryAttempts: ${sampleTransaction.deliveryAttempts !== undefined ? '✓' : '✗'}`);
    }

    console.log('\n✅ Migración completada exitosamente!\n');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
}

// Ejecutar script
migrateSchemas()
  .then(() => {
    console.log('\n✨ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
