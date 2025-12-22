/**
 * Script para agregar sprites a todos los starters en MongoDB
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixSprites() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db('admin');
    const starters = await db.collection('starters').find({}).toArray();
    
    console.log(`📊 Total starters: ${starters.length}`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const starter of starters) {
      // Si ya tiene sprites, skip
      if (starter.sprites && starter.sprites.sprite) {
        skipped++;
        continue;
      }
      
      const pokemonId = starter.pokemonId;
      
      // Crear objeto sprites
      const sprites = {
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
        spriteAnimated: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemonId}.gif`,
        shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`,
        shinyAnimated: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${pokemonId}.gif`,
        artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`,
        cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`
      };
      
      // Actualizar en MongoDB
      await db.collection('starters').updateOne(
        { _id: starter._id },
        { $set: { sprites } }
      );
      
      updated++;
      console.log(`✅ Updated ${starter.name} (${pokemonId})`);
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${starters.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

fixSprites();
