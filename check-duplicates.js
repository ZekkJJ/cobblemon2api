
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const UUID = '25969bf9-0ce7-3046-92df-dcd8c108a4e2';

async function checkDuplicates() {
    if (!MONGODB_URI) return;
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DATABASE || 'admin');
        const users = await db.collection('users').find({ minecraftUuid: UUID }).toArray();

        console.log(`Found ${users.length} users with UUID ${UUID}`);

        users.forEach((user, i) => {
            console.log(`\n--- User ${i + 1} ---`);
            console.log(`ID: ${user._id}`);
            console.log(`Discord ID: ${user.discordId}`);
            console.log(`Username: ${user.minecraftUsername}`);

            const party = (user.pokemonParty || user.party || []).length;
            let pc = 0;
            if (user.pcStorage) {
                user.pcStorage.forEach(b => { if (b && b.pokemon) pc += b.pokemon.filter(p => p).length; });
            }
            console.log(`Pokemon: ${party} in party, ${pc} in PC`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
checkDuplicates();
