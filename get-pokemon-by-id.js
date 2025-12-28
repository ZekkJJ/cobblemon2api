
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '856180702373216296';

async function getPokemon() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not found in environment');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const dbName = process.env.MONGODB_DATABASE || 'admin';
        const db = client.db(dbName);

        // Find user by discordId
        const user = await db.collection('users').findOne({ discordId: DISCORD_ID });

        if (!user) {
            console.log(`User with Discord ID ${DISCORD_ID} not found.`);
            return;
        }

        console.log(`\n=== POKEMON FOR ${user.minecraftUsername || 'Unknown User'} (${DISCORD_ID}) ===`);
        console.log(`Minecraft UUID: ${user.minecraftUuid || 'Not set'}`);

        // Check party/pokemonParty
        const party = user.pokemonParty || user.party || [];
        console.log(`\n--- Party (${party.length} Pokémon) ---`);
        if (party.length > 0) {
            party.forEach((p, i) => {
                if (p) {
                    const gender = p.gender === 'MALE' ? '♂️' : (p.gender === 'FEMALE' ? '♀️' : '');
                    console.log(`${i + 1}. ${p.species || p.name || 'Unknown'} Lv.${p.level || '?'} ${p.shiny ? '✨' : ''} ${gender}`);
                    if (p.nature) console.log(`   Nature: ${p.nature}`);
                    if (p.ability) console.log(`   Ability: ${p.ability}`);
                }
            });
        } else {
            console.log('   Empty');
        }

        // Check PC Storage
        console.log(`\n--- PC Storage ---`);
        if (user.pcStorage && user.pcStorage.length > 0) {
            let totalInPc = 0;
            user.pcStorage.forEach((box, boxIndex) => {
                if (box && box.pokemon && box.pokemon.length > 0) {
                    const boxPokemon = box.pokemon.filter(p => p);
                    if (boxPokemon.length > 0) {
                        console.log(`\n  Box ${boxIndex + 1}: ${box.name || 'Unnamed'}`);
                        boxPokemon.forEach((p, i) => {
                            totalInPc++;
                            const gender = p.gender === 'MALE' ? '♂️' : (p.gender === 'FEMALE' ? '♀️' : '');
                            console.log(`    - ${p.species || p.name || 'Unknown'} Lv.${p.level || '?'} ${p.shiny ? '✨' : ''} ${gender}`);
                        });
                    }
                }
            });
            console.log(`\nTotal Pokémon in PC: ${totalInPc}`);
        } else {
            console.log('   Empty or not synced');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

getPokemon();
