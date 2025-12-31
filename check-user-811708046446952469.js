/**
 * Check user 811708046446952469 for balance sync issues
 * Run: node check-user-811708046446952469.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '811708046446952469';

async function checkUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    console.log(`Searching for Discord ID: ${DISCORD_ID}\n`);
    
    // Search by Discord ID
    const userByDiscord = await db.collection('users').findOne({ discordId: DISCORD_ID });
    
    // Search for any user records that might be split
    const allRelatedUsers = await db.collection('users').find({
      $or: [
        { discordId: DISCORD_ID },
        // If we find a username, search for that too
      ]
    }).toArray();
    
    console.log('=== USER BY DISCORD ID ===');
    if (userByDiscord) {
      console.log('_id:', userByDiscord._id.toString());
      console.log('Discord ID:', userByDiscord.discordId);
      console.log('Discord Username:', userByDiscord.discordUsername);
      console.log('Minecraft UUID:', userByDiscord.minecraftUuid);
      console.log('Minecraft Username:', userByDiscord.minecraftUsername);
      console.log('cobbleDollars:', userByDiscord.cobbleDollars);
      console.log('cobbleDollarsBalance:', userByDiscord.cobbleDollarsBalance);
      console.log('isMinecraftVerified:', userByDiscord.isMinecraftVerified);
      console.log('verified:', userByDiscord.verified);
      console.log('online:', userByDiscord.online);
      console.log('Last update:', userByDiscord.updatedAt || userByDiscord.lastEconomyUpdate);
      
      // If we have a minecraft username, search for split records
      if (userByDiscord.minecraftUsername) {
        const splitByName = await db.collection('users').find({
          minecraftUsername: { $regex: new RegExp(userByDiscord.minecraftUsername, 'i') },
          _id: { $ne: userByDiscord._id }
        }).toArray();
        
        if (splitByName.length > 0) {
          console.log('\n=== SPLIT RECORDS FOUND BY MINECRAFT NAME ===');
          splitByName.forEach(u => {
            console.log('---');
            console.log('_id:', u._id.toString());
            console.log('Discord ID:', u.discordId);
            console.log('Minecraft UUID:', u.minecraftUuid);
            console.log('Minecraft Username:', u.minecraftUsername);
            console.log('cobbleDollars:', u.cobbleDollars);
          });
        }
      }
      
      // If we have a minecraft UUID, search for split records
      if (userByDiscord.minecraftUuid) {
        const splitByUuid = await db.collection('users').find({
          minecraftUuid: userByDiscord.minecraftUuid,
          _id: { $ne: userByDiscord._id }
        }).toArray();
        
        if (splitByUuid.length > 0) {
          console.log('\n=== SPLIT RECORDS FOUND BY MINECRAFT UUID ===');
          splitByUuid.forEach(u => {
            console.log('---');
            console.log('_id:', u._id.toString());
            console.log('Discord ID:', u.discordId);
            console.log('Minecraft UUID:', u.minecraftUuid);
            console.log('Minecraft Username:', u.minecraftUsername);
            console.log('cobbleDollars:', u.cobbleDollars);
          });
        }
      }
    } else {
      console.log('NOT FOUND by Discord ID');
    }
    
    // Check for locked balances
    console.log('\n=== LOCKED BALANCES ===');
    const lockedBalances = await db.collection('locked_balances').find({
      minecraftUuid: userByDiscord?.minecraftUuid
    }).toArray();
    
    if (lockedBalances.length > 0) {
      console.log('Found', lockedBalances.length, 'locked balance entries:');
      lockedBalances.forEach(lb => {
        console.log(`  - Pool ${lb.poolId}: ${lb.amount} CD locked`);
      });
    } else {
      console.log('No locked balances');
    }
    
    // Check for pending syncs
    console.log('\n=== PENDING SYNCS ===');
    const pendingSyncs = await db.collection('economy_pending_sync').find({
      uuid: userByDiscord?.minecraftUuid,
      synced: false
    }).toArray();
    
    if (pendingSyncs.length > 0) {
      console.log('Found', pendingSyncs.length, 'pending syncs:');
      pendingSyncs.forEach(s => {
        console.log(`  - ${s.type} ${s.amount} CD (${s.reason})`);
      });
    } else {
      console.log('No pending syncs');
    }
    
    // Check pool contributions
    console.log('\n=== POOL CONTRIBUTIONS ===');
    const contributions = await db.collection('pool_contributions').find({
      minecraftUuid: userByDiscord?.minecraftUuid
    }).toArray();
    
    if (contributions.length > 0) {
      console.log('Found', contributions.length, 'pool contributions:');
      contributions.forEach(c => {
        console.log(`  - Pool ${c.poolId}: ${c.totalContributed} CD total`);
      });
    } else {
      console.log('No pool contributions');
    }
    
    // Check recent economy transactions
    console.log('\n=== RECENT ECONOMY TRANSACTIONS ===');
    const transactions = await db.collection('economy_transactions').find({
      uuid: userByDiscord?.minecraftUuid
    }).sort({ timestamp: -1 }).limit(10).toArray();
    
    if (transactions.length > 0) {
      console.log('Last 10 transactions:');
      transactions.forEach(t => {
        console.log(`  - ${t.timestamp?.toISOString?.() || 'N/A'}: ${t.type} ${t.amount} CD | ${t.previousBalance} -> ${t.newBalance} | ${t.reason}`);
      });
    } else {
      console.log('No transactions found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUser();
