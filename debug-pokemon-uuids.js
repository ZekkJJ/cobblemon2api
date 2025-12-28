/**
 * Debug script to check Pokemon UUIDs in the database
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
    
    const user = await db.collection('users').findOne({ discordId: DISCORD_ID });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('=== USER INFO ===');
    console.log('minecraftUsername:', user.minecraftUsername);
    console.log('minecraftUuid:', user.minecraftUuid);
    console.log('discordId:', user.discordId);
    
    console.log('\n=== PARTY POKEMON UUIDs ===');
    if (user.party && user.party.length > 0) {
      user.party.forEach((p, i) => {
        console.log(`${i+1}. ${p?.species || 'Unknown'} - UUID: ${p?.uuid || 'NO UUID'}`);
      });
    } else {
      console.log('No party pokemon');
    }
    
    console.log('\n=== PC POKEMON UUIDs (first 10) ===');
    if (user.pcStorage && user.pcStorage.length > 0) {
      let count = 0;
      for (const box of user.pcStorage) {
        if (box.pokemon && Array.isArray(box.pokemon)) {
          for (const p of box.pokemon) {
            if (p && count < 10) {
              console.log(`${count+1}. ${p.species || 'Unknown'} - UUID: ${p.uuid || 'NO UUID'}`);
              count++;
            }
          }
        }
      }
    } else {
      console.log('No PC pokemon');
    }
    
    // Check UUID format
    console.log('\n=== UUID FORMAT CHECK ===');
    const samplePokemon = user.party?.[0] || user.pcStorage?.[0]?.pokemon?.[0];
    if (samplePokemon?.uuid) {
      console.log('Sample UUID:', samplePokemon.uuid);
      console.log('UUID type:', typeof samplePokemon.uuid);
      console.log('UUID length:', samplePokemon.uuid.length);
      console.log('Is valid UUID format:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(samplePokemon.uuid));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debug();
