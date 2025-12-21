/**
 * Configuración de Base de Datos MongoDB
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo maneja la conexión a MongoDB y proporciona
 * acceso a las colecciones de la base de datos.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { env, isProduction } from './env.js';
import { User } from '../shared/types/user.types.js';
import { Starter } from '../shared/types/pokemon.types.js';
import { Tournament } from '../shared/types/tournament.types.js';
import { LevelCapsDocument } from '../shared/types/level-caps.types.js';
import { ShopStock, ShopPurchase } from '../shared/types/shop.types.js';

// Cliente y base de datos cacheados para reutilización
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Opciones de conexión a MongoDB
 */
const mongoOptions = {
  maxPoolSize: isProduction ? 50 : 10,
  minPoolSize: isProduction ? 10 : 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Conecta a la base de datos MongoDB
 * Reutiliza la conexión existente si ya está establecida
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Reutilizar conexión existente
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    console.log('🔌 Conectando a MongoDB...');
    
    const client = new MongoClient(env.MONGODB_URI, mongoOptions);
    await client.connect();
    
    const db = client.db(env.MONGODB_DB);
    
    // Verificar conexión
    await db.command({ ping: 1 });
    
    cachedClient = client;
    cachedDb = db;
    
    console.log('✅ Conectado a MongoDB exitosamente');
    
    return { client, db };
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    throw error;
  }
}

/**
 * Cierra la conexión a MongoDB
 */
export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

/**
 * Obtiene la instancia de la base de datos
 */
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// ============================================
// COLECCIONES
// ============================================

/**
 * Colección de usuarios
 */
export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>('users');
}

/**
 * Colección de starters (Pokémon iniciales)
 */
export async function getStartersCollection(): Promise<Collection<Starter>> {
  const db = await getDb();
  return db.collection<Starter>('starters');
}

/**
 * Colección de torneos
 */
export async function getTournamentsCollection(): Promise<Collection<Tournament>> {
  const db = await getDb();
  return db.collection<Tournament>('tournaments');
}

/**
 * Colección de configuración de level caps
 */
export async function getLevelCapsCollection(): Promise<Collection<LevelCapsDocument>> {
  const db = await getDb();
  return db.collection<LevelCapsDocument>('level_caps');
}

/**
 * Colección de stock de la tienda
 */
export async function getShopStockCollection(): Promise<Collection<ShopStock>> {
  const db = await getDb();
  return db.collection<ShopStock>('shop_stock');
}

/**
 * Colección de compras de la tienda
 */
export async function getShopPurchasesCollection(): Promise<Collection<ShopPurchase>> {
  const db = await getDb();
  return db.collection<ShopPurchase>('shop_purchases');
}

/**
 * Colección de códigos de verificación
 */
export async function getVerificationCodesCollection(): Promise<Collection<any>> {
  const db = await getDb();
  return db.collection('verification_codes');
}

// ============================================
// WRAPPER DE BASE DE DATOS (Compatibilidad)
// ============================================

/**
 * Wrapper de base de datos para operaciones comunes
 * Mantiene compatibilidad con el código existente
 */
