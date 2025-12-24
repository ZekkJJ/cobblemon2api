/**
 * Script para inspeccionar los datos del ranking
 * Ejecutar: node inspect-ranking-data.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function inspectRankingData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI no configurado');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');

    const db = client.db();
    const users = db.collection('users');

    // 1. Contar usuarios totales
    const totalUsers = await users.countDocuments();
    console.log(`Total usuarios: ${totalUsers}`);

    // 2. Contar usuarios verificados
    const verifiedUsers = await users.countDocuments({ verified: true });
    console.log(`Usuarios verificados: ${verifiedUsers}`);

    // 3. Contar usuarios con minecraftUsername
    const withUsername = await users.countDocuments({ 
      minecraftUsername: { $exists: true, $ne: '' } 
    });
    console.log(`Usuarios con minecraftUsername: ${withUsername}`);

    // 4. Contar usuarios verificados CON minecraftUsername
    const verifiedWithUsername = await users.countDocuments({ 
      verified: true,
      minecraftUsername: { $exists: true, $ne: '' } 
    });
    console.log(`Usuarios verificados con username: ${verifiedWithUsername}`);

    // 5. Contar usuarios con pokemonParty
    const withParty = await users.countDocuments({ 
      'pokemonParty.0': { $exists: true } 
    });
    console.log(`Usuarios con pokemonParty: ${withParty}`);

    console.log('\n--- Detalle de usuarios con Pokémon ---\n');

    // 6. Obtener usuarios con Pokémon y mostrar detalles
    const usersWithPokemon = await users.find({
      $or: [
        { 'pokemonParty.0': { $exists: true } },
        { 'pcStorage.0.pokemon.0': { $exists: true } }
      ]
    }).toArray();

    for (const user of usersWithPokemon) {
      console.log(`\n=== ${user.minecraftUsername || user.nickname || 'Sin nombre'} ===`);
      console.log(`  UUID: ${user.minecraftUuid || 'N/A'}`);
      console.log(`  Verificado: ${user.verified ? 'SÍ' : 'NO'}`);
      console.log(`  Discord: ${user.discordUsername || 'N/A'}`);
      
      const party = user.pokemonParty || [];
      console.log(`  Pokémon en party: ${party.length}`);
      
      if (party.length > 0) {
        console.log('  Party:');
        party.forEach((p, i) => {
          if (p) {
            const hasIvs = p.ivs && typeof p.ivs === 'object';
            const hasEvs = p.evs && typeof p.evs === 'object';
            console.log(`    ${i+1}. ${p.species || 'Unknown'} Lv.${p.level || '?'}`);
            console.log(`       IVs: ${hasIvs ? JSON.stringify(p.ivs) : 'NO TIENE'}`);
            console.log(`       EVs: ${hasEvs ? JSON.stringify(p.evs) : 'NO TIENE'}`);
            console.log(`       Shiny: ${p.shiny ? 'SÍ' : 'NO'}`);
          }
        });
      }

      const pc = user.pcStorage || [];
      let pcPokemonCount = 0;
      pc.forEach(box => {
        if (box && box.pokemon) {
          pcPokemonCount += box.pokemon.length;
        }
      });
      console.log(`  Pokémon en PC: ${pcPokemonCount}`);
    }

    // 7. Mostrar usuarios NO verificados que tienen Pokémon
    console.log('\n\n--- Usuarios NO verificados con Pokémon ---\n');
    const unverifiedWithPokemon = await users.find({
      verified: { $ne: true },
      $or: [
        { 'pokemonParty.0': { $exists: true } },
        { 'pcStorage.0.pokemon.0': { $exists: true } }
      ]
    }).toArray();

    if (unverifiedWithPokemon.length === 0) {
      console.log('Ninguno');
    } else {
      unverifiedWithPokemon.forEach(user => {
        const party = user.pokemonParty || [];
        console.log(`- ${user.minecraftUsername || 'Sin nombre'}: ${party.length} Pokémon en party`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

inspectRankingData();
