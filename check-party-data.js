/**
 * Script de diagnóstico para verificar datos de party en MongoDB
 * Ejecutar: node check-party-data.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkPartyData() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');

    const db = client.db();
    
    // Get all users with minecraftUsername
    const users = await db.collection('users').find({
      minecraftUsername: { $exists: true, $ne: '' }
    }).toArray();

    console.log(`Total usuarios con minecraftUsername: ${users.length}\n`);
    console.log('='.repeat(60));

    let usersWithParty = 0;
    let usersWithPokemonParty = 0;
    let usersWithBoth = 0;
    let usersWithNeither = 0;
    let usersWithValidTeam = 0;

    for (const user of users) {
      const hasParty = user.party && Array.isArray(user.party) && user.party.length > 0;
      const hasPokemonParty = user.pokemonParty && Array.isArray(user.pokemonParty) && user.pokemonParty.length > 0;
      
      if (hasParty) usersWithParty++;
      if (hasPokemonParty) usersWithPokemonParty++;
      if (hasParty && hasPokemonParty) usersWithBoth++;
      if (!hasParty && !hasPokemonParty) usersWithNeither++;

      // Check for valid team (3+ pokemon with level > 0)
      const partyData = user.party || user.pokemonParty || [];
      const validPokemon = partyData.filter(p => p && typeof p.level === 'number' && p.level > 0);
      if (validPokemon.length >= 3) {
        usersWithValidTeam++;
      }

      // Show details for first 10 users
      if (users.indexOf(user) < 10) {
        console.log(`\n${user.minecraftUsername}:`);
        console.log(`  - party: ${hasParty ? user.party.length + ' pokemon' : 'NO'}`);
        console.log(`  - pokemonParty: ${hasPokemonParty ? user.pokemonParty.length + ' pokemon' : 'NO'}`);
        console.log(`  - verified: ${user.verified}`);
        console.log(`  - online: ${user.online}`);
        
        if (hasParty && user.party.length > 0) {
          console.log(`  - Party pokemon levels: ${user.party.map(p => p?.level || 0).join(', ')}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\nRESUMEN:');
    console.log(`  - Usuarios con campo 'party': ${usersWithParty}`);
    console.log(`  - Usuarios con campo 'pokemonParty': ${usersWithPokemonParty}`);
    console.log(`  - Usuarios con ambos campos: ${usersWithBoth}`);
    console.log(`  - Usuarios SIN ningún campo de party: ${usersWithNeither}`);
    console.log(`  - Usuarios con equipo válido (3+ pokemon): ${usersWithValidTeam}`);
    console.log('\n' + '='.repeat(60));

    // Check if the issue is the field name
    if (usersWithParty > 0 && usersWithPokemonParty === 0) {
      console.log('\n⚠️  DIAGNÓSTICO: Los datos están en "party", no en "pokemonParty"');
      console.log('   El team ranking debe usar user.party en lugar de user.pokemonParty');
    } else if (usersWithPokemonParty > 0 && usersWithParty === 0) {
      console.log('\n⚠️  DIAGNÓSTICO: Los datos están en "pokemonParty", no en "party"');
    } else if (usersWithNeither === users.length) {
      console.log('\n❌ DIAGNÓSTICO: NINGÚN usuario tiene datos de party!');
      console.log('   El plugin no está sincronizando los datos correctamente.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkPartyData();
