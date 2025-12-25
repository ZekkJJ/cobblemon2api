/**
 * Script para arreglar la transacción del mercado
 * 
 * Transacción: ZekkJJ compró Lapras de NigBot_12 por 3000 CD
 * 
 * Problema: El dinero no se transfirió
 * Solución: Transferir manualmente los 3000 CD
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

// Datos de la transacción
const BUYER_UUID = '4fa07a77-3772-3168-a557-a863734f1744'; // ZekkJJ
const SELLER_UUID = '25969bf9-0ce7-3046-92df-dcd8c108a4e2'; // NigBot_12
const PRICE = 3000;

async function fixTransaction() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // Obtener balances actuales
    const buyer = await db.collection('users').findOne({ minecraftUuid: BUYER_UUID });
    const seller = await db.collection('users').findOne({ minecraftUuid: SELLER_UUID });
    
    console.log('=== BALANCES ANTES DE LA CORRECCIÓN ===');
    console.log(`COMPRADOR (${buyer?.minecraftUsername || 'ZekkJJ'}):`);
    console.log(`  cobbleDollars: ${buyer?.cobbleDollars || 0}`);
    
    console.log(`\nVENDEDOR (${seller?.minecraftUsername || 'NigBot_12'}):`);
    console.log(`  cobbleDollars: ${seller?.cobbleDollars || 0}`);
    
    // Verificar que el comprador tiene suficiente dinero
    const buyerBalance = buyer?.cobbleDollars || 0;
    if (buyerBalance < PRICE) {
      console.log(`\n❌ El comprador no tiene suficiente dinero (${buyerBalance} < ${PRICE})`);
      console.log('   No se puede procesar la transacción.');
      return;
    }
    
    console.log(`\n⚠️ Procesando transferencia de ${PRICE} CD...`);
    console.log(`   De: ${buyer?.minecraftUsername} → A: ${seller?.minecraftUsername}`);
    
    // Restar dinero al comprador
    const buyerResult = await db.collection('users').updateOne(
      { minecraftUuid: BUYER_UUID },
      { $inc: { cobbleDollars: -PRICE } }
    );
    
    // Sumar dinero al vendedor
    const sellerResult = await db.collection('users').updateOne(
      { minecraftUuid: SELLER_UUID },
      { $inc: { cobbleDollars: PRICE } }
    );
    
    if (buyerResult.modifiedCount > 0 && sellerResult.modifiedCount > 0) {
      console.log('\n✅ Transacción completada exitosamente!');
      
      // Verificar balances finales
      const buyerAfter = await db.collection('users').findOne({ minecraftUuid: BUYER_UUID });
      const sellerAfter = await db.collection('users').findOne({ minecraftUuid: SELLER_UUID });
      
      console.log('\n=== BALANCES DESPUÉS DE LA CORRECCIÓN ===');
      console.log(`COMPRADOR (${buyerAfter?.minecraftUsername}):`);
      console.log(`  cobbleDollars: ${buyerAfter?.cobbleDollars || 0} (antes: ${buyerBalance})`);
      
      console.log(`\nVENDEDOR (${sellerAfter?.minecraftUsername}):`);
      console.log(`  cobbleDollars: ${sellerAfter?.cobbleDollars || 0} (antes: ${seller?.cobbleDollars || 0})`);
    } else {
      console.log('\n❌ Error al procesar la transacción');
      console.log(`   Buyer modified: ${buyerResult.modifiedCount}`);
      console.log(`   Seller modified: ${sellerResult.modifiedCount}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

fixTransaction();
