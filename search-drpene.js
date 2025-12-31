require('dotenv').config();
const { MongoClient } = require('mongodb');

async function search() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'admin');
  
  // Search for DrPENE by name
  const users = await db.collection('users').find({
    $or: [
      { minecraftUsername: { $regex: /drpene/i } },
      { discordUsername: { $regex: /drpene/i } }
    ]
  }).toArray();
  
  console.log('Found', users.length, 'users matching DrPENE:');
  users.forEach(u => {
    console.log('---');
    console.log('_id:', u._id.toString());
    console.log('Discord ID:', u.discordId);
    console.log('Discord Username:', u.discordUsername);
    console.log('Minecraft UUID:', u.minecraftUuid);
    console.log('Minecraft Username:', u.minecraftUsername);
    console.log('cobbleDollars:', u.cobbleDollars);
    console.log('cobbleDollarsBalance:', u.cobbleDollarsBalance);
    console.log('verified:', u.verified);
    console.log('online:', u.online);
    console.log('lastEconomyUpdate:', u.lastEconomyUpdate);
    console.log('updatedAt:', u.updatedAt);
  });
  
  // Also search by the Discord ID 811708046446952469 (Sandy's ID) to see if DrPENE is linked
  console.log('\n=== Checking if DrPENE is linked to Sandy Discord ID ===');
  const sandyUser = await db.collection('users').findOne({ discordId: '811708046446952469' });
  if (sandyUser) {
    console.log('Sandy/DrPENE record:');
    console.log('Discord Username:', sandyUser.discordUsername);
    console.log('Minecraft Username:', sandyUser.minecraftUsername);
    console.log('cobbleDollars:', sandyUser.cobbleDollars);
  }
  
  await client.close();
}
search();
