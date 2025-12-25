/**
 * Script para verificar los datos de un usuario específico
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const UUID = '4fa07a77-3772-3168-a557-a863734f1744'; // ZekkJJ

async function checkUserData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('admin');
    
    // Find user by minecraftUuid
    const user = await db.collection('users').findOne({ minecraftUuid: UUID });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('\n=== USER DATA ===');
    console.log('Username:', user.minecraftUsername);
    console.log('Discord ID:', user.discordId);
    console.log('Verified:', user.verified);
    console.log('\n=== POKEMON DATA ===');
    console.log('party field:', user.party ? `${user.party.length} pokemon` : 'NOT SET');
    console.log('pokemonParty field:', user.pokemonParty ? `${user.pokemonParty.length} pokemon` : 'NOT SET');
    console.log('pcStorage field:', user.pcStorage ? `${user.pcStorage.length} items` : 'NOT SET');
    
    if (user.party && user.party.length > 0) {
      console.log('\n--- Party Pokemon ---');
      user.party.forEach((p, i) => {
        console.log(`  ${i+1}. ${p?.species || p?.name || 'Unknown'} Lv.${p?.level || '?'}`);
      });
    }
    
    if (user.pokemonParty && user.pokemonParty.length > 0) {
      console.log('\n--- PokemonParty Pokemon ---');
      user.pokemonParty.forEach((p, i) => {
        console.log(`  ${i+1}. ${p?.species || p?.name || 'Unknown'} Lv.${p?.level || '?'}`);
      });
    }
    
    if (user.pcStorage && user.pcStorage.length > 0) {
      console.log('\n--- PC Storage ---');
      if (Array.isArray(user.pcStorage[0]?.pokemon)) {
        // Box format
        user.pcStorage.forEach((box, i) => {
          const count = box.pokemon?.filter(p => p).length || 0;
          console.log(`  Box ${i+1} (${box.name || 'Unnamed'}): ${count} pokemon`);
        });
      } else {
        // Flat array
        console.log(`  Total: ${user.pcStorage.length} pokemon`);
      }
    }
    
    // Show all fields
    console.log('\n=== ALL FIELDS ===');
    console.log(Object.keys(user).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUserData();
