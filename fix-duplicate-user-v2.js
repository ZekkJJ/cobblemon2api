/**
 * Fix Duplicate User Documents V2
 * Handles the case where user data is split between 'users' and 'players' collections
 * Merges everything into the 'users' collection (which is what the plugin uses)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDuplicateUser(minecraftUsername, discordUsername) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('='.repeat(60));
    console.log(`FIXING USER: ${minecraftUsername} / ${discordUsername}`);
    console.log('='.repeat(60));
    
    // Find document in users collection (plugin data)
    const usersDoc = await db.collection('users').findOne({
      minecraftUsername: { $regex: new RegExp(`^${minecraftUsername}$`, 'i') }
    });
    
    // Find document in players collection (Discord/verification data)
    const playersDoc = await db.collection('players').findOne({
      $or: [
        { discordUsername: { $regex: new RegExp(`^${discordUsername}$`, 'i') } },
        { username: { $regex: new RegExp(`^${minecraftUsername}$`, 'i') } }
      ]
    });
    
    console.log('\n📋 USERS COLLECTION DOCUMENT:');
    if (usersDoc) {
      console.log(`   _id: ${usersDoc._id}`);
      console.log(`   minecraftUsername: ${usersDoc.minecraftUsername}`);
      console.log(`   minecraftUuid: ${usersDoc.minecraftUuid}`);
      console.log(`   discordId: ${usersDoc.discordId || 'MISSING'}`);
      console.log(`   cobbleDollars: ${usersDoc.cobbleDollars}`);
      console.log(`   verified: ${usersDoc.verified}`);
      console.log(`   party: ${usersDoc.party?.length || 0} pokemon`);
    } else {
      console.log('   NOT FOUND');
    }
    
    console.log('\n📋 PLAYERS COLLECTION DOCUMENT:');
    if (playersDoc) {
      console.log(`   _id: ${playersDoc._id}`);
      console.log(`   username: ${playersDoc.username}`);
      console.log(`   discordId: ${playersDoc.discordId}`);
      console.log(`   discordUsername: ${playersDoc.discordUsername}`);
      console.log(`   minecraftUuid: ${playersDoc.minecraftUuid}`);
      console.log(`   verified: ${playersDoc.verified}`);
    } else {
      console.log('   NOT FOUND');
    }
    
    if (!usersDoc && !playersDoc) {
      console.log('\n❌ No documents found for this user');
      return;
    }
    
    // Merge data - users collection is the primary (plugin uses it)
    // Add Discord data from players collection
    const mergedData = {
      // Keep all existing users data
      ...(usersDoc || {}),
      
      // Add Discord data from players collection
      discordId: playersDoc?.discordId || usersDoc?.discordId,
      discordUsername: playersDoc?.discordUsername || usersDoc?.discordUsername,
      username: playersDoc?.username || usersDoc?.username || minecraftUsername,
      
      // Ensure Minecraft data is present
      minecraftUuid: usersDoc?.minecraftUuid || playersDoc?.minecraftUuid,
      minecraftUsername: usersDoc?.minecraftUsername || playersDoc?.username || minecraftUsername,
      
      // Mark as verified
      verified: true,
      isMinecraftVerified: true,
      
      // Keep game data from users collection - use max of both fields for safety
      cobbleDollars: Math.max(usersDoc?.cobbleDollars || 0, usersDoc?.cobbleDollarsBalance || 0),
      cobbleDollarsBalance: Math.max(usersDoc?.cobbleDollars || 0, usersDoc?.cobbleDollarsBalance || 0),
      party: usersDoc?.party || [],
      pcStorage: usersDoc?.pcStorage || [],
      hasStarter: usersDoc?.hasStarter || false,
      
      // Update timestamp
      updatedAt: new Date(),
    };
    
    // Remove _id from merged data (MongoDB doesn't allow updating _id)
    delete mergedData._id;
    
    console.log('\n📋 MERGED DATA:');
    console.log(`   discordId: ${mergedData.discordId}`);
    console.log(`   discordUsername: ${mergedData.discordUsername}`);
    console.log(`   minecraftUuid: ${mergedData.minecraftUuid}`);
    console.log(`   minecraftUsername: ${mergedData.minecraftUsername}`);
    console.log(`   cobbleDollars: ${mergedData.cobbleDollars}`);
    console.log(`   verified: ${mergedData.verified}`);
    
    console.log('\n⚠️ This will:');
    if (usersDoc) {
      console.log(`   1. UPDATE users document (${usersDoc._id}) with Discord data`);
    } else {
      console.log(`   1. CREATE new users document with merged data`);
    }
    if (playersDoc) {
      console.log(`   2. UPDATE players document (${playersDoc._id}) with Minecraft data`);
    }
    
    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update or create users document
    if (usersDoc) {
      await db.collection('users').updateOne(
        { _id: usersDoc._id },
        { $set: mergedData }
      );
      console.log('✅ Updated users document with Discord data');
    } else {
      await db.collection('users').insertOne({
        ...mergedData,
        createdAt: new Date()
      });
      console.log('✅ Created new users document with merged data');
    }
    
    // Also update players document to have consistent data
    if (playersDoc) {
      const balance = Math.max(usersDoc?.cobbleDollars || 0, usersDoc?.cobbleDollarsBalance || 0);
      await db.collection('players').updateOne(
        { _id: playersDoc._id },
        { 
          $set: {
            minecraftUsername: mergedData.minecraftUsername,
            cobbleDollars: balance,
            cobbleDollarsBalance: balance,
            verified: true,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Updated players document with Minecraft data');
    }
    
    // Verify the fix
    const fixedUser = await db.collection('users').findOne({ 
      minecraftUsername: { $regex: new RegExp(`^${minecraftUsername}$`, 'i') }
    });
    
    console.log('\n📋 FIXED USER (users collection):');
    console.log(`   _id: ${fixedUser._id}`);
    console.log(`   discordId: ${fixedUser.discordId}`);
    console.log(`   discordUsername: ${fixedUser.discordUsername}`);
    console.log(`   minecraftUuid: ${fixedUser.minecraftUuid}`);
    console.log(`   minecraftUsername: ${fixedUser.minecraftUsername}`);
    console.log(`   cobbleDollars: ${fixedUser.cobbleDollars}`);
    console.log(`   verified: ${fixedUser.verified}`);
    
    console.log('\n✅ USER FIXED SUCCESSFULLY!');
    console.log('   The user should now be able to sync properly.');
    console.log('   Tell them to do /syncnow in-game to verify.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run with command line args
const minecraftName = process.argv[2];
const discordName = process.argv[3];

if (!minecraftName || !discordName) {
  console.log('Usage: node fix-duplicate-user-v2.js <minecraft_username> <discord_username>');
  console.log('Example: node fix-duplicate-user-v2.js isabelamc sandy_queso');
  process.exit(1);
}

fixDuplicateUser(minecraftName, discordName);
