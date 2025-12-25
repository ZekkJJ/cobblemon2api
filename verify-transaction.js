/**
 * Script para verificar si la transacción de dinero se procesó
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function verifyTransaction() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // La transacción fue:
    // - Comprador: ZekkJJ (4fa07a77-3772-3168-a557-a863734f1744)
    // - Vendedor: NigBot_12 (25969bf9-0ce7-3046-92df-dcd8c108a4e2)
    // - Precio: 3000 CobbleDollars
    // - Pokémon: Lapras
    
    console.log('=== VERIFICACIÓN DE TRANSACCIÓN ===\n');
    console.log('Transacción esperada:');
    console.log('  - Comprador: ZekkJJ debería tener -3000 CD');
    console.log('  - Vendedor: NigBot_12 debería tener +3000 CD');
    console.log('  - Precio: 3000 CobbleDollars');
    console.log('');
    
    // Buscar el listing vendido
    const listing = await db.collection('player_shop_listings').findOne({ status: 'sold' });
    console.log('=== LISTING VENDIDO ===');
    console.log(`  Pokémon: ${listing?.pokemon?.species}`);
    console.log(`  Precio: ${listing?.price}`);
    console.log(`  Vendedor: ${listing?.seller?.username} (${listing?.seller?.uuid})`);
    console.log(`  Comprador: ${listing?.buyer?.username} (${listing?.buyer?.uuid})`);
    console.log(`  Fecha venta: ${listing?.soldAt}`);
    console.log('');
    
    // Verificar balances actuales
    const buyer = await db.collection('users').findOne({ minecraftUuid: '4fa07a77-3772-3168-a557-a863734f1744' });
    const seller = await db.collection('users').findOne({ minecraftUuid: '25969bf9-0ce7-3046-92df-dcd8c108a4e2' });
    
    console.log('=== BALANCES ACTUALES ===');
    console.log(`COMPRADOR (ZekkJJ):`);
    console.log(`  cobbleDollars: ${buyer?.cobbleDollars || 'N/A'}`);
    console.log(`  cobbleDollarsBalance: ${buyer?.cobbleDollarsBalance || 'N/A'}`);
    
    console.log(`\nVENDEDOR (NigBot_12):`);
    console.log(`  cobbleDollars: ${seller?.cobbleDollars || 'N/A'}`);
    console.log(`  cobbleDollarsBalance: ${seller?.cobbleDollarsBalance || 'N/A'}`);
    
    // Verificar la entrega pendiente
    console.log('\n=== ENTREGA PENDIENTE ===');
    const delivery = await db.collection('player_shop_deliveries').findOne({ status: 'pending' });
    if (delivery) {
      console.log(`  Pokémon: ${delivery.pokemon?.species}`);
      console.log(`  Para: ${delivery.buyerUsername} (${delivery.buyerUuid})`);
      console.log(`  Estado: ${delivery.status}`);
      console.log(`  Creada: ${delivery.createdAt}`);
    } else {
      console.log('  No hay entregas pendientes');
    }
    
    // Conclusión
    console.log('\n=== CONCLUSIÓN ===');
    console.log('El problema es que:');
    console.log('1. El server.js usa el campo "cobbleDollars" para verificar balance');
    console.log('2. El server.js usa $inc para modificar "cobbleDollars"');
    console.log('3. La entrega se creó con "buyerUuid" pero el servicio busca por "recipientUuid"');
    console.log('4. El plugin no encuentra la entrega porque los campos no coinciden');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

verifyTransaction();
