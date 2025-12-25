/**
 * Script para inspeccionar datos completos del mercado
 * Ejecutar: node inspect-market-data.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function inspectMarketData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // 1. Ver todos los listings completos
    console.log('=== TODOS LOS LISTINGS (COMPLETOS) ===\n');
    const listings = await db.collection('player_shop_listings').find({}).toArray();
    
    listings.forEach((l, i) => {
      console.log(`--- Listing ${i + 1} ---`);
      console.log(JSON.stringify(l, null, 2));
      console.log('');
    });
    
    // 2. Ver todas las entregas completas
    console.log('\n=== TODAS LAS ENTREGAS (COMPLETAS) ===\n');
    const deliveries = await db.collection('player_shop_deliveries').find({}).toArray();
    
    deliveries.forEach((d, i) => {
      console.log(`--- Entrega ${i + 1} ---`);
      console.log(JSON.stringify(d, null, 2));
      console.log('');
    });
    
    // 3. Ver el listing vendido específicamente
    console.log('\n=== LISTING VENDIDO ===\n');
    const soldListing = await db.collection('player_shop_listings').findOne({ status: 'sold' });
    if (soldListing) {
      console.log(JSON.stringify(soldListing, null, 2));
    } else {
      console.log('No hay listings vendidos');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

inspectMarketData();
