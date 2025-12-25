/**
 * Script para arreglar la entrega fallida del Lapras
 * 
 * El problema: La entrega fue marcada como 'delivered' pero el Pokémon
 * no llegó al inventario del jugador.
 * 
 * Solución: Resetear la entrega a 'pending' para que el plugin la procese de nuevo.
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function fixDelivery() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // Buscar la entrega del Lapras
    const delivery = await db.collection('player_shop_deliveries').findOne({
      'pokemon.species': 'Lapras',
      buyerUuid: '4fa07a77-3772-3168-a557-a863734f1744'
    });
    
    if (!delivery) {
      console.log('❌ No se encontró la entrega del Lapras');
      return;
    }
    
    console.log('=== ENTREGA ENCONTRADA ===');
    console.log(`  ID: ${delivery._id}`);
    console.log(`  Pokémon: ${delivery.pokemon?.species}`);
    console.log(`  Para: ${delivery.buyerUsername} (${delivery.buyerUuid})`);
    console.log(`  Estado actual: ${delivery.status}`);
    console.log(`  Entregada: ${delivery.deliveredAt || 'N/A'}`);
    
    if (delivery.status === 'delivered') {
      console.log('\n⚠️ La entrega está marcada como "delivered" pero el Pokémon no llegó.');
      console.log('   Reseteando a "pending" para que el plugin la procese de nuevo...\n');
      
      // Resetear a pending
      const result = await db.collection('player_shop_deliveries').updateOne(
        { _id: delivery._id },
        { 
          $set: { status: 'pending' },
          $unset: { deliveredAt: '' }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Entrega reseteada a "pending" exitosamente!');
        console.log('   El jugador recibirá el Pokémon cuando entre al servidor.');
      } else {
        console.log('❌ No se pudo resetear la entrega');
      }
    } else {
      console.log('\n✅ La entrega ya está en estado "pending"');
    }
    
    // Verificar el estado final
    const updatedDelivery = await db.collection('player_shop_deliveries').findOne({ _id: delivery._id });
    console.log(`\n=== ESTADO FINAL ===`);
    console.log(`  Estado: ${updatedDelivery.status}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

fixDelivery();
