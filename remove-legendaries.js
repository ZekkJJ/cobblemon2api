/**
 * Script para escanear y eliminar Pokémon Legendarios/Míticos/Ultra Bestias
 * de la party y PC de TODOS los jugadores
 * 
 * Uso: node remove-legendaries.js [--dry-run]
 * 
 * --dry-run: Solo muestra qué se eliminaría sin hacer cambios
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');

// SOLO Box Legendaries - los de portada de juegos (NO míticos, NO sub-legendarios)
const BANNED_POKEMON = new Set([
  // Gen 1
  'mewtwo',
  
  // Gen 2
  'lugia', 'hooh',
  
  // Gen 3
  'kyogre', 'groudon', 'rayquaza',
  
  // Gen 4
  'dialga', 'palkia', 'giratina',
  
  // Gen 5
  'reshiram', 'zekrom', 'kyurem',
  'kyuremblack', 'kyuremwhite',
  
  // Gen 6
  'xerneas', 'yveltal', 'zygarde',
  'zygarde10', 'zygardecomplete',
  
  // Gen 7
  'solgaleo', 'lunala', 'necrozma',
  'necrozmaduskmane', 'necrozmadawnwings', 'necrozmaultra',
  
  // Gen 8
  'zacian', 'zamazenta', 'eternatus', 'calyrex',
  'zaciancrowned', 'zamazentacrowned',
  'calyrexicerider', 'calyrexshadowrider',
  
  // Gen 9
  'koraidon', 'miraidon', 'terapagos',
]);

function normalizeSpecies(species) {
  if (!species) return '';
  return species.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('type:null', 'typenull');
}

function isBanned(pokemon) {
  if (!pokemon || !pokemon.species) return false;
  const normalized = normalizeSpecies(pokemon.species);
  return BANNED_POKEMON.has(normalized);
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 ESCÁNER DE LEGENDARIOS - Cobblemon Los Pitufos');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('⚠️  MODO DRY-RUN: No se harán cambios reales\n');
  } else {
    console.log('🚨 MODO REAL: Se eliminarán los Pokémon encontrados\n');
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB\n');
    
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`📊 Total de jugadores: ${users.length}\n`);
    
    let totalRemoved = 0;
    let playersAffected = 0;
    const removedLog = [];
    
    for (const user of users) {
      const username = user.minecraftUsername || user.discordUsername || 'Unknown';
      const uuid = user.minecraftUuid || user._id.toString();
      
      let partyRemoved = [];
      let pcRemoved = [];
      
      // Escanear Party
      if (user.party && Array.isArray(user.party)) {
        const originalPartyLength = user.party.length;
        const bannedInParty = user.party.filter(p => isBanned(p));
        
        if (bannedInParty.length > 0) {
          partyRemoved = bannedInParty.map(p => ({
            species: p.species,
            level: p.level,
            shiny: p.shiny,
            location: 'party'
          }));
        }
      }
      
      // Escanear PC Storage (estructura de boxes: [{boxNumber, pokemon: [...]}])
      if (user.pcStorage && Array.isArray(user.pcStorage)) {
        for (const box of user.pcStorage) {
          if (box && box.pokemon && Array.isArray(box.pokemon)) {
            const bannedInBox = box.pokemon.filter(p => isBanned(p));
            if (bannedInBox.length > 0) {
              pcRemoved.push(...bannedInBox.map(p => ({
                species: p.species,
                level: p.level,
                shiny: p.shiny,
                location: `pc (Box ${box.boxNumber})`
              })));
            }
          }
        }
      }
      
      const totalForPlayer = partyRemoved.length + pcRemoved.length;
      
      if (totalForPlayer > 0) {
        playersAffected++;
        totalRemoved += totalForPlayer;
        
        console.log(`\n👤 ${username} (${uuid})`);
        console.log(`   Party: ${partyRemoved.length} legendarios`);
        console.log(`   PC: ${pcRemoved.length} legendarios`);
        
        [...partyRemoved, ...pcRemoved].forEach(p => {
          const shinyTag = p.shiny ? '✨' : '';
          console.log(`   - ${shinyTag}${p.species} Lv.${p.level} (${p.location})`);
          removedLog.push({
            player: username,
            uuid,
            ...p
          });
        });
        
        // Aplicar cambios si no es dry-run
        if (!DRY_RUN) {
          const newParty = (user.party || []).filter(p => !isBanned(p));
          
          // Filtrar pokemon de cada box en pcStorage
          const newPC = (user.pcStorage || []).map(box => {
            if (box && box.pokemon && Array.isArray(box.pokemon)) {
              return {
                ...box,
                pokemon: box.pokemon.filter(p => !isBanned(p))
              };
            }
            return box;
          });
          
          await db.collection('users').updateOne(
            { _id: user._id },
            { 
              $set: { 
                party: newParty,
                pcStorage: newPC,
                lastLegendaryPurge: new Date()
              }
            }
          );
          console.log(`   ✅ Eliminados!`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`Jugadores escaneados: ${users.length}`);
    console.log(`Jugadores afectados: ${playersAffected}`);
    console.log(`Total legendarios ${DRY_RUN ? 'encontrados' : 'eliminados'}: ${totalRemoved}`);
    
    if (removedLog.length > 0) {
      console.log('\n📋 LISTA COMPLETA:');
      removedLog.forEach((entry, i) => {
        const shinyTag = entry.shiny ? '✨' : '';
        console.log(`${i + 1}. ${entry.player}: ${shinyTag}${entry.species} Lv.${entry.level} (${entry.location})`);
      });
    }
    
    if (DRY_RUN && totalRemoved > 0) {
      console.log('\n⚠️  Para eliminar estos Pokémon, ejecuta sin --dry-run:');
      console.log('   node remove-legendaries.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Conexión cerrada');
  }
}

main();
