/**
 * Debug script to check sync status and test the sync endpoint
 * Run: node debug-sync.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const UUID = '4fa07a77-3772-3168-a557-a863734f1744'; // ZekkJJ

async function debugSync() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('admin');
    
    const user = await db.collection('users').findOne({ minecraftUuid: UUID });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('\n=== SYNC DEBUG INFO ===\n');
    console.log('Username:', user.minecraftUsername);
    console.log('Last Updated:', user.updatedAt);
    console.log('Online:', user.online);
    console.log('Position:', user.x ? `${user.x}, ${user.y}, ${user.z} (${user.world})` : 'NOT SET');
    
    console.log('\n=== POKEMON DATA FIELDS ===\n');
    console.log('party (current):', user.party?.length || 0, 'pokemon');
    console.log('pokemonParty (legacy):', user.pokemonParty?.length || 0, 'pokemon');
    console.log('pcStorage:', user.pcStorage?.length || 0, 'items');
    
    if (user.party && user.party.length > 0) {
      console.log('\n--- Current Party (party field) ---');
      user.party.forEach((p, i) => {
        console.log(`  ${i+1}. ${p?.species || p?.name || 'Unknown'} Lv.${p?.level || '?'}`);
      });
    }
    
    if (user.pokemonParty && user.pokemonParty.length > 0) {
      console.log('\n--- Legacy Party (pokemonParty field) ---');
      user.pokemonParty.forEach((p, i) => {
        console.log(`  ${i+1}. ${p?.species || p?.name || 'Unknown'} Lv.${p?.level || '?'}`);
      });
    }
    
    // Check last sync time
    const now = new Date();
    const lastUpdate = new Date(user.updatedAt);
    const minutesAgo = Math.round((now - lastUpdate) / 1000 / 60);
    
    console.log('\n=== SYNC STATUS ===\n');
    console.log(`Last sync: ${minutesAgo} minutes ago`);
    
    if (minutesAgo > 15) {
      console.log('⚠️  WARNING: Data is stale! Plugin may not be syncing.');
      console.log('   - Check if plugin is running on Pterodactyl');
      console.log('   - Check plugin logs for errors');
      console.log('   - Try /syncnow command in-game');
    } else if (user.party?.length === 0 && user.pokemonParty?.length > 0) {
      console.log('⚠️  WARNING: party is empty but pokemonParty has data');
      console.log('   - Old plugin version may be running');
      console.log('   - Deploy the latest plugin JAR to Pterodactyl');
    } else if (user.party?.length > 0) {
      console.log('✅ Sync appears to be working!');
    } else {
      console.log('❓ No pokemon data in either field');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugSync();
