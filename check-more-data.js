
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '856180702373216296';

async function checkMoreData() {
    if (!MONGODB_URI) return;
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const dbName = process.env.MONGODB_DATABASE || 'admin';
        const db = client.db(dbName);

        // Find user by discordId
        const user = await db.collection('users').findOne({ discordId: DISCORD_ID });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('=== USER INFO ===');
        console.log(`Username: ${user.minecraftUsername}`);
        console.log(`UUID: ${user.minecraftUuid}`);
        console.log(`Balance: ${user.cobbleDollars || 0} CD`);

        // PC Storage check
        if (user.pcStorage) {
            console.log(`PC Storage Boxes: ${user.pcStorage.length}`);
        }

        // List all pokemon
        const allPkmn = [];
        if (user.pokemonParty) allPkmn.push(...user.pokemonParty.map(p => ({ ...p, loc: 'Party' })));
        if (user.party) allPkmn.push(...user.party.map(p => ({ ...p, loc: 'Party' })));
        if (user.pcStorage) {
            user.pcStorage.forEach((box, idx) => {
                if (box && box.pokemon) {
                    allPkmn.push(...box.pokemon.filter(p => p).map(p => ({ ...p, loc: `Box ${idx + 1}` })));
                }
            });
        }

        console.log(`\nTotal Pokémon found: ${allPkmn.length}`);

        // Check for Legendaries (Specific names or tags)
        const legendaryNames = [
            'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
            'raikou', 'entei', 'suicune', 'lugia', 'ho-oh', 'celebi',
            'regirock', 'regice', 'registeel', 'latias', 'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
            'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
            'victini', 'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem', 'keldeo', 'meloetta', 'genesect',
            'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
            'type: null', 'silvally', 'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela', 'kartana', 'guzzlord', 'necrozma', 'magearna', 'marshadow', 'poipole', 'naganadel', 'stakataka', 'blacephalon', 'zeraora', 'meltan', 'melmetal',
            'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'zarude', 'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex', 'enamorus',
            'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu', 'koraidon', 'miraidon', 'walking wake', 'iron leaves', 'okidogi', 'munkidori', 'fezandipiti', 'ogerpon', 'terapagos', 'pecharunt'
        ];

        const foundBySpec = allPkmn.filter(p =>
            p.isLegendary ||
            p.isMythical ||
            p.rarity === 'legendary' ||
            p.rarity === 'mythical' ||
            (p.species && legendaryNames.includes(p.species.toLowerCase()))
        );

        if (foundBySpec.length > 0) {
            console.log('\n=== LEGENDARIES FOUND ===');
            foundBySpec.forEach(p => {
                console.log(`- ${p.species} Lv.${p.level} (${p.loc})`);
            });
        } else {
            console.log('\nNo legendaries found (0).');
        }

        // Check for "special" looking ones
        const weirdOnes = allPkmn.filter(p => p.species && (p.species.includes('wor') || p.species.includes('nag') || p.species.includes('got')));
        if (weirdOnes.length > 0) {
            console.log('\n=== POTENTIAL CUSTOM/MODDED POKEMON ===');
            weirdOnes.forEach(p => {
                console.log(`- ${p.species} Lv.${p.level} (${p.loc})`);
            });
        }

        // Check for Gacha rewards
        const gachaPending = await db.collection('gacha_pending_syncs')?.find({ discordId: DISCORD_ID }).toArray();
        if (gachaPending && gachaPending.length > 0) {
            console.log('\n=== PENDING GACHA REWARDS ===');
            gachaPending.forEach(p => console.log(`- ${p.pokemon?.species || p.rewardName} (Status: ${p.status})`));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkMoreData();
