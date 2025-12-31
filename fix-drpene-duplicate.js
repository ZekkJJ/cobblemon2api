/**
 * Fix DrPENE's duplicate user records
 * 
 * Problem: Two records with same Minecraft UUID
 * - Record 1: Only Minecraft data (DrPENE), 15,647 CD, online
 * - Record 2: Discord + Minecraft (DrPENE), verified, no balance
 * 
 * Solution: Merge into the Discord record (keep verification), transfer balance
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// IDs from the search
const MINECRAFT_ONLY_ID = '694adf61002607035a83ed05'; // Has balance, no Discord
const DISCORD_RECORD_ID = '694a0355f6d79d3bf8da5c91';  // Has Discord, verified, no balance

async function fixDuplicate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    
    // Verify both records exist
    const minecraftRecord = await db.collection('users').findOne({ _id: new ObjectId(MINECRAFT_ONLY_ID) });
    const discordRecord = await db.collection('users').findOne({ _id: new ObjectId(DISCORD_RECORD_ID) });
    
    console.log('=== MINECRAFT-ONLY RECORD (to delete after merge) ===');
    if (minecraftRecord) {
      console.log('_id:', minecraftRecord._id.toString());
      console.log('Discord ID:', minecraftRecord.discordId);
      console.log('Minecraft UUID:', minecraftRecord.minecraftUuid);
      console.log('Minecraft Username:', minecraftRecord.minecraftUsername);
      console.log('cobbleDollars:', minecraftRecord.cobbleDollars);
      console.log('online:', minecraftRecord.online);
      console.log('party:', minecraftRecord.party?.length || 0, 'pokemon');
    } else {
      console.log('NOT FOUND - already deleted?');
    }
    
    console.log('\n=== DISCORD RECORD (to keep and update) ===');
    if (discordRecord) {
      console.log('_id:', discordRecord._id.toString());
      console.log('Discord ID:', discordRecord.discordId);
      console.log('Minecraft UUID:', discordRecord.minecraftUuid);
      console.log('Minecraft Username:', discordRecord.minecraftUsername);
      console.log('cobbleDollars:', discordRecord.cobbleDollars);
      console.log('verified:', discordRecord.verified);
    } else {
      console.log('NOT FOUND - ERROR!');
      return;
    }
    
    if (!minecraftRecord) {
      console.log('\nMinecraft-only record already deleted. Nothing to do.');
      return;
    }
    
    // Merge: Update Discord record with data from Minecraft record
    console.log('\n=== MERGING RECORDS ===');
    
    const mergeData = {
      cobbleDollars: minecraftRecord.cobbleDollars || 0,
      cobbleDollarsBalance: minecraftRecord.cobbleDollarsBalance || minecraftRecord.cobbleDollars || 0,
      online: minecraftRecord.online,
      party: minecraftRecord.party || [],
      pcStorage: minecraftRecord.pcStorage || [],
      x: minecraftRecord.x,
      y: minecraftRecord.y,
      z: minecraftRecord.z,
      world: minecraftRecord.world,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    Object.keys(mergeData).forEach(key => {
      if (mergeData[key] === undefined) delete mergeData[key];
    });
    
    console.log('Merging data:', JSON.stringify(mergeData, null, 2));
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(DISCORD_RECORD_ID) },
      { $set: mergeData }
    );
    console.log('✓ Discord record updated with Minecraft data');
    
    // Delete the Minecraft-only record
    console.log('\n=== DELETING MINECRAFT-ONLY RECORD ===');
    const deleteResult = await db.collection('users').deleteOne({ _id: new ObjectId(MINECRAFT_ONLY_ID) });
    
    if (deleteResult.deletedCount === 1) {
      console.log('✓ Successfully deleted Minecraft-only record');
    } else {
      console.log('✗ Failed to delete record');
    }
    
    // Verify final state
    console.log('\n=== FINAL STATE ===');
    const finalRecord = await db.collection('users').findOne({ _id: new ObjectId(DISCORD_RECORD_ID) });
    console.log('DrPENE now has single record:');
    console.log('  Discord ID:', finalRecord.discordId);
    console.log('  Minecraft Username:', finalRecord.minecraftUsername);
    console.log('  Balance:', finalRecord.cobbleDollars, 'CD');
    console.log('  Verified:', finalRecord.verified);
    console.log('  Online:', finalRecord.online);
    
    // Check for any remaining duplicates
    const remaining = await db.collection('users').find({
      minecraftUuid: '37e8ff09-84ca-309f-ac15-167ee817b7cd'
    }).toArray();
    console.log('\nRecords with this Minecraft UUID:', remaining.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixDuplicate();
