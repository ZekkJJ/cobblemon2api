/**
 * Script para forzar actualización del ranking
 * Ejecutar: node force-ranking-refresh.js
 */

const { MongoClient, Decimal128 } = require('mongodb');
require('dotenv').config();

// Función para calcular poder (misma lógica que el servicio)
function calculatePokemonPower(pokemon) {
  const ivs = pokemon.ivs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  const evs = pokemon.evs || { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };

  const ivTotal =
    (ivs.hp || 0) + (ivs.attack || 0) + (ivs.defense || 0) +
    (ivs.spAttack || 0) + (ivs.spDefense || 0) + (ivs.speed || 0);

  const evTotal =
    (evs.hp || 0) + (evs.attack || 0) + (evs.defense || 0) +
    (evs.spAttack || 0) + (evs.spDefense || 0) + (evs.speed || 0);

  const natureMultiplier = getNatureMultiplier(pokemon.nature);
  const shinyBonus = pokemon.shiny ? 1.05 : 1.0;
  const friendshipBonus = (pokemon.friendship || 0) >= 255 ? 1.02 : 1.0;

  const basePower =
    (pokemon.level * 100) +
    (ivTotal * 50) +
    (evTotal * 10) +
    (natureMultiplier * 500);

  return basePower * shinyBonus * friendshipBonus;
}

function getNatureMultiplier(nature) {
  const beneficialNatures = {
    adamant: 1.1, jolly: 1.1, modest: 1.1, timid: 1.1,
    brave: 1.08, quiet: 1.08, impish: 1.05, careful: 1.05,
    bold: 1.05, calm: 1.05, relaxed: 1.03, sassy: 1.03,
  };
  return beneficialNatures[(nature || '').toLowerCase()] || 1.0;
}

async function calculateRanking() {
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

    // Obtener usuarios verificados con username
    const verifiedUsers = await users.find({
      verified: true,
      minecraftUsername: { $exists: true, $ne: '' },
    }).toArray();

    console.log(`Usuarios verificados con username: ${verifiedUsers.length}\n`);

    const rankings = [];

    for (const user of verifiedUsers) {
      // Obtener todos los Pokémon
      const rawPokemon = [
        ...(user.pokemonParty || []),
        ...(user.pcStorage || []).flatMap((box) => box.pokemon || []),
      ];
      
      // Filtrar solo por nivel válido
      const allPokemon = rawPokemon.filter((p) => p && typeof p.level === 'number' && p.level > 0);

      if (allPokemon.length === 0) {
        console.log(`${user.minecraftUsername}: Sin Pokémon válidos`);
        continue;
      }

      // Encontrar el más fuerte
      let strongest = null;
      let highestPower = 0;

      for (const pokemon of allPokemon) {
        const power = calculatePokemonPower(pokemon);
        if (power > highestPower) {
          highestPower = power;
          strongest = pokemon;
        }
      }

      if (strongest) {
        rankings.push({
          username: user.minecraftUsername,
          pokemon: strongest.species,
          level: strongest.level,
          power: Math.round(highestPower),
          hasIvs: !!strongest.ivs,
          hasEvs: !!strongest.evs,
          totalPokemon: allPokemon.length,
        });
      }
    }

    // Ordenar por poder
    rankings.sort((a, b) => b.power - a.power);

    console.log('\n=== RANKING CALCULADO ===\n');
    rankings.forEach((r, i) => {
      console.log(`#${i + 1} ${r.username}`);
      console.log(`   Pokémon: ${r.pokemon} Lv.${r.level}`);
      console.log(`   Poder: ${r.power.toLocaleString()}`);
      console.log(`   IVs: ${r.hasIvs ? 'SÍ' : 'NO'} | EVs: ${r.hasEvs ? 'SÍ' : 'NO'}`);
      console.log(`   Total Pokémon: ${r.totalPokemon}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

calculateRanking();
