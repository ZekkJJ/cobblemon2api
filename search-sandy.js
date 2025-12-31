require('dotenv').config();
const { MongoClient } = require('mongodb');

async function search() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'admin');
  
  // Search for Sandy by name
  const users = await db.collection('users').find({
    $or: [
      { minecraftUsername: { $regex: /sandy/i } },
      { discordUsername: { $regex: /sandy/i } }
    ]
  }).toArray();
  
  console.log('Found', users.length, 'users matching Sandy:');
  users.forEach(u => {
    console.log('---');
    console.log('_id:', u._id.toString());
    console.log('Discord ID:', u.discordId);
    console.log('Discord Username:', u.discordUsername);
    console.log('Minecraft UUID:', u.minecraftUuid);
    console.log('Minecraft Username:', u.minecraftUsername);
    console.log('cobbleDollars:', u.cobbleDollars);
    console.log('verified:', u.verified);
    console.log('online:', u.online);
  });
  
  await client.close();
}
search();
