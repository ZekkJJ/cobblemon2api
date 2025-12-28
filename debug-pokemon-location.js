/**
 * Debug script to find where Pokemon data is stored
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '478742167557505034';

async function debug() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('=== SEARCHING FOR DISCORD ID:', DISCORD_ID, '===\n');
    
    // Check users collection
    console.log('--- USERS COLLECTION ---');
    const user = await db.collection('users').findOne({ discordId: DISCORD_ID });
    if (user) {
      console.log('Found in users:');
      console.log('  _id:', user._id);
      console.log('  discordId:', user.discordId);
      console.log('  username:', user.username || user.discordUsername);
      console.log('  uuid:', user.uuid);
      console.log('  party:', user.party ? `${user.party.length} pokemon` : 'undefined/null');
      console.log('  pcStorage:', user.pcStorage ? `${user.pcStorage.length} items` : 'undefined/null');
      if (user.pcStorage && user.pcStorage.length > 0) {
        console.log('  pcStorage[0] keys:', Object.keys(user.pcStorage[0]));
        if (user.pcStorage[0].pokemon) {
          console.log('  pcStorage[0].pokemon length:', user.pcStorage[0].pokemon.length);
        }
      }
    } else {
      console.log('NOT found in users collection');
    }
    
    // Check players collection
    console.log('\n--- PLAYERS COLLECTION ---');
    const player = await db.collection('players').findOne({ discordId: DISCORD_ID });
    if (player) {
      console.log('Found in players:');
      console.log('  _id:', player._id);
      console.log('  discordId:', player.discordId);
      console.log('  username:', player.username);
      console.log('  uuid:', player.uuid);
      console.log('  party:', player.party ? `${player.party.length} pokemon` : 'undefined/null');
      console.log('  pcStorage:', player.pcStorage ? `${player.pcStorage.length} items` : 'undefined/null');
      if (player.pcStorage && player.pcStorage.length > 0) {
        console.log('  pcStorage[0] keys:', Object.keys(player.pcStorage[0]));
      }
    } else {
      console.log('NOT found in players collection');
    }
    
    // Check if there's a user with pokemon by username
    console.log('\n--- SEARCHING BY USERNAME ---');
    const userByName = await db.collection('users').findOne({ 
      $or: [
        { username: /zekk/i },
        { discordUsername: /zekk/i },
        { username: /byakuga/i },
        { discordUsername: /byakuga/i }
      ]
    });
    if (userByName) {
      console.log('Found user by name:');
      console.log('  discordId:', userByName.discordId);
      console.log('  username:', userByName.username || userByName.discordUsername);
      console.log('  party:', userByName.party ? `${userByName.party.length} pokemon` : 'undefined/null');
      console.log('  pcStorage:', userByName.pcStorage ? `${userByName.pcStorage.length} items` : 'undefined/null');
    }
    
    // Find any user with pcStorage that has pokemon
    console.log('\n--- USERS WITH POKEMON ---');
    const usersWithPokemon = await db.collection('users').find({
      $or: [
        { 'party.0': { $exists: true } },
        { 'pcStorage.0.pokemon.0': { $exists: true } },
        { 'pcStorage.0': { $exists: true } }
      ]
    }).limit(5).toArray();
    
    console.log(`Found ${usersWithPokemon.length} users with pokemon data:`);
    for (const u of usersWithPokemon) {
      const partyCount = u.party?.length || 0;
      let pcCount = 0;
      if (u.pcStorage) {
        for (const box of u.pcStorage) {
          if (box?.pokemon) pcCount += box.pokemon.length;
          else if (box?.species || box?.uuid) pcCount++;
        }
      }
      console.log(`  - ${u.discordId} (${u.username || u.discordUsername}): party=${partyCount}, pc=${pcCount}`);
    }
    
    // Check all collections for this discordId
    console.log('\n--- ALL COLLECTIONS ---');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const doc = await db.collection(col.name).findOne({ discordId: DISCORD_ID });
      if (doc) {
        console.log(`Found in ${col.name}:`, Object.keys(doc).join(', '));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debug();
