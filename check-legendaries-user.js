/**
 * Check for legendary Pokemon in a user's party and PC
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';
const DISCORD_ID = '811708046446952469';

// Lista de Pokemon legendarios/míticos
const LEGENDARIES = new Set([
  // Gen 1
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  // Gen 2
  'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'celebi',
  // Gen 3
  'regirock', 'regice', 'registeel', 'latias', 'latios',
  'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
  // Gen 4
  'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran',
  'regigigas', 'giratina', 'cresselia', 'phione', 'manaphy',
  'darkrai', 'shaymin', 'arceus',
  // Gen 5
  'victini', 'cobalion', 'terrakion', 'virizion', 'tornadus',
  'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem',
  'keldeo', 'meloetta', 'genesect',
  // Gen 6
  'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
  // Gen 7
  'typenull', 'silvally', 'tapukoko', 'tapulele', 'tapubulu', 'tapufini',
  'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'nihilego', 'buzzwole',
  'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord',
  'necrozma', 'magearna', 'marshadow', 'poipole', 'naganadel',
  'stakataka', 'blacephalon', 'zeraora',
  // Gen 8
  'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu',
  'zarude', 'regieleki', 'regidrago', 'glastrier', 'spectrier',
  'calyrex',
  // Gen 9
  'koraidon', 'miraidon', 'tinglu', 'chienpao', 'wochien', 'chiyu',
  'roaringmoon', 'ironvaliant', 'walkingwake', 'ironleaves'
]);

function isLegendary(species) {
  return LEGENDARIES.has(species.toLowerCase().replace(/[^a-z]/g, ''));
}

async function checkUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Buscar usuario por Discord ID
    const user = await users.findOne({ discordId: DISCORD_ID });
    
    if (!user) {
      console.log('❌ Usuario no encontrado con Discord ID:', DISCORD_ID);
      return;
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('USUARIO ENCONTRADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Username:', user.username);
    console.log('Discord ID:', user.discordId);
    console.log('Minecraft UUID:', user.minecraftUuid);
    console.log('Balance:', user.balance || user.cobbleDollarsBalance || 0);
    console.log('');
    
    // Revisar Party
    console.log('═══════════════════════════════════════════════════════');
    console.log('PARTY');
    console.log('═══════════════════════════════════════════════════════');
    
    const party = user.party || [];
    let legendariesInParty = [];
    
    if (party.length === 0) {
      console.log('(vacío)');
    } else {
      party.forEach((pokemon, i) => {
        const species = pokemon.species || pokemon.name || 'Unknown';
        const level = pokemon.level || '?';
        const isLeg = isLegendary(species);
        const marker = isLeg ? '⚠️ LEGENDARIO' : '';
        
        console.log(`  ${i + 1}. ${species} Lv.${level} ${marker}`);
        
        if (isLeg) {
          legendariesInParty.push({ species, level, location: 'Party', slot: i });
        }
      });
    }
    
    // Revisar PC
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('PC STORAGE');
    console.log('═══════════════════════════════════════════════════════');
    
    const pcStorage = user.pcStorage || [];
    let legendariesInPC = [];
    let totalPCPokemon = 0;
    
    if (pcStorage.length === 0) {
      console.log('(vacío)');
    } else {
      pcStorage.forEach((box, boxIndex) => {
        const pokemonInBox = box.pokemon || [];
        if (pokemonInBox.length > 0) {
          console.log(`\n  📦 Box ${boxIndex + 1}:`);
          pokemonInBox.forEach((pokemon, slotIndex) => {
            const species = pokemon.species || pokemon.name || 'Unknown';
            const level = pokemon.level || '?';
            const isLeg = isLegendary(species);
            const marker = isLeg ? '⚠️ LEGENDARIO' : '';
            
            console.log(`    - ${species} Lv.${level} ${marker}`);
            totalPCPokemon++;
            
            if (isLeg) {
              legendariesInPC.push({ species, level, location: `PC Box ${boxIndex + 1}`, slot: slotIndex });
            }
          });
        }
      });
    }
    
    console.log(`\n  Total Pokemon en PC: ${totalPCPokemon}`);
    
    // Resumen de legendarios
    const allLegendaries = [...legendariesInParty, ...legendariesInPC];
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RESUMEN DE LEGENDARIOS');
    console.log('═══════════════════════════════════════════════════════');
    
    if (allLegendaries.length === 0) {
      console.log('✅ No se encontraron Pokemon legendarios/míticos');
    } else {
      console.log(`⚠️ ENCONTRADOS ${allLegendaries.length} LEGENDARIOS:\n`);
      allLegendaries.forEach((leg, i) => {
        console.log(`  ${i + 1}. ${leg.species} Lv.${leg.level} - ${leg.location}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUser();
