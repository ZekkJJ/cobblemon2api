/**
 * Fix users with billions of CobbleDollars
 * Cap them to a reasonable amount (500k)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

// Threshold: anything over 10 million is suspicious
const SUSPICIOUS_THRESHOLD = 10_000_000; // 10M
// Cap to this amount
const CAP_AMOUNT = 500_000; // 500k

async function fixBillionaires() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find users with obscene balances (over 10M)
    const billionaires = await users.find({
      $or: [
        { balance: { $gt: SUSPICIOUS_THRESHOLD } },
        { cobbleDollars: { $gt: SUSPICIOUS_THRESHOLD } }
      ]
    }).toArray();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 USUARIOS CON BALANCES OBSCENOS (>10M CD)');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (billionaires.length === 0) {
      console.log('No se encontraron usuarios con más de 10M CD');
      
      // Let's check the top 10 richest users anyway
      console.log('\n📊 TOP 10 USUARIOS MÁS RICOS:');
      const richest = await users.find({}).sort({ balance: -1 }).limit(10).toArray();
      
      for (const user of richest) {
        const bal = user.balance || user.cobbleDollars || 0;
        console.log(`  ${user.username || user.minecraftUsername || 'Unknown'}: ${bal.toLocaleString()} CD`);
      }
      
      return;
    }
    
    console.log(`Encontrados: ${billionaires.length} usuarios\n`);
    
    for (const user of billionaires) {
      const currentBalance = user.balance || user.cobbleDollars || 0;
      console.log(`👤 ${user.username || user.minecraftUsername || 'Unknown'}`);
      console.log(`   Discord: ${user.discordId || 'N/A'}`);
      console.log(`   Balance actual: ${currentBalance.toLocaleString()} CD`);
      console.log(`   Nuevo balance: ${CAP_AMOUNT.toLocaleString()} CD`);
      console.log('');
    }
    
    // Ask for confirmation (in script, just do it)
    console.log('═══════════════════════════════════════════════════════');
    console.log('APLICANDO CORRECCIONES...');
    console.log('═══════════════════════════════════════════════════════\n');
    
    let fixed = 0;
    for (const user of billionaires) {
      const result = await users.updateOne(
        { _id: user._id },
        { 
          $set: { 
            balance: CAP_AMOUNT,
            cobbleDollars: CAP_AMOUNT,
            balanceFixedAt: new Date(),
            balanceFixReason: 'obscene_balance_cap'
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        fixed++;
        console.log(`✅ ${user.username || user.minecraftUsername}: Corregido a ${CAP_AMOUNT.toLocaleString()} CD`);
      }
    }
    
    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`RESULTADO: ${fixed} usuarios corregidos`);
    console.log(`═══════════════════════════════════════════════════════`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixBillionaires();
