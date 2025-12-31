/**
 * Seed Legendary Pool - Create a test pool
 * Run: node seed-legendary-pool.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedPool() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    
    console.log('Connected to MongoDB');
    
    // Check if there's already an active pool
    const existingPool = await db.collection('legendary_pools').findOne({ 
      status: { $in: ['active', 'completed'] } 
    });
    
    if (existingPool) {
      console.log('⚠️ Ya existe un pool activo:', existingPool.targetPokemon);
      console.log('   Estado:', existingPool.status);
      console.log('   Progreso:', existingPool.currentAmount, '/', existingPool.goalAmount);
      return;
    }
    
    // Create a new pool
    const pool = {
      targetPokemon: 'Rayquaza',
      targetLevel: 100,
      goalAmount: 10000000, // 10 million
      currentAmount: 0,
      status: 'active',
      rewards: {
        topContributorBonus: 25,
        participationReward: 'ultra_ball',
        participationAmount: 5,
        milestoneRewards: [
          { percentage: 25, reward: '5x Great Ball', claimed: false },
          { percentage: 50, reward: '3x Ultra Ball', claimed: false },
          { percentage: 75, reward: '1x Timer Ball', claimed: false },
          { percentage: 100, reward: 'Legendary Spawn!', claimed: false }
        ]
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      spawnLocation: 'Estadio Principal'
    };
    
    const result = await db.collection('legendary_pools').insertOne(pool);
    
    console.log('✅ Pool creado exitosamente!');
    console.log('   ID:', result.insertedId);
    console.log('   Pokémon:', pool.targetPokemon);
    console.log('   Meta:', pool.goalAmount.toLocaleString(), 'CD');
    console.log('   Expira:', pool.expiresAt.toLocaleString());
    
    // Create indexes
    await db.collection('legendary_pools').createIndex({ status: 1 });
    await db.collection('pool_contributions').createIndex({ poolId: 1, minecraftUuid: 1 });
    await db.collection('pool_contributions').createIndex({ poolId: 1, totalContributed: -1 });
    await db.collection('locked_balances').createIndex({ minecraftUuid: 1, poolId: 1 });
    await db.collection('pool_transactions').createIndex({ poolId: 1, timestamp: -1 });
    
    console.log('✅ Índices creados');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

seedPool();
