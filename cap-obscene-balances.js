/**
 * Cap obscene balances to 500,000 CD
 * Also fix negative balances to 0
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';
const MAX_BALANCE = 500000;
const OBSCENE_THRESHOLD = 1000000; // 1 million = obscene

async function capBalances() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Primero, ver todos los usuarios con balances extremos
    console.log('═══════════════════════════════════════════════════════');
    console.log('USUARIOS CON BALANCES EXTREMOS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Buscar usuarios con balance > 1M o < 0
    const extremeUsers = await users.find({
      $or: [
        { balance: { $gt: OBSCENE_THRESHOLD } },
        { balance: { $lt: 0 } },
        { cobbleDollarsBalance: { $gt: OBSCENE_THRESHOLD } },
        { cobbleDollarsBalance: { $lt: 0 } }
      ]
    }).toArray();
    
    if (extremeUsers.length === 0) {
      console.log('✅ No se encontraron usuarios con balances extremos');
      return;
    }
    
    console.log(`Encontrados ${extremeUsers.length} usuarios con balances extremos:\n`);
    
    const toFix = [];
    
    for (const user of extremeUsers) {
      const balance = user.balance || user.cobbleDollarsBalance || 0;
      const status = balance < 0 ? '🔴 NEGATIVO' : balance > OBSCENE_THRESHOLD ? '🟡 OBSCENO' : '✅ OK';
      
      console.log(`${status} ${user.username || 'Unknown'}`);
      console.log(`   Discord: ${user.discordId || 'N/A'}`);
      console.log(`   Balance: ${balance.toLocaleString()} CD`);
      console.log('');
      
      if (balance < 0 || balance > OBSCENE_THRESHOLD) {
        toFix.push({
          _id: user._id,
          username: user.username,
          oldBalance: balance,
          newBalance: balance < 0 ? 0 : MAX_BALANCE
        });
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('APLICANDO CORRECCIONES');
    console.log('═══════════════════════════════════════════════════════\n');
    
    for (const fix of toFix) {
      const result = await users.updateOne(
        { _id: fix._id },
        { 
          $set: { 
            balance: fix.newBalance,
            cobbleDollarsBalance: fix.newBalance
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ ${fix.username}: ${fix.oldBalance.toLocaleString()} → ${fix.newBalance.toLocaleString()} CD`);
      } else {
        console.log(`❌ Error actualizando ${fix.username}`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total usuarios corregidos: ${toFix.length}`);
    console.log(`Balances negativos → 0 CD`);
    console.log(`Balances > 1M → 500,000 CD`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

capBalances();
