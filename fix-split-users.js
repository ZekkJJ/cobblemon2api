/**
 * Fix split user records - merge Discord and Minecraft records
 * Run: node fix-split-users.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixSplitUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    
    // ============================================
    // FIX CONOAMARILLO
    // ============================================
    console.log('=== FIXING CONOAMARILLO ===');
    
    // Get Discord record
    const conoDiscord = await db.collection('users').findOne({ discordId: '1160232662825447506' });
    
    // Get Minecraft record
    const conoMinecraft = await db.collection('users').findOne({ 
      minecraftUsername: { $regex: /conoamarillo/i },
      minecraftUuid: { $exists: true }
    });
    
    if (conoDiscord && conoMinecraft && conoDiscord._id.toString() !== conoMinecraft._id.toString()) {
      console.log('Found split records for ConoamarilloHD');
      console.log('Discord record ID:', conoDiscord._id);
      console.log('Minecraft record ID:', conoMinecraft._id);
      console.log('Minecraft balance:', conoMinecraft.cobbleDollars);
      
      // Merge: Update Discord record with Minecraft data
      await db.collection('users').updateOne(
        { _id: conoDiscord._id },
        {
          $set: {
            minecraftUuid: conoMinecraft.minecraftUuid,
            minecraftUsername: conoMinecraft.minecraftUsername,
            cobbleDollars: conoMinecraft.cobbleDollars || 0,
            cobbleDollarsBalance: conoMinecraft.cobbleDollars || 0,
            isMinecraftVerified: true,
            verifiedAt: new Date(),
            // Copy any other relevant fields
            party: conoMinecraft.party,
            pc: conoMinecraft.pc,
            pokedex: conoMinecraft.pokedex,
          }
        }
      );
      
      // Delete the orphan Minecraft record
      await db.collection('users').deleteOne({ _id: conoMinecraft._id });
      
      console.log('✅ Merged ConoamarilloHD records');
      console.log('   New balance:', conoMinecraft.cobbleDollars);
    } else if (!conoMinecraft) {
      console.log('No Minecraft record found for ConoamarilloHD');
    } else {
      console.log('Records already merged or same record');
    }
    
    // ============================================
    // FIX LECHUGA
    // ============================================
    console.log('\n=== FIXING LECHUGA ===');
    
    // Get Discord record
    const lechugaDiscord = await db.collection('users').findOne({ discordId: '1332096073392459894' });
    
    // Get Minecraft record
    const lechugaMinecraft = await db.collection('users').findOne({ 
      minecraftUsername: { $regex: /lechuga/i },
      minecraftUuid: { $exists: true }
    });
    
    if (lechugaDiscord && lechugaMinecraft && lechugaDiscord._id.toString() !== lechugaMinecraft._id.toString()) {
      console.log('Found split records for Lechuga');
      console.log('Discord record ID:', lechugaDiscord._id);
      console.log('Minecraft record ID:', lechugaMinecraft._id);
      console.log('Minecraft balance:', lechugaMinecraft.cobbleDollars);
      
      // Merge: Update Discord record with Minecraft data
      await db.collection('users').updateOne(
        { _id: lechugaDiscord._id },
        {
          $set: {
            minecraftUuid: lechugaMinecraft.minecraftUuid,
            minecraftUsername: lechugaMinecraft.minecraftUsername,
            cobbleDollars: lechugaMinecraft.cobbleDollars || 0,
            cobbleDollarsBalance: lechugaMinecraft.cobbleDollars || 0,
            isMinecraftVerified: true,
            verifiedAt: new Date(),
            party: lechugaMinecraft.party,
            pc: lechugaMinecraft.pc,
            pokedex: lechugaMinecraft.pokedex,
          }
        }
      );
      
      // Delete the orphan Minecraft record
      await db.collection('users').deleteOne({ _id: lechugaMinecraft._id });
      
      console.log('✅ Merged Lechuga records');
      console.log('   New balance:', lechugaMinecraft.cobbleDollars);
    } else if (!lechugaMinecraft) {
      console.log('No Minecraft record found for Lechuga');
      console.log('Searching for any Lechuga...');
      
      const anyLechuga = await db.collection('users').find({ 
        $or: [
          { minecraftUsername: { $regex: /lechuga/i } },
          { discordUsername: { $regex: /lechuga/i } }
        ]
      }).toArray();
      
      console.log('Found', anyLechuga.length, 'records:');
      anyLechuga.forEach(u => {
        console.log(`  - ${u.minecraftUsername || u.discordUsername}: MC=${u.minecraftUuid}, Discord=${u.discordId}, balance=${u.cobbleDollars}`);
      });
    } else {
      console.log('Records already merged or same record');
    }
    
    // ============================================
    // VERIFY FIXES
    // ============================================
    console.log('\n=== VERIFICATION ===');
    
    const conoFinal = await db.collection('users').findOne({ discordId: '1160232662825447506' });
    const lechugaFinal = await db.collection('users').findOne({ discordId: '1332096073392459894' });
    
    console.log('\nConoamarilloHD:');
    if (conoFinal) {
      console.log('  Discord:', conoFinal.discordId);
      console.log('  Minecraft:', conoFinal.minecraftUsername, '(' + conoFinal.minecraftUuid + ')');
      console.log('  Balance:', conoFinal.cobbleDollars);
      console.log('  Verified:', conoFinal.isMinecraftVerified);
    }
    
    console.log('\nLechuga:');
    if (lechugaFinal) {
      console.log('  Discord:', lechugaFinal.discordId);
      console.log('  Minecraft:', lechugaFinal.minecraftUsername, '(' + lechugaFinal.minecraftUuid + ')');
      console.log('  Balance:', lechugaFinal.cobbleDollars);
      console.log('  Verified:', lechugaFinal.isMinecraftVerified);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixSplitUsers();
