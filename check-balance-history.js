/**
 * Script para verificar el historial de balances
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function checkBalanceHistory() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // Verificar si hay historial de precios o transacciones
    console.log('=== COLECCIONES DISPONIBLES ===');
    const collections = await db.listCollections().toArray();
    collections.forEach(c => console.log(`  - ${c.name}`));
    
    // Verificar shop_purchases para ver si hay compras registradas
    console.log('\n=== COMPRAS EN TIENDA (shop_purchases) ===');
    const purchases = await db.collection('shop_purchases').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    purchases.forEach(p => {
      console.log(`  - ${p.itemName || 'Item'} x${p.quantity || 1} por ${p.totalPrice || 'N/A'} CD`);
      console.log(`    Usuario: ${p.username || 'N/A'} | Fecha: ${p.createdAt}`);
    });
    
    // Verificar el listing vendido
    console.log('\n=== DETALLES DEL LISTING VENDIDO ===');
    const soldListing = await db.collection('player_shop_listings').findOne({ status: 'sold' });
    if (soldListing) {
      console.log(`  ID: ${soldListing._id}`);
      console.log(`  Pokémon: ${soldListing.pokemon?.species}`);
      console.log(`  Precio: ${soldListing.price} CD`);
      console.log(`  Vendedor: ${soldListing.seller?.username} (${soldListing.seller?.uuid})`);
      console.log(`  Comprador: ${soldListing.buyer?.username} (${soldListing.buyer?.uuid})`);
      console.log(`  Creado: ${soldListing.createdAt}`);
      console.log(`  Vendido: ${soldListing.soldAt}`);
    }
    
    // Verificar la entrega
    console.log('\n=== ENTREGA PENDIENTE ===');
    const delivery = await db.collection('player_shop_deliveries').findOne({});
    if (delivery) {
      console.log(JSON.stringify(delivery, null, 2));
    }
    
    // Verificar usuarios duplicados
    console.log('\n=== USUARIOS DUPLICADOS ===');
    const usersByUuid = await db.collection('users').aggregate([
      { $group: { _id: '$minecraftUuid', count: { $sum: 1 }, users: { $push: { id: '$_id', username: '$minecraftUsername', cobbleDollars: '$cobbleDollars' } } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (usersByUuid.length > 0) {
      console.log('¡HAY USUARIOS DUPLICADOS!');
      usersByUuid.forEach(u => {
        console.log(`  UUID: ${u._id} (${u.count} registros)`);
        u.users.forEach(user => {
          console.log(`    - ${user.username}: ${user.cobbleDollars} CD`);
        });
      });
    } else {
      console.log('No hay usuarios duplicados');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkBalanceHistory();
