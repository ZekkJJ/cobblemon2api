/**
 * Debug script for smart-remove-duplicates
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
    
    console.log('=== SEARCHING FOR USER ===');
    console.log('Discord ID:', DISCORD_ID);
    
    // Try exact query like the endpoint does
    const query = { discordId: DISCORD_ID };
    console.log('\nQuery:', JSON.stringify(query));
    
    // Search in users collection
    const userInUsers = await db.collection('users').findOne(query);
    console.log('\nIn users collection:', userInUsers ? 'FOUND' : 'NOT FOUND');
    if (userInUsers) {
      console.log('  Username:', userInUsers.minecraftUsername || userInUsers.discordUsername);
      console.log('  party:', userInUsers.party?.length || 0, 'pokemon');
      console.log('  pokemonParty:', userInUsers.pokemonParty?.length || 0, 'pokemon');
      console.log('  pcStorage:', userInUsers.pcStorage?.length || 0, 'items');
    }
    
    // Search in players collection
    const userInPlayers = await db.collection('players').findOne(query);
    console.log('\nIn players collection:', userInPlayers ? 'FOUND' : 'NOT FOUND');
    if (userInPlayers) {
      console.log('  Username:', userInPlayers.username);
      console.log('  party:', userInPlayers.party?.length || 0, 'pokemon');
      console.log('  pcStorage:', userInPlayers.pcStorage?.length || 0, 'items');
    }
    
    // Check all users with this discordId
    const allUsersWithDiscord = await db.collection('users').find({ discordId: DISCORD_ID }).toArray();
    console.log('\n=== ALL USERS WITH THIS DISCORD ID ===');
    console.log('Count:', allUsersWithDiscord.length);
    allUsersWithDiscord.forEach((u, i) => {
      console.log(`\nUser ${i+1}:`);
      console.log('  _id:', u._id);
      console.log('  minecraftUsername:', u.minecraftUsername);
      console.log('  discordUsername:', u.discordUsername);
      console.log('  minecraftUuid:', u.minecraftUuid);
      console.log('  party:', u.party?.length || 0);
      console.log('  pokemonParty:', u.pokemonParty?.length || 0);
      console.log('  pcStorage:', u.pcStorage?.length || 0);
    });
    
    // Check database name
    console.log('\n=== DATABASE INFO ===');
    console.log('Database name:', db.databaseName);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debug();
