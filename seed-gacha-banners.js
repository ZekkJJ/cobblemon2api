/**
 * Seed Gacha Banners
 * Cobblemon Los Pitufos - Backend
 * 
 * Creates the standard banner and an example limited banner
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'cobblemon_pitufos';

async function seedBanners() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const bannersCollection = db.collection('gacha_banners');
    
    // Check if standard banner exists
    const existingStandard = await bannersCollection.findOne({ type: 'standard' });
    
    if (!existingStandard) {
      // Create Standard Banner
      const standardBanner = {
        bannerId: 'banner_standard_001',
        name: 'Standard Banner',
        nameEs: 'Banner Estándar',
        description: 'The permanent banner with all available Pokémon and items',
        descriptionEs: 'El banner permanente con todos los Pokémon e items disponibles',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        type: 'standard',
        startDate: new Date(),
        endDate: null,
        isActive: true,
        featuredPokemon: [],
        featuredItems: [],
        rateUpMultiplier: 1,
        pokemonPool: [],
        itemPool: [],
        singlePullCost: 500,
        multiPullCost: 4500,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      
      await bannersCollection.insertOne(standardBanner);
      console.log('✓ Standard Banner created');
    } else {
      console.log('Standard Banner already exists');
    }
    
    // Check if example limited banner exists
    const existingLimited = await bannersCollection.findOne({ bannerId: 'banner_dragonite_001' });
    
    if (!existingLimited) {
      // Create Example Limited Banner - Dragonite Rate Up
      const limitedBanner = {
        bannerId: 'banner_dragonite_001',
        name: 'Dragonite Rate Up',
        nameEs: 'Banner de Dragonite',
        description: 'Featured banner with increased Dragonite rates!',
        descriptionEs: '¡Banner destacado con mayor probabilidad de Dragonite!',
        artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png',
        type: 'limited',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true,
        featuredPokemon: [
          {
            type: 'pokemon',
            id: 149,
            name: 'Dragonite',
            nameEs: 'Dragonite',
            rarity: 'legendary',
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png',
          },
          {
            type: 'pokemon',
            id: 147,
            name: 'Dratini',
            nameEs: 'Dratini',
            rarity: 'epic',
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/147.png',
          },
        ],
        featuredItems: [
          {
            type: 'item',
            id: 'cobblemon:dragon_scale',
            name: 'Dragon Scale',
            nameEs: 'Escama Dragón',
            rarity: 'rare',
            sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dragon-scale.png',
          },
        ],
        rateUpMultiplier: 5,
        pokemonPool: [],
        itemPool: [],
        singlePullCost: 500,
        multiPullCost: 4500,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      };
      
      await bannersCollection.insertOne(limitedBanner);
      console.log('✓ Dragonite Limited Banner created');
    } else {
      console.log('Dragonite Limited Banner already exists');
    }
    
    // Create indexes
    await bannersCollection.createIndex({ bannerId: 1 }, { unique: true });
    await bannersCollection.createIndex({ isActive: 1, startDate: 1, endDate: 1 });
    await bannersCollection.createIndex({ type: 1 });
    console.log('✓ Indexes created');
    
    // List all banners
    const allBanners = await bannersCollection.find({}).toArray();
    console.log('\nAll Banners:');
    allBanners.forEach(b => {
      console.log(`  - ${b.nameEs} (${b.type}) - Active: ${b.isActive}`);
    });
    
    console.log('\n✓ Seed complete!');
    
  } catch (error) {
    console.error('Error seeding banners:', error);
  } finally {
    await client.close();
  }
}

seedBanners();
