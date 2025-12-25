/**
 * Script para verificar los Pokémon de un jugador
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function checkPlayerPokemon() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
    
    const db = client.db();
    
    // Buscar a ZekkJJ
    const player = await db.collection('users').findOne({ minecraftUuid: '4fa07a77-3772-3168-a557-a863734f1744' });
    
    if (!player) {
      console.log('Jugador no encontrado');
      return;
    }
    
    console.log('=== DATOS DE ZekkJJ ===');
    console.log(`Username: ${player.minecraftUsername}`);
    console.log(`UUID: ${player.minecraftUuid}`);
    console.log(`Balance (cobbleDollars): ${player.cobbleDollars || 0}`);
    console.log(`Balance (cobbleDollarsBalance): ${player.cobbleDollarsBalance || 0}`);
    
    console.log('\n=== PARTY ===');
    if (player.pokemonParty && player.pokemonParty.length > 0) {
      player.pokemonParty.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.species} Nv.${p.level} ${p.shiny ? '✨' : ''}`);
        console.log(`     UUID: ${p.uuid}`);
      });
    } else {
      console.log('  Party vacía');
    }
    
    console.log('\n=== PC STORAGE ===');
    if (player.pcStorage && player.pcStorage.length > 0) {
      let totalPokemon = 0;
      let foundLapras = false;
      
      player.pcStorage.forEach((box, boxIndex) => {
        if (box.pokemon && box.pokemon.length > 0) {
          console.log(`\n  Box ${boxIndex + 1} (${box.pokemon.length} Pokémon):`);
          box.pokemon.forEach((p, i) => {
            if (p) {
              totalPokemon++;
              const isLapras = p.species?.toLowerCase() === 'lapras';
              if (isLapras) foundLapras = true;
              console.log(`    ${i + 1}. ${p.species} Nv.${p.level} ${p.shiny ? '✨' : ''} ${isLapras ? '<<< LAPRAS!' : ''}`);
              console.log(`       UUID: ${p.uuid}`);
            }
          });
        }
      });
      
      console.log(`\n  Total Pokémon en PC: ${totalPokemon}`);
      console.log(`  ¿Tiene Lapras?: ${foundLapras ? 'SÍ' : 'NO'}`);
      
      // Buscar específicamente el Lapras de la transacción
      const laprasUuid = 'c3243349-00cc-4858-9b2b-867de36291ce';
      let foundSpecificLapras = false;
      
      player.pcStorage.forEach((box) => {
        if (box.pokemon) {
          box.pokemon.forEach((p) => {
            if (p && p.uuid === laprasUuid) {
              foundSpecificLapras = true;
              console.log(`\n  ¡ENCONTRADO EL LAPRAS DE LA TRANSACCIÓN!`);
              console.log(`    UUID: ${p.uuid}`);
              console.log(`    Species: ${p.species}`);
              console.log(`    Level: ${p.level}`);
            }
          });
        }
      });
      
      if (!foundSpecificLapras) {
        console.log(`\n  ⚠️ El Lapras de la transacción (UUID: ${laprasUuid}) NO está en el PC`);
      }
      
    } else {
      console.log('  PC vacío');
    }
    
    // También buscar en party
    if (player.pokemonParty) {
      const laprasUuid = 'c3243349-00cc-4858-9b2b-867de36291ce';
      const foundInParty = player.pokemonParty.find(p => p.uuid === laprasUuid);
      if (foundInParty) {
        console.log(`\n  ¡ENCONTRADO EL LAPRAS EN LA PARTY!`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkPlayerPokemon();
