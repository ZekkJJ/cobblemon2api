/**
 * Debug User Verification Status
 * Investigates users who appear verified in-game but not on web
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function debugUser(minecraftUsername, discordUsername) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('='.repeat(60));
    console.log(`DEBUGGING USER: ${minecraftUsername} / ${discordUsername}`);
    console.log('='.repeat(60));
    
    // 1. Search in USERS collection by Minecraft username
    console.log('\n📋 SEARCHING IN "users" COLLECTION BY MINECRAFT USERNAME...');
    const byMinecraftUsers = await db.collection('users').find({
      minecraftUsername: { $regex: new RegExp(minecraftUsername, 'i') }
    }).toArray();
    
    if (byMinecraftUsers.length > 0) {
      console.log(`Found ${byMinecraftUsers.length} in users collection:`);
      byMinecraftUsers.forEach((u, i) => {
        console.log(`\n  [${i + 1}] Document ID: ${u._id}`);
        console.log(`      minecraftUsername: ${u.minecraftUsername}`);
        console.log(`      minecraftUuid: ${u.minecraftUuid}`);
        console.log(`      discordId: ${u.discordId}`);
        console.log(`      discordUsername: ${u.discordUsername}`);
        console.log(`      verified: ${u.verified}`);
        console.log(`      cobbleDollars: ${u.cobbleDollars}`);
      });
    } else {
      console.log('  No users found');
    }
    
    // 2. Search in PLAYERS collection by Minecraft username
    console.log('\n📋 SEARCHING IN "players" COLLECTION BY MINECRAFT USERNAME...');
    const byMinecraftPlayers = await db.collection('players').find({
      $or: [
        { minecraftUsername: { $regex: new RegExp(minecraftUsername, 'i') } },
        { username: { $regex: new RegExp(minecraftUsername, 'i') } }
      ]
    }).toArray();
    
    if (byMinecraftPlayers.length > 0) {
      console.log(`Found ${byMinecraftPlayers.length} in players collection:`);
      byMinecraftPlayers.forEach((u, i) => {
        console.log(`\n  [${i + 1}] Document ID: ${u._id}`);
        console.log(`      username: ${u.username}`);
        console.log(`      minecraftUsername: ${u.minecraftUsername}`);
        console.log(`      minecraftUuid: ${u.minecraftUuid}`);
        console.log(`      discordId: ${u.discordId}`);
        console.log(`      discordUsername: ${u.discordUsername}`);
        console.log(`      verified: ${u.verified}`);
        console.log(`      cobbleDollars: ${u.cobbleDollars}`);
      });
    } else {
      console.log('  No players found');
    }
    
    // 3. Search in USERS collection by Discord username
    console.log('\n📋 SEARCHING IN "users" COLLECTION BY DISCORD USERNAME...');
    const byDiscordUsers = await db.collection('users').find({
      $or: [
        { discordUsername: { $regex: new RegExp(discordUsername, 'i') } },
        { username: { $regex: new RegExp(discordUsername, 'i') } }
      ]
    }).toArray();
    
    if (byDiscordUsers.length > 0) {
      console.log(`Found ${byDiscordUsers.length} in users collection:`);
      byDiscordUsers.forEach((u, i) => {
        console.log(`\n  [${i + 1}] Document ID: ${u._id}`);
        console.log(`      username: ${u.username}`);
        console.log(`      discordUsername: ${u.discordUsername}`);
        console.log(`      discordId: ${u.discordId}`);
        console.log(`      minecraftUsername: ${u.minecraftUsername}`);
        console.log(`      minecraftUuid: ${u.minecraftUuid}`);
        console.log(`      verified: ${u.verified}`);
      });
    } else {
      console.log('  No users found');
    }
    
    // 4. Search in PLAYERS collection by Discord username
    console.log('\n📋 SEARCHING IN "players" COLLECTION BY DISCORD USERNAME...');
    const byDiscordPlayers = await db.collection('players').find({
      $or: [
        { discordUsername: { $regex: new RegExp(discordUsername, 'i') } },
        { username: { $regex: new RegExp(discordUsername, 'i') } }
      ]
    }).toArray();
    
    if (byDiscordPlayers.length > 0) {
      console.log(`Found ${byDiscordPlayers.length} in players collection:`);
      byDiscordPlayers.forEach((u, i) => {
        console.log(`\n  [${i + 1}] Document ID: ${u._id}`);
        console.log(`      username: ${u.username}`);
        console.log(`      discordUsername: ${u.discordUsername}`);
        console.log(`      discordId: ${u.discordId}`);
        console.log(`      minecraftUsername: ${u.minecraftUsername}`);
        console.log(`      minecraftUuid: ${u.minecraftUuid}`);
        console.log(`      verified: ${u.verified}`);
      });
    } else {
      console.log('  No players found');
    }
    
    // Combine results for analysis
    const byMinecraft = [...byMinecraftUsers, ...byMinecraftPlayers];
    const byDiscord = [...byDiscordUsers, ...byDiscordPlayers];
    
    if (byDiscord.length > 0) {
      console.log(`Found ${byDiscord.length} user(s) by Discord name:`);
      byDiscord.forEach((u, i) => {
        console.log(`\n  [${i + 1}] Document ID: ${u._id}`);
        console.log(`      username: ${u.username}`);
        console.log(`      discordUsername: ${u.discordUsername}`);
        console.log(`      discordId: ${u.discordId}`);
        console.log(`      minecraftUsername: ${u.minecraftUsername}`);
        console.log(`      minecraftUuid: ${u.minecraftUuid}`);
        console.log(`      verified: ${u.verified}`);
        console.log(`      isMinecraftVerified: ${u.isMinecraftVerified}`);
        console.log(`      cobbleDollars: ${u.cobbleDollars}`);
        console.log(`      cobbleDollarsBalance: ${u.cobbleDollarsBalance}`);
      });
    } else {
      console.log('  No users found by Discord username');
    }
    
    // 5. Check verification_codes collection
    console.log('\n📋 CHECKING VERIFICATION CODES...');
    const verificationCodes = await db.collection('verification_codes').find({
      $or: [
        { minecraftUsername: { $regex: new RegExp(minecraftUsername, 'i') } },
        { discordUsername: { $regex: new RegExp(discordUsername, 'i') } }
      ]
    }).toArray();
    
    if (verificationCodes.length > 0) {
      console.log(`Found ${verificationCodes.length} verification code(s):`);
      verificationCodes.forEach((v, i) => {
        console.log(`\n  [${i + 1}] Code: ${v.code}`);
        console.log(`      minecraftUuid: ${v.minecraftUuid}`);
        console.log(`      minecraftUsername: ${v.minecraftUsername}`);
        console.log(`      discordId: ${v.discordId}`);
        console.log(`      discordUsername: ${v.discordUsername}`);
        console.log(`      used: ${v.used}`);
        console.log(`      createdAt: ${v.createdAt}`);
        console.log(`      expiresAt: ${v.expiresAt}`);
      });
    } else {
      console.log('  No verification codes found');
    }
    
    // 6. Check for duplicate documents
    console.log('\n📋 CHECKING FOR DUPLICATES...');
    
    // Get all unique minecraft UUIDs from found users
    const allUsers = [...byMinecraft, ...byDiscord];
    const uniqueUuids = [...new Set(allUsers.filter(u => u.minecraftUuid).map(u => u.minecraftUuid))];
    const uniqueDiscordIds = [...new Set(allUsers.filter(u => u.discordId).map(u => u.discordId))];
    
    for (const uuid of uniqueUuids) {
      const duplicates = await db.collection('users').find({ minecraftUuid: uuid }).toArray();
      if (duplicates.length > 1) {
        console.log(`\n  ⚠️ DUPLICATE MINECRAFT UUID: ${uuid}`);
        console.log(`     Found in ${duplicates.length} documents!`);
        duplicates.forEach(d => {
          console.log(`     - ${d._id}: ${d.minecraftUsername} / ${d.discordUsername}`);
        });
      }
    }
    
    for (const discordId of uniqueDiscordIds) {
      const duplicates = await db.collection('users').find({ discordId }).toArray();
      if (duplicates.length > 1) {
        console.log(`\n  ⚠️ DUPLICATE DISCORD ID: ${discordId}`);
        console.log(`     Found in ${duplicates.length} documents!`);
        duplicates.forEach(d => {
          console.log(`     - ${d._id}: ${d.minecraftUsername} / ${d.discordUsername}`);
        });
      }
    }
    
    // 7. Analysis
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS:');
    console.log('='.repeat(60));
    
    const minecraftDoc = byMinecraft[0];
    const discordDoc = byDiscord[0];
    
    if (minecraftDoc && discordDoc && minecraftDoc._id.toString() !== discordDoc._id.toString()) {
      console.log('\n⚠️ PROBLEM DETECTED: User has TWO SEPARATE documents!');
      console.log('   - One created by plugin sync (Minecraft data)');
      console.log('   - One created by Discord OAuth (Discord data)');
      console.log('   These need to be MERGED.');
      console.log('\n   SOLUTION: Merge the documents, keeping Discord auth data');
      console.log(`   and Minecraft game data in a single document.`);
      
      // Show merge command
      console.log('\n   To fix, run:');
      console.log(`   node backend/fix-duplicate-user.js "${minecraftUsername}" "${discordUsername}"`);
    } else if (minecraftDoc && !minecraftDoc.discordId) {
      console.log('\n⚠️ PROBLEM: Minecraft user exists but has no Discord link');
      console.log('   The user needs to verify via Discord.');
    } else if (discordDoc && !discordDoc.minecraftUuid) {
      console.log('\n⚠️ PROBLEM: Discord user exists but has no Minecraft link');
      console.log('   The user needs to verify in-game with /verify <code>');
    } else if (!minecraftDoc && !discordDoc) {
      console.log('\n❌ No user found with either username');
    } else {
      console.log('\n✅ User appears to be properly linked');
      const user = minecraftDoc || discordDoc;
      console.log(`   Document ID: ${user._id}`);
      console.log(`   Minecraft: ${user.minecraftUsername} (${user.minecraftUuid})`);
      console.log(`   Discord: ${user.discordUsername} (${user.discordId})`);
      console.log(`   Verified: ${user.verified}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Run with command line args or defaults
const minecraftName = process.argv[2] || 'isabelamc';
const discordName = process.argv[3] || 'sandy_queso';

debugUser(minecraftName, discordName);
