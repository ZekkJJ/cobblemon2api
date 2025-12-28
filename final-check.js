
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DISCORD_ID = '1086438984139415552';

async function finalCheck() {
    if (!MONGODB_URI) return;
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DATABASE || 'admin');
        const user = await db.collection('users').findOne({ discordId: DISCORD_ID });

        if (user) {
            console.log('Starter:', user.starter ? JSON.stringify(user.starter) : 'None');
            console.log('All Keys:', Object.keys(user).join(', '));
        }

        // Check Gacha Rewards collection
        const gachaReward = await db.collection('gacha_rewards')?.find({ discordId: DISCORD_ID }).toArray();
        if (gachaReward && gachaReward.length > 0) {
            console.log('Gacha Rewards found:', gachaReward.length);
        }

        // Check if there are other users with same minecraftUuid
        const otherUsers = await db.collection('users').find({ minecraftUuid: user.minecraftUuid }).toArray();
        if (otherUsers.length > 1) {
            console.log('Duplicate accounts found for UUID:', otherUsers.length);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
finalCheck();
