/**
 * Refund Gacha Users Script
 * Limpia pending rewards y devuelve el dinero EXACTO gastado
 * 
 * Users to refund:
 * - 618144204098371595
 * - 478742167557505034
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_IDS = ['618144204098371595', '478742167557505034'];

async function refundUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔧 GACHA REFUND SCRIPT');
    console.log('='.repeat(50));
    
    for (const discordId of USER_IDS) {
      console.log(`\n📋 Processing user: ${discordId}`);
      console.log('-'.repeat(40));
      
      // 1. Get user info
      const user = await db.collection('users').findOne({ discordId });
      if (!user) {
        console.log(`❌ User not found: ${discordId}`);
        continue;
      }
      
      console.log(`👤 Username: ${user.discordUsername || user.minecraftUsername}`);
      console.log(`💰 Current Balance: ${user.cobbleDollars || 0} / ${user.cobbleDollarsBalance || 0}`);
      
      // 2. Get gacha history to calculate exact spent
      const history = await db.collection('gacha_history').find({ playerId: discordId }).toArray();
      const totalSpent = history.reduce((sum, h) => sum + (h.cost || 0), 0);
      console.log(`📊 Total pulls: ${history.length}`);
      console.log(`💸 Total spent on gacha: ${totalSpent} CD`);
      
      // 3. Get pending rewards
      const pendingByPlayerId = await db.collection('gacha_pending').find({ 
        playerId: discordId,
        status: 'pending'
      }).toArray();
      
      const pendingByUuid = user.minecraftUuid ? await db.collection('gacha_pending').find({ 
        playerUuid: user.minecraftUuid,
        status: 'pending'
      }).toArray() : [];
      
      // Combine and dedupe
      const allPending = [...pendingByPlayerId];
      for (const p of pendingByUuid) {
        if (!allPending.find(x => x.rewardId === p.rewardId)) {
          allPending.push(p);
        }
      }
      
      console.log(`📦 Pending rewards to delete: ${allPending.length}`);
      
      // 4. Get pity data
      const pityData = await db.collection('gacha_pity').find({ playerId: discordId }).toArray();
      const totalPitySpent = pityData.reduce((sum, p) => sum + (p.totalSpent || 0), 0);
      console.log(`🎯 Pity records: ${pityData.length}`);
      
      // 5. Calculate refund amount (use history as source of truth)
      const refundAmount = totalSpent;
      console.log(`\n💵 REFUND AMOUNT: ${refundAmount} CD`);
      
      if (refundAmount === 0 && allPending.length === 0) {
        console.log(`⚠️ Nothing to refund for this user`);
        continue;
      }
      
      // 6. Delete pending rewards
      if (allPending.length > 0) {
        const deleteResult = await db.collection('gacha_pending').deleteMany({
          $or: [
            { playerId: discordId },
            { playerUuid: user.minecraftUuid }
          ]
        });
        console.log(`🗑️ Deleted ${deleteResult.deletedCount} pending rewards`);
      }
      
      // 7. Delete gacha history
      const historyDeleteResult = await db.collection('gacha_history').deleteMany({ playerId: discordId });
      console.log(`🗑️ Deleted ${historyDeleteResult.deletedCount} history entries`);
      
      // 8. Delete pity data
      const pityDeleteResult = await db.collection('gacha_pity').deleteMany({ playerId: discordId });
      console.log(`🗑️ Deleted ${pityDeleteResult.deletedCount} pity records`);
      
      // 9. Delete inventory tracking
      const inventoryDeleteResult = await db.collection('gacha_inventory').deleteMany({ discordId });
      console.log(`🗑️ Deleted ${inventoryDeleteResult.deletedCount} inventory records`);
      
      // 10. Refund the money
      if (refundAmount > 0) {
        const updateResult = await db.collection('users').updateOne(
          { discordId },
          { 
            $inc: { 
              cobbleDollars: refundAmount,
              cobbleDollarsBalance: refundAmount 
            },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`✅ Refunded ${refundAmount} CD to user`);
          
          // Verify new balance
          const updatedUser = await db.collection('users').findOne({ discordId });
          console.log(`💰 New Balance: ${updatedUser.cobbleDollars || 0} / ${updatedUser.cobbleDollarsBalance || 0}`);
        } else {
          console.log(`❌ Failed to refund money`);
        }
      }
      
      // 11. Also delete any pending economy syncs related to gacha
      const syncDeleteResult = await db.collection('economy_pending_sync').deleteMany({
        $or: [
          { uuid: user.minecraftUuid, source: 'gacha' },
          { uuid: user.minecraftUuid, reason: { $regex: /gacha/i } }
        ]
      });
      if (syncDeleteResult.deletedCount > 0) {
        console.log(`🗑️ Deleted ${syncDeleteResult.deletedCount} pending economy syncs`);
      }
      
      console.log(`\n✅ User ${discordId} fully cleaned and refunded!`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 REFUND COMPLETE!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

refundUsers();
