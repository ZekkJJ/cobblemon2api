/**
 * Fix Balance Field Inconsistency
 * Some users have cobbleDollars but not cobbleDollarsBalance (or vice versa)
 * This script syncs both fields to the max value
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixBalanceFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('='.repeat(60));
    console.log('FIXING BALANCE FIELD INCONSISTENCIES');
    console.log('='.repeat(60));
    
    // Find users where cobbleDollars != cobbleDollarsBalance
    const usersWithInconsistentBalance = await db.collection('users').find({
      $or: [
        // Has cobbleDollars but not cobbleDollarsBalance
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: { $exists: false } },
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: null },
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: 0 },
        // Has cobbleDollarsBalance but not cobbleDollars
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: { $exists: false } },
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: null },
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: 0 },
      ]
    }).toArray();
    
    console.log(`\nFound ${usersWithInconsistentBalance.length} users with inconsistent balance fields:\n`);
    
    for (const user of usersWithInconsistentBalance) {
      const cd = user.cobbleDollars || 0;
      const cdb = user.cobbleDollarsBalance || 0;
      const maxBalance = Math.max(cd, cdb);
      
      console.log(`📋 ${user.minecraftUsername || user.discordUsername || user._id}`);
      console.log(`   cobbleDollars: ${cd}`);
      console.log(`   cobbleDollarsBalance: ${cdb}`);
      console.log(`   → Setting both to: ${maxBalance}`);
      
      // Update both fields to max value
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            cobbleDollars: maxBalance,
            cobbleDollarsBalance: maxBalance,
            updatedAt: new Date()
          }
        }
      );
      console.log(`   ✅ Fixed!\n`);
    }
    
    // Also check players collection
    const playersWithInconsistentBalance = await db.collection('players').find({
      $or: [
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: { $exists: false } },
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: null },
        { cobbleDollars: { $exists: true, $gt: 0 }, cobbleDollarsBalance: 0 },
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: { $exists: false } },
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: null },
        { cobbleDollarsBalance: { $exists: true, $gt: 0 }, cobbleDollars: 0 },
      ]
    }).toArray();
    
    if (playersWithInconsistentBalance.length > 0) {
      console.log(`\nFound ${playersWithInconsistentBalance.length} players with inconsistent balance:\n`);
      
      for (const player of playersWithInconsistentBalance) {
        const cd = player.cobbleDollars || 0;
        const cdb = player.cobbleDollarsBalance || 0;
        const maxBalance = Math.max(cd, cdb);
        
        console.log(`📋 ${player.username || player.discordUsername || player._id}`);
        console.log(`   cobbleDollars: ${cd}`);
        console.log(`   cobbleDollarsBalance: ${cdb}`);
        console.log(`   → Setting both to: ${maxBalance}`);
        
        await db.collection('players').updateOne(
          { _id: player._id },
          { 
            $set: { 
              cobbleDollars: maxBalance,
              cobbleDollarsBalance: maxBalance,
              updatedAt: new Date()
            }
          }
        );
        console.log(`   ✅ Fixed!\n`);
      }
    }
    
    console.log('='.repeat(60));
    console.log('DONE! All balance fields synchronized.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixBalanceFields();
