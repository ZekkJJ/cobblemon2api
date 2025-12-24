/**
 * Script para verificar datos de party en MongoDB
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'admin');

  console.log('\n=== VERIFICACIÓN DE DATOS DE PARTY ===\n');

  // Get all users with minecraftUsername
  const users = await db.collection('users').find({
    minecraftUsername: { $exists: true, $ne: '' }
  }).toArray();

  console.log(`Total usuarios con minecraftUsername: ${users.length}\n`);

  let usersWithParty = 0;
  let usersWithValidParty = 0;
  let usersWithParty3Plus = 0;

  for (const user of users) {
    const party = user.pokemonParty || [];
    const hasParty = party.length > 0;
    
    // Check if party has valid pokemon
    const validPokemon = party.filter(p => p && typeof p.level === 'number' && p.level > 0);
    const hasValidParty = validPokemon.length > 0;
    const has3Plus = validPokemon.length >= 3;

    if (hasParty) usersWithParty++;
    if (hasValidParty) usersWithValidParty++;
    if (has3Plus) usersWithParty3Plus++;

    console.log(`👤 ${user.minecraftUsername}`);
    console.log(`   Party array length: ${party.length}`);
    console.log(`   Valid pokemon (level > 0): ${validPokemon.length}`);
    
    if (party.length > 0) {
      console.log(`   Party contents:`);
      party.forEach((p, i) => {
        if (p) {
          console.log(`     [${i}] ${p.species || 'Unknown'} Lv.${p.level || 0} (uuid: ${p.uuid ? 'yes' : 'no'})`);
        } else {
          console.log(`     [${i}] null/empty slot`);
        }
      });
    } else {
      console.log(`   Party: EMPTY or not synced`);
    }
    
    // Check last sync time
    if (user.updatedAt) {
      const lastSync = new Date(user.updatedAt);
      const minutesAgo = Math.round((Date.now() - lastSync.getTime()) / 60000);
      console.log(`   Last updated: ${minutesAgo} minutes ago`);
    }
    
    console.log('');
  }

  console.log('\n=== RESUMEN ===');
  console.log(`Total usuarios: ${users.length}`);
  console.log(`Con party (array > 0): ${usersWithParty}`);
  console.log(`Con party válido (pokemon con level > 0): ${usersWithValidParty}`);
  console.log(`Con 3+ pokemon válidos: ${usersWithParty3Plus}`);

  await client.close();
}

check().catch(console.error);
