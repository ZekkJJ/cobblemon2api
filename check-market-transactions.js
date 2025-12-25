/**
 * Script para verificar transacciones del mercado de jugadores
 * Ejecutar: node check-market-transactions.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function checkMarketTransactions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // 1. Verificar listings (usando el nombre correcto de la colección)
    console.log('=== LISTINGS ===');
    const listings = await db.collection('player_shop_listings').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`Total listings: ${await db.collection('player_shop_listings').countDocuments()}`);
    console.log(`Listings activos: ${await db.collection('player_shop_listings').countDocuments({ status: 'active' })}`);
    console.log(`Listings vendidos: ${await db.collection('player_shop_listings').countDocuments({ status: 'sold' })}`);
    console.log(`Listings cancelados: ${await db.collection('player_shop_listings').countDocuments({ status: 'cancelled' })}`);
    
    console.log('\nÚltimos 5 listings:');
    listings.slice(0, 5).forEach(l => {
      console.log(`  - ${l.pokemon?.species || 'Unknown'} | ${l.status} | Vendedor: ${l.sellerUsername} | Precio: ${l.price || l.currentBid || 'N/A'}`);
      if (l.status === 'sold') {
        console.log(`    Comprador: ${l.buyerUsername} | Precio final: ${l.finalPrice}`);
      }
    });
    
    // 2. Verificar entregas pendientes
    console.log('\n=== ENTREGAS PENDIENTES ===');
    const deliveries = await db.collection('player_shop_deliveries').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`Total entregas: ${await db.collection('player_shop_deliveries').countDocuments()}`);
    console.log(`Entregas pendientes: ${await db.collection('player_shop_deliveries').countDocuments({ status: 'pending' })}`);
    console.log(`Entregas completadas: ${await db.collection('player_shop_deliveries').countDocuments({ status: 'delivered' })}`);
    
    console.log('\nÚltimas 5 entregas:');
    deliveries.slice(0, 5).forEach(d => {
      console.log(`  - ${d.pokemon?.species || 'Unknown'} | ${d.status} | Para: ${d.recipientUsername} | Tipo: ${d.type}`);
      console.log(`    Creada: ${d.createdAt} | Entregada: ${d.deliveredAt || 'Pendiente'}`);
    });
    
    // 3. Verificar pujas
    console.log('\n=== PUJAS ===');
    const bids = await db.collection('player_shop_bids').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    console.log(`Total pujas: ${await db.collection('player_shop_bids').countDocuments()}`);
    console.log(`Pujas activas: ${await db.collection('player_shop_bids').countDocuments({ status: 'active' })}`);
    
    // 4. Verificar usuarios con balance
    console.log('\n=== USUARIOS CON BALANCE ===');
    const usersWithBalance = await db.collection('users').find({ 
      cobbleDollarsBalance: { $gt: 0 } 
    }).sort({ cobbleDollarsBalance: -1 }).limit(10).toArray();
    
    console.log('Top 10 usuarios por balance:');
    usersWithBalance.forEach(u => {
      console.log(`  - ${u.minecraftUsername || u.nickname || 'Unknown'} | Balance: ${u.cobbleDollarsBalance} CD | UUID: ${u.minecraftUuid}`);
    });
    
    // 5. Buscar transacciones recientes (listings vendidos)
    console.log('\n=== TRANSACCIONES RECIENTES (últimas 24h) ===');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSales = await db.collection('player_shop_listings').find({
      status: 'sold',
      soldAt: { $gte: yesterday }
    }).toArray();
    
    console.log(`Ventas en las últimas 24h: ${recentSales.length}`);
    recentSales.forEach(s => {
      console.log(`  - ${s.pokemon?.species} vendido por ${s.sellerUsername} a ${s.buyerUsername} por ${s.finalPrice} CD`);
    });
    
    // 6. Verificar si hay entregas pendientes sin procesar
    console.log('\n=== ENTREGAS PENDIENTES SIN PROCESAR ===');
    const pendingDeliveries = await db.collection('player_shop_deliveries').find({ status: 'pending' }).toArray();
    console.log(`Entregas pendientes: ${pendingDeliveries.length}`);
    pendingDeliveries.forEach(d => {
      console.log(`  - ${d.pokemon?.species} para ${d.recipientUsername} (${d.recipientUuid})`);
      console.log(`    Tipo: ${d.type} | Creada: ${d.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkMarketTransactions();
