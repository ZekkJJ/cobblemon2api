/**
 * Script para limpiar todos los datos de gacha de un jugador
 * 
 * Uso: node clear-player-gacha.js <minecraftUuid> [--refund]
 * 
 * Ejemplo:
 *   node clear-player-gacha.js 91acaca5-fec2-3e6c-bdd5-67fcf725d7c2
 *   node clear-player-gacha.js 91acaca5-fec2-3e6c-bdd5-67fcf725d7c2 --refund
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function clearPlayerGacha(uuid, refund = false) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const pendingCollection = db.collection('gacha_pending');
    const historyCollection = db.collection('gacha_history');
    const pityCollection = db.collection('gacha_pity');
    
    // Buscar usuario
    const user = await usersCollection.findOne({ minecraftUuid: uuid });
    if (!user) {
      console.error('❌ Usuario no encontrado con UUID:', uuid);
      return;
    }
    
    console.log('\n📋 Usuario encontrado:');
    console.log('  Discord ID:', user.discordId);
    console.log('  Username:', user.discordUsername || user.minecraftUsername);
    console.log('  Balance actual:', user.cobbleDollars || 0, 'CD');
    
    const playerId = user.discordId;
    
    // Contar datos
    const pendingCount = await pendingCollection.countDocuments({ playerUuid: uuid });
    const claimedCount = await pendingCollection.countDocuments({ playerUuid: uuid, status: 'claimed' });
    const historyCount = await historyCollection.countDocuments({ playerId });
    const pityCount = await pityCollection.countDocuments({ playerId });
    
    console.log('\n📊 Datos a eliminar:');
    console.log('  Rewards pendientes:', pendingCount);
    console.log('  Rewards claimeados:', claimedCount);
    console.log('  Historial:', historyCount);
    console.log('  Pity records:', pityCount);
    
    // Calcular refund
    let refundAmount = 0;
    if (refund) {
      const history = await historyCollection.find({ playerId }).toArray();
      refundAmount = history.reduce((sum, h) => sum + (h.cost || 0), 0);
      console.log('\n💰 Refund a aplicar:', refundAmount, 'CD');
    }
    
    // Confirmar
    console.log('\n⚠️  ESTA ACCIÓN ES IRREVERSIBLE');
    console.log('Presiona Ctrl+C para cancelar o espera 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Eliminar datos
    console.log('\n🗑️  Eliminando datos...');
    
    const deletedPending = await pendingCollection.deleteMany({ playerUuid: uuid });
    console.log('  ✓ Pending rewards eliminados:', deletedPending.deletedCount);
    
    const deletedHistory = await historyCollection.deleteMany({ playerId });
    console.log('  ✓ Historial eliminado:', deletedHistory.deletedCount);
    
    const deletedPity = await pityCollection.deleteMany({ playerId });
    console.log('  ✓ Pity records eliminados:', deletedPity.deletedCount);
    
    // Aplicar refund
    if (refund && refundAmount > 0) {
      await usersCollection.updateOne(
        { discordId: playerId },
        { $inc: { cobbleDollars: refundAmount, cobbleDollarsBalance: refundAmount } }
      );
      console.log('  ✓ Refund aplicado:', refundAmount, 'CD');
    }
    
    console.log('\n✅ LIMPIEZA COMPLETA');
    console.log('\n⚠️  IMPORTANTE: Los Pokémon en la PC del jugador deben eliminarse manualmente in-game');
    console.log('   Usa el comando: /cleargacha <player>');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

// Main
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node clear-player-gacha.js <minecraftUuid> [--refund]');
  console.log('');
  console.log('Ejemplo:');
  console.log('  node clear-player-gacha.js 91acaca5-fec2-3e6c-bdd5-67fcf725d7c2');
  console.log('  node clear-player-gacha.js 91acaca5-fec2-3e6c-bdd5-67fcf725d7c2 --refund');
  process.exit(1);
}

const uuid = args[0];
const refund = args.includes('--refund');

clearPlayerGacha(uuid, refund);
