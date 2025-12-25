/**
 * Script para verificar qué campo de balance tienen los usuarios
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function checkUserBalanceField() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // Buscar usuarios con cualquier campo de balance
    const users = await db.collection('users').find({
      $or: [
        { cobbleDollars: { $exists: true } },
        { cobbleDollarsBalance: { $exists: true } }
      ]
    }).toArray();
    
    console.log('=== USUARIOS CON CAMPOS DE BALANCE ===\n');
    
    users.forEach(u => {
      console.log(`Usuario: ${u.minecraftUsername || u.nickname || 'Sin nombre'}`);
      console.log(`  UUID: ${u.minecraftUuid || 'N/A'}`);
      console.log(`  cobbleDollars: ${u.cobbleDollars !== undefined ? u.cobbleDollars : 'NO EXISTE'}`);
      console.log(`  cobbleDollarsBalance: ${u.cobbleDollarsBalance !== undefined ? u.cobbleDollarsBalance : 'NO EXISTE'}`);
      console.log('');
    });
    
    // Verificar específicamente los usuarios involucrados en la transacción
    console.log('=== USUARIOS DE LA TRANSACCIÓN ===\n');
    
    const buyer = await db.collection('users').findOne({ minecraftUuid: '4fa07a77-3772-3168-a557-a863734f1744' });
    const seller = await db.collection('users').findOne({ minecraftUuid: '25969bf9-0ce7-3046-92df-dcd8c108a4e2' });
    
    console.log('COMPRADOR (ZekkJJ):');
    if (buyer) {
      console.log(`  cobbleDollars: ${buyer.cobbleDollars !== undefined ? buyer.cobbleDollars : 'NO EXISTE'}`);
      console.log(`  cobbleDollarsBalance: ${buyer.cobbleDollarsBalance !== undefined ? buyer.cobbleDollarsBalance : 'NO EXISTE'}`);
    } else {
      console.log('  NO ENCONTRADO');
    }
    
    console.log('\nVENDEDOR (NigBot_12):');
    if (seller) {
      console.log(`  cobbleDollars: ${seller.cobbleDollars !== undefined ? seller.cobbleDollars : 'NO EXISTE'}`);
      console.log(`  cobbleDollarsBalance: ${seller.cobbleDollarsBalance !== undefined ? seller.cobbleDollarsBalance : 'NO EXISTE'}`);
    } else {
      console.log('  NO ENCONTRADO');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkUserBalanceField();
