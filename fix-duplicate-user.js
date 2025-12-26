/**
 * Fix Duplicate User Documents
 * Merges two separate user documents (one from plugin, one from Discord OAuth)
 * into a single properly linked document
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
    console.log(`FIXING DUPLICATE USER: ${minecraftUsername} / ${discordUsername}`);
    console.log('='.repeat(60));
    
    // Find both documents
    const minecraftDoc = await db.collection('users').findOne({
      minecraftUsername: { $regex: new RegExp(`^${minecraftUsername}$`, 'i') }
    });
    
    const discordDoc = await db.collection('users').findOne({
      $or: [
        { discordUsername: { $regex: new RegExp(`^${discordUsername}$`, 'i') } },
        { username: { $regex: new RegExp(`^${discordUsername}$`, 'i') } }
      ]
    });
    
    if (!minecraftDoc) {
      console.log('❌ Minecraft user document not found');
      return;
    }
    
    if (!discordDoc) {
      console.log('❌ Discord user document not found');
      return;
    }
    
    if (minecraftDoc._id.toString() === discordDoc._id.toString()) {
      console.log('✅ User already has a single document, no merge needed');
      return;
    }
    
    console.log('\n📋 MINECRAFT DOCUMENT:');
    console.log(`   _id: ${minecraftDoc._id}`);
    console.log(`   minecraftUsername: ${minecraftDoc.minecraftUsername}`);
    console.log(`   minecraftUuid: ${minecraftDoc.minecraftUuid}`);
    console.log(`   cobbleDollars: ${minecraftDoc.cobbleDollars}`);
    console.log(`   party: ${minecraftDoc.party?.length || 0} pokemon`);
    console.log(`   pcStorage: ${minecraftDoc.pcStorage?.length || 0} boxes`);
    console.log(`   verified: ${minecraftDoc.verified}`);
    
    console.log('\n📋 DISCORD DOCUMENT:');
    console.log(`   _id: ${discordDoc._id}`);
    console.log(`   discordId: ${discordDoc.discordId}`);
    console.log(`   discordUsername: ${discordDoc.discordUsername || discordDoc.username}`);
    console.log(`   email: ${discordDoc.email}`);
    console.log(`   avatar: ${discordDoc.avatar}`);
    console.log(`   verified: ${discordDoc.verified}`);
    
    // Merge strategy: Keep Discord document as base, add Minecraft data
    const mergedData = {
      // Discord auth data (from Discord doc)
      discordId: discordDoc.discordId,
      discordUsername: discordDoc.discordUsername || discordDoc.username,
      username: discordDoc.username,
      email: discordDoc.email,
      avatar: discordDoc.avatar,
      
      // Minecraft data (from Minecraft doc)
      minecraftUuid: minecraftDoc.minecraftUuid,
      minecraftUsername: minecraftDoc.minecraftUsername,
      
      // Game data (from Minecraft doc - this is the important stuff)
      cobbleDollars: Math.max(minecraftDoc.cobbleDollars || 0, discordDoc.cobbleDollars || 0),
      cobbleDollarsBalance: Math.max(minecraftDoc.cobbleDollarsBalance || 0, discordDoc.cobbleDollarsBalance || 0),
      party: minecraftDoc.party || discordDoc.party || [],
      pcStorage: minecraftDoc.pcStorage || discordDoc.pcStorage || [],
      hasStarter: minecraftDoc.hasStarter || discordDoc.hasStarter || false,
      starterPokemon: minecraftDoc.starterPokemon || discordDoc.starterPokemon,
      badges: Math.max(minecraftDoc.badges || 0, discordDoc.badges || 0),
      playtime: Math.max(minecraftDoc.playtime || 0, discordDoc.playtime || 0),
      
      // Position data
      x: minecraftDoc.x,
      y: minecraftDoc.y,
      z: minecraftDoc.z,
      world: minecraftDoc.world,
      
      // Status
      online: minecraftDoc.online || false,
      verified: true, // Mark as verified since we're linking them
      isMinecraftVerified: true,
      
      // Timestamps
      createdAt: discordDoc.createdAt || minecraftDoc.createdAt,
      updatedAt: new Date(),
      lastSeen: minecraftDoc.lastSeen || discordDoc.lastSeen,
    };
    
    console.log('\n📋 MERGED DATA:');
    console.log(`   discordId: ${mergedData.discordId}`);
    console.log(`   discordUsername: ${mergedData.discordUsername}`);
    console.log(`   minecraftUuid: ${mergedData.minecraftUuid}`);
    console.log(`   minecraftUsername: ${mergedData.minecraftUsername}`);
    console.log(`   cobbleDollars: ${mergedData.cobbleDollars}`);
    console.log(`   verified: ${mergedData.verified}`);
    
    // Confirm before proceeding
    console.log('\n⚠️ This will:');
    console.log(`   1. Update Discord document (${discordDoc._id}) with merged data`);
    console.log(`   2. DELETE Minecraft document (${minecraftDoc._id})`);
    console.log('\nProceeding in 3 seconds... (Ctrl+C to cancel)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update Discord document with merged data
    await db.collection('users').updateOne(
      { _id: discordDoc._id },
      { $set: mergedData }
    );
    console.log('✅ Updated Discord document with merged data');
    
    // Delete the Minecraft-only document
    await db.collection('users').deleteOne({ _id: minecraftDoc._id });
    console.log('✅ Deleted duplicate Minecraft document');
    
    // Verify the fix
    const fixedUser = await db.collection('users').findOne({ _id: discordDoc._id });
    console.log('\n📋 FIXED USER:');
    console.log(`   _id: ${fixedUser._id}`);
    console.log(`   discordId: ${fixedUser.discordId}`);
    console.log(`   discordUsername: ${fixedUser.discordUsername}`);
    console.log(`   minecraftUuid: ${fixedUser.minecraftUuid}`);
    console.log(`   minecraftUsername: ${fixedUser.minecraftUsername}`);
    console.log(`   cobbleDollars: ${fixedUser.cobbleDollars}`);
    console.log(`   verified: ${fixedUser.verified}`);
    
    console.log('\n✅ USER FIXED SUCCESSFULLY!');
    console.log('   The user should now be able to sync properly.');
    
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
  console.log('Usage: node fix-duplicate-user.js <minecraft_username> <discord_username>');
  console.log('Example: node fix-duplicate-user.js isabelamc sandy_queso');
  process.exit(1);
}

fixDuplicateUser(minecraftName, discordName);
