/**
 * Fix Sandy's duplicate user records
 * Discord ID: 811708046446952469
 * 
 * Problem: Two records with same Discord ID
 * - Record 1: Only Discord data (Sandy), no Minecraft
 * - Record 2: Full data (sandy_queso + isabelamc) with 455,143 CD
 * 
 * Solution: Delete the incomplete record, keep the complete one
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '811708046446952469';

// IDs from the search
const INCOMPLETE_RECORD_ID = '6949d319fa639b6df7abd2e6'; // Sandy - no Minecraft
const COMPLETE_RECORD_ID = '69496e1a65ff12b2ccbdb325';   // sandy_queso + isabelamc

async function fixDuplicate() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    
    // Verify both records exist
    const incompleteRecord = await db.collection('users').findOne({ _id: new ObjectId(INCOMPLETE_RECORD_ID) });
    const completeRecord = await db.collection('users').findOne({ _id: new ObjectId(COMPLETE_RECORD_ID) });
    
    console.log('=== INCOMPLETE RECORD (to delete) ===');
    if (incompleteRecord) {
      console.log('_id:', incompleteRecord._id.toString());
      console.log('Discord ID:', incompleteRecord.discordId);
      console.log('Discord Username:', incompleteRecord.discordUsername);
      console.log('Minecraft UUID:', incompleteRecord.minecraftUuid);
      console.log('Minecraft Username:', incompleteRecord.minecraftUsername);
      console.log('cobbleDollars:', incompleteRecord.cobbleDollars);
    } else {
      console.log('NOT FOUND - already deleted?');
    }
    
    console.log('\n=== COMPLETE RECORD (to keep) ===');
    if (completeRecord) {
      console.log('_id:', completeRecord._id.toString());
      console.log('Discord ID:', completeRecord.discordId);
      console.log('Discord Username:', completeRecord.discordUsername);
      console.log('Minecraft UUID:', completeRecord.minecraftUuid);
      console.log('Minecraft Username:', completeRecord.minecraftUsername);
      console.log('cobbleDollars:', completeRecord.cobbleDollars);
      console.log('verified:', completeRecord.verified);
    } else {
      console.log('NOT FOUND - ERROR!');
      return;
    }
    
    if (!incompleteRecord) {
      console.log('\nIncomplete record already deleted. Nothing to do.');
      return;
    }
    
    // Delete the incomplete record
    console.log('\n=== DELETING INCOMPLETE RECORD ===');
    const deleteResult = await db.collection('users').deleteOne({ _id: new ObjectId(INCOMPLETE_RECORD_ID) });
    
    if (deleteResult.deletedCount === 1) {
      console.log('✓ Successfully deleted incomplete record');
    } else {
      console.log('✗ Failed to delete record');
    }
    
    // Verify final state
    console.log('\n=== FINAL STATE ===');
    const finalRecords = await db.collection('users').find({ discordId: DISCORD_ID }).toArray();
    console.log('Records with Discord ID', DISCORD_ID + ':', finalRecords.length);
    
    if (finalRecords.length === 1) {
      const u = finalRecords[0];
      console.log('✓ User now has single record:');
      console.log('  Discord Username:', u.discordUsername);
      console.log('  Minecraft Username:', u.minecraftUsername);
      console.log('  Balance:', u.cobbleDollars, 'CD');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixDuplicate();