export const db = {
  users: {
    find: async (query: Document = {}) => {
      const col = await getUsersCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getUsersCollection();
      return await col.findOne(query);
    },
    insertOne: async (doc: Document) => {
      const col = await getUsersCollection();
      const result = await col.insertOne({ ...doc, createdAt: new Date() } as any);
      return { ...doc, _id: result.insertedId };
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getUsersCollection();
      await col.updateOne(query, { $set: { ...update, updatedAt: new Date() } });
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getUsersCollection();
      await col.updateOne(
        query,
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true }
      );
      return doc;
    },
    deleteOne: async (query: Document) => {
      const col = await getUsersCollection();
      const result = await col.deleteOne(query);
      return result.deletedCount;
    },
    deleteMany: async (query: Document) => {
      const col = await getUsersCollection();
      const result = await col.deleteMany(query);
      return result.deletedCount;
    },
  },

  starters: {
    find: async (query: Document = {}) => {
      const col = await getStartersCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getStartersCollection();
      return await col.findOne(query);
    },
    insertOne: async (doc: Document) => {
      const col = await getStartersCollection();
      const result = await col.insertOne({ ...doc, createdAt: new Date() } as any);
      return { ...doc, _id: result.insertedId };
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getStartersCollection();
      await col.updateOne(query, { $set: { ...update, updatedAt: new Date() } });
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getStartersCollection();
      await col.updateOne(
        query,
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true }
      );
      return doc;
    },
    deleteMany: async (query: Document) => {
      const col = await getStartersCollection();
      const result = await col.deleteMany(query);
      return result.deletedCount;
    },
  },

  tournaments: {
    find: async (query: Document = {}) => {
      const col = await getTournamentsCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getTournamentsCollection();
      return await col.findOne(query);
    },
    insertOne: async (doc: Document) => {
      const col = await getTournamentsCollection();
      const result = await col.insertOne({ ...doc, createdAt: new Date() } as any);
      return { ...doc, _id: result.insertedId };
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getTournamentsCollection();
      await col.updateOne(query, { $set: { ...update, updatedAt: new Date() } });
      return true;
    },
    deleteOne: async (query: Document) => {
      const col = await getTournamentsCollection();
      await col.deleteOne(query);
      return true;
    },
    deleteMany: async (query: Document) => {
      const col = await getTournamentsCollection();
      const result = await col.deleteMany(query);
      return result.deletedCount;
    },
  },

  level_caps: {
    find: async (query: Document = {}) => {
      const col = await getLevelCapsCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getLevelCapsCollection();
      return await col.findOne(query);
    },
    insertOne: async (doc: Document) => {
      const col = await getLevelCapsCollection();
      const result = await col.insertOne({ ...doc, createdAt: new Date() } as any);
      return { ...doc, _id: result.insertedId };
    },
    updateOne: async (query: Document, update: Document, options?: { upsert?: boolean }) => {
      const col = await getLevelCapsCollection();
      await col.updateOne(query, update, options || {});
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getLevelCapsCollection();
      await col.updateOne(
        query,
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true }
      );
      return doc;
    },
  },

  shop_stock: {
    find: async (query: Document = {}) => {
      const col = await getShopStockCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getShopStockCollection();
      return await col.findOne(query);
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getShopStockCollection();
      await col.updateOne(query, { $set: update });
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getShopStockCollection();
      await col.updateOne(query, { $set: doc }, { upsert: true });
      return doc;
    },
  },

  shop_purchases: {
    find: async (query: Document = {}) => {
      const col = await getShopPurchasesCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getShopPurchasesCollection();
      return await col.findOne(query);
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getShopPurchasesCollection();
      await col.updateOne(query, { $set: update });
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getShopPurchasesCollection();
      await col.updateOne(query, { $set: doc }, { upsert: true });
      return doc;
    },
  },

  verification_codes: {
    find: async (query: Document = {}) => {
      const col = await getVerificationCodesCollection();
      return await col.find(query).toArray();
    },
    findOne: async (query: Document) => {
      const col = await getVerificationCodesCollection();
      return await col.findOne(query);
    },
    insertOne: async (doc: Document) => {
      const col = await getVerificationCodesCollection();
      const result = await col.insertOne({ ...doc, createdAt: new Date() });
      return { ...doc, _id: result.insertedId };
    },
    updateOne: async (query: Document, update: Document) => {
      const col = await getVerificationCodesCollection();
      await col.updateOne(query, { $set: update });
      return true;
    },
    deleteOne: async (query: Document) => {
      const col = await getVerificationCodesCollection();
      await col.deleteOne(query);
      return true;
    },
    upsert: async (query: Document, doc: Document) => {
      const col = await getVerificationCodesCollection();
      await col.updateOne(query, { $set: doc }, { upsert: true });
      return doc;
    },
  },
};
