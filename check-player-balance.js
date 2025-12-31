/**
 * Check player balance in database
 * Run: node check-player-balance.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkPlayers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    
    // Search for conoamarillo by Discord ID
    const conoByDiscord = await db.collection('users').findOne({ discordId: '1160232662825447506' });
    
    // Search by username (case insensitive)
    const conoByName = await db.collection('users').findOne({ 
      $or: [
        { minecraftUsername: { $regex: /conoamarillo/i } },
        { discordUsername: { $regex: /conoamarillo/i } }
      ]
    });
    
    // Search for lechuga
    const lechuga = await db.collection('users').findOne({ 
      $or: [
        { minecraftUsername: { $regex: /lechuga/i } },
        { discordUsername: { $regex: /lechuga/i } }
      ]
    });
    
    console.log('=== CONOAMARILLO (by Discord ID) ===');
    if (conoByDiscord) {
      console.log('Discord ID:', conoByDiscord.discordId);
      console.log('Discord Username:', conoByDiscord.discordUsername);
      console.log('Minecraft UUID:', conoByDiscord.minecraftUuid);
      console.log('Minecraft Username:', conoByDiscord.minecraftUsername);
      console.log('cobbleDollars:', conoByDiscord.cobbleDollars);
      console.log('cobbleDollarsBalance:', conoByDiscord.cobbleDollarsBalance);
      console.log('isMinecraftVerified:', conoByDiscord.isMinecraftVerified);
      console.log('Last sync:', conoByDiscord.lastSync || conoByDiscord.lastBalanceSync);
    } else {
      console.log('NOT FOUND by Discord ID');
    }
    
    console.log('\n=== CONOAMARILLO (by name) ===');
    if (conoByName && conoByName._id.toString() !== conoByDiscord?._id?.toString()) {
      console.log('Discord ID:', conoByName.discordId);
      console.log('Discord Username:', conoByName.discordUsername);
      console.log('Minecraft UUID:', conoByName.minecraftUuid);
      console.log('Minecraft Username:', conoByName.minecraftUsername);
      console.log('cobbleDollars:', conoByName.cobbleDollars);
      console.log('cobbleDollarsBalance:', conoByName.cobbleDollarsBalance);
    } else if (conoByName) {
      console.log('Same as Discord ID search');
    } else {
      console.log('NOT FOUND by name');
    }
    
    console.log('\n=== LECHUGA ===');
    if (lechuga) {
      console.log('Discord ID:', lechuga.discordId);
      console.log('Discord Username:', lechuga.discordUsername);
      console.log('Minecraft UUID:', lechuga.minecraftUuid);
      console.log('Minecraft Username:', lechuga.minecraftUsername);
      console.log('cobbleDollars:', lechuga.cobbleDollars);
      console.log('cobbleDollarsBalance:', lechuga.cobbleDollarsBalance);
      console.log('isMinecraftVerified:', lechuga.isMinecraftVerified);
    } else {
      console.log('NOT FOUND');
    }
    
    // Check for any pending syncs for these players
    console.log('\n=== PENDING SYNCS ===');
    const pendingSyncs = await db.collection('economy_pending_sync').find({
      $or: [
        { uuid: conoByDiscord?.minecraftUuid },
        { uuid: lechuga?.minecraftUuid },
        { username: { $regex: /conoamarillo|lechuga/i } }
      ],
      synced: false
    }).toArray();
    
    if (pendingSyncs.length > 0) {
      console.log('Found', pendingSyncs.length, 'pending syncs:');
      pendingSyncs.forEach(s => {
        console.log(`  - ${s.username}: ${s.type} ${s.amount} CD (${s.reason})`);
      });
    } else {
      console.log('No pending syncs found');
    }
    
    // Show all balance fields for debugging
    console.log('\n=== ALL USERS WITH BALANCE ISSUES ===');
    const usersWithMismatch = await db.collection('users').find({
      $expr: {
        $ne: ['$cobbleDollars', '$cobbleDollarsBalance']
      }
    }).limit(10).toArray();
    
    if (usersWithMismatch.length > 0) {
      console.log('Users with mismatched balance fields:');
      usersWithMismatch.forEach(u => {
        console.log(`  - ${u.minecraftUsername || u.discordUsername}: cobbleDollars=${u.cobbleDollars}, cobbleDollarsBalance=${u.cobbleDollarsBalance}`);
      });
    } else {
      console.log('No users with mismatched balances');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkPlayers();
