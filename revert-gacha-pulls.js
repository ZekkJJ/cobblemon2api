/**
 * Script para revertir pulls del gacha
 * - Elimina recompensas epic/legendary/mythic pendientes
 * - Devuelve el dinero gastado
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function revertGachaPulls() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const historyCollection = db.collection('gacha_history');
    const pendingCollection = db.collection('gacha_pending');
    const pityCollection = db.collection('gacha_pity');
    
    // 1. Buscar todos los pulls de epic, legendary, mythic
    const rarePulls = await historyCollection.find({
      rarity: { $in: ['epic', 'legendary', 'mythic'] }
    }).toArray();
    
    console.log(`\nEncontrados ${rarePulls.length} pulls raros (epic/legendary/mythic)`);
    
    // Agrupar por jugador para calcular reembolsos
    const refundsByPlayer = {};
    
    for (const pull of rarePulls) {
      const playerId = pull.playerId;
      if (!refundsByPlayer[playerId]) {
        refundsByPlayer[playerId] = {
          totalRefund: 0,
          pulls: [],
          rarities: { epic: 0, legendary: 0, mythic: 0 }
        };
      }
      refundsByPlayer[playerId].totalRefund += pull.cost || 500;
      refundsByPlayer[playerId].pulls.push(pull);
      refundsByPlayer[playerId].rarities[pull.rarity]++;
    }
    
    console.log('\n=== RESUMEN POR JUGADOR ===');
    for (const [playerId, data] of Object.entries(refundsByPlayer)) {
      const user = await usersCollection.findOne({ discordId: playerId });
      console.log(`\nJugador: ${user?.discordUsername || playerId}`);
      console.log(`  - Épicos: ${data.rarities.epic}`);
      console.log(`  - Legendarios: ${data.rarities.legendary}`);
      console.log(`  - Míticos: ${data.rarities.mythic}`);
      console.log(`  - Reembolso total: ${data.totalRefund} CD`);
    }
    
    // Preguntar confirmación
    console.log('\n¿Deseas proceder con el reembolso? (Ejecuta con --confirm para confirmar)');
    
    if (process.argv.includes('--confirm')) {
      console.log('\n=== PROCESANDO REEMBOLSOS ===');
      
      for (const [playerId, data] of Object.entries(refundsByPlayer)) {
        // Devolver dinero
        await usersCollection.updateOne(
          { discordId: playerId },
          { $inc: { cobbleDollars: data.totalRefund, cobbleDollarsBalance: data.totalRefund } }
        );
        
        console.log(`✓ Reembolsado ${data.totalRefund} CD a ${playerId}`);
      }
      
      // 2. Eliminar historial de pulls raros
      const deleteHistoryResult = await historyCollection.deleteMany({
        rarity: { $in: ['epic', 'legendary', 'mythic'] }
      });
      console.log(`\n✓ Eliminados ${deleteHistoryResult.deletedCount} registros del historial`);
      
      // 3. Eliminar recompensas pendientes raras
      const deletePendingResult = await pendingCollection.deleteMany({
        rarity: { $in: ['epic', 'legendary', 'mythic'] }
      });
      console.log(`✓ Eliminadas ${deletePendingResult.deletedCount} recompensas pendientes`);
      
      // 4. Resetear pity de todos los jugadores
      const resetPityResult = await pityCollection.updateMany(
        {},
        { $set: { currentPity: 0 } }
      );
      console.log(`✓ Reseteado pity de ${resetPityResult.modifiedCount} jugadores`);
      
      console.log('\n=== REEMBOLSO COMPLETADO ===');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

revertGachaPulls();
