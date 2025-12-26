/**
 * FULL GACHA RESET - Limpia TODO y devuelve TODO el dinero
 * - Elimina TODAS las recompensas pendientes
 * - Elimina TODO el historial
 * - Resetea TODOS los pity
 * - Devuelve TODO el dinero gastado
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fullGachaReset() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    const historyCollection = db.collection('gacha_history');
    const pendingCollection = db.collection('gacha_pending');
    const pityCollection = db.collection('gacha_pity');
    const pendingSyncCollection = db.collection('economy_pending_sync');
    
    // 1. Obtener TODO el historial para calcular reembolsos
    const allHistory = await historyCollection.find({}).toArray();
    
    console.log(`\n=== RESUMEN TOTAL ===`);
    console.log(`Total de pulls en historial: ${allHistory.length}`);
    
    // Calcular reembolsos por jugador
    const refundsByPlayer = {};
    
    for (const pull of allHistory) {
      const playerId = pull.playerId;
      if (!refundsByPlayer[playerId]) {
        refundsByPlayer[playerId] = {
          totalRefund: 0,
          pullCount: 0,
          rarities: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 }
        };
      }
      refundsByPlayer[playerId].totalRefund += pull.cost || 500;
      refundsByPlayer[playerId].pullCount++;
      if (pull.rarity && refundsByPlayer[playerId].rarities[pull.rarity] !== undefined) {
        refundsByPlayer[playerId].rarities[pull.rarity]++;
      }
    }
    
    // Mostrar resumen
    let totalRefund = 0;
    console.log('\n=== REEMBOLSOS POR JUGADOR ===');
    for (const [playerId, data] of Object.entries(refundsByPlayer)) {
      const user = await usersCollection.findOne({ discordId: playerId });
      console.log(`\nJugador: ${user?.discordUsername || user?.minecraftUsername || playerId}`);
      console.log(`  - Pulls totales: ${data.pullCount}`);
      console.log(`  - Common: ${data.rarities.common}, Uncommon: ${data.rarities.uncommon}, Rare: ${data.rarities.rare}`);
      console.log(`  - Epic: ${data.rarities.epic}, Legendary: ${data.rarities.legendary}, Mythic: ${data.rarities.mythic}`);
      console.log(`  - Reembolso: ${data.totalRefund} CD`);
      totalRefund += data.totalRefund;
    }
    
    console.log(`\n=== TOTAL A REEMBOLSAR: ${totalRefund} CD ===`);
    
    // Contar pendientes
    const pendingCount = await pendingCollection.countDocuments({});
    console.log(`\nRecompensas pendientes a eliminar: ${pendingCount}`);
    
    // Contar pity
    const pityCount = await pityCollection.countDocuments({});
    console.log(`Registros de pity a resetear: ${pityCount}`);
    
    // Contar pending syncs
    const pendingSyncCount = await pendingSyncCollection.countDocuments({});
    console.log(`Pending syncs a eliminar: ${pendingSyncCount}`);
    
    console.log('\n¿Deseas proceder? (Ejecuta con --confirm para confirmar)');
    
    if (process.argv.includes('--confirm')) {
      console.log('\n=== PROCESANDO RESET COMPLETO ===');
      
      // 1. Devolver dinero a cada jugador
      for (const [playerId, data] of Object.entries(refundsByPlayer)) {
        await usersCollection.updateOne(
          { discordId: playerId },
          { $inc: { cobbleDollars: data.totalRefund, cobbleDollarsBalance: data.totalRefund } }
        );
        console.log(`✓ Reembolsado ${data.totalRefund} CD a ${playerId}`);
      }
      
      // 2. Eliminar TODO el historial
      const deleteHistoryResult = await historyCollection.deleteMany({});
      console.log(`\n✓ Eliminados ${deleteHistoryResult.deletedCount} registros del historial`);
      
      // 3. Eliminar TODAS las recompensas pendientes
      const deletePendingResult = await pendingCollection.deleteMany({});
      console.log(`✓ Eliminadas ${deletePendingResult.deletedCount} recompensas pendientes`);
      
      // 4. Resetear TODOS los pity
      const deletePityResult = await pityCollection.deleteMany({});
      console.log(`✓ Eliminados ${deletePityResult.deletedCount} registros de pity`);
      
      // 5. Eliminar pending syncs
      const deletePendingSyncResult = await pendingSyncCollection.deleteMany({});
      console.log(`✓ Eliminados ${deletePendingSyncResult.deletedCount} pending syncs`);
      
      console.log('\n=== ✅ RESET COMPLETO FINALIZADO ===');
      console.log(`Total reembolsado: ${totalRefund} CD`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fullGachaReset();
