/**
 * Fix DrPENE's balance to match in-game balance
 * Run: node fix-drpene-balance.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DRPENE_ID = '694a0355f6d79d3bf8da5c91';
const NEW_BALANCE = 500000; // 500k as reported by user

async function fixBalance() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB\n');
    
    // Get current state
    const user = await db.collection('users').findOne({ _id: new ObjectId(DRPENE_ID) });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log('=== BEFORE ===');
    console.log('Minecraft Username:', user.minecraftUsername);
    console.log('cobbleDollars:', user.cobbleDollars);
    console.log('cobbleDollarsBalance:', user.cobbleDollarsBalance);
    
    // Update balance
    await db.collection('users').updateOne(
      { _id: new ObjectId(DRPENE_ID) },
      { 
        $set: { 
          cobbleDollars: NEW_BALANCE,
          cobbleDollarsBalance: NEW_BALANCE,
          lastEconomyUpdate: new Date()
        } 
      }
    );
    
    // Verify
    const updated = await db.collection('users').findOne({ _id: new ObjectId(DRPENE_ID) });
    
    console.log('\n=== AFTER ===');
    console.log('Minecraft Username:', updated.minecraftUsername);
    console.log('cobbleDollars:', updated.cobbleDollars);
    console.log('cobbleDollarsBalance:', updated.cobbleDollarsBalance);
    
    console.log('\n✓ Balance updated to', NEW_BALANCE, 'CD');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixBalance();
