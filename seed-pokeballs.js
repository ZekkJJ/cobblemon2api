/**
 * Script para seedear las Pokébolas en la base de datos
 * Ejecutar con: node seed-pokeballs.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Pokébolas con IDs exactos de Cobblemon
const POKEBALLS = [
  // Standard Balls
  {
    id: 'poke_ball',
    cobblemonId: 'poke_ball',
    name: 'Poké Ball',
    description: 'La Pokéball estándar. Tasa de captura básica.',
    sprite: '/pokeballs/Poke Ball_model.png',
    spriteOpen: '/pokeballs/Poke Ball (model, open).png',
    type: 'standard',
    basePrice: 200,
    currentPrice: 200,
    currentStock: 100,
    maxStock: 100,
    catchRate: 1.0,
  },
  {
    id: 'great_ball',
    cobblemonId: 'great_ball',
    name: 'Great Ball',
    description: 'Mejor que una Poké Ball normal. 1.5x tasa de captura.',
    sprite: '/pokeballs/Great Ball_model.png',
    spriteOpen: '/pokeballs/Great Ball (model, open).png',
    type: 'standard',
    basePrice: 600,
    currentPrice: 600,
    currentStock: 50,
    maxStock: 50,
    catchRate: 1.5,
  },
  {
    id: 'ultra_ball',
    cobblemonId: 'ultra_ball',
    name: 'Ultra Ball',
    description: 'Una de las mejores Pokéballs. 2x tasa de captura.',
    sprite: '/pokeballs/Ultra Ball_model.png',
    spriteOpen: '/pokeballs/Ultra Ball (model, open).png',
    type: 'standard',
    basePrice: 1200,
    currentPrice: 1200,
    currentStock: 30,
    maxStock: 30,
    catchRate: 2.0,
  },
  {
    id: 'master_ball',
    cobblemonId: 'master_ball',
    name: 'Master Ball',
    description: '¡Captura garantizada! Extremadamente rara.',
    sprite: '/pokeballs/Master Ball_model.png',
    spriteOpen: '/pokeballs/Master Ball (model, open).png',
    type: 'special',
    basePrice: 50000,
    currentPrice: 50000,
    currentStock: 1,
    maxStock: 1,
    catchRate: 255.0,
  },
  // Special Balls
  {
    id: 'premier_ball',
    cobblemonId: 'premier_ball',
    name: 'Premier Ball',
    description: 'Una Pokéball conmemorativa. Igual que una Poké Ball.',
    sprite: '/pokeballs/Premier Ball_model.png',
    spriteOpen: '/pokeballs/Premier Ball (model, open).png',
    type: 'special',
    basePrice: 200,
    currentPrice: 200,
    currentStock: 20,
    maxStock: 20,
    catchRate: 1.0,
  },
  {
    id: 'luxury_ball',
    cobblemonId: 'luxury_ball',
    name: 'Luxury Ball',
    description: 'El Pokémon capturado se vuelve más amigable.',
    sprite: '/pokeballs/Luxury Ball_model.png',
    spriteOpen: '/pokeballs/Luxury Ball (model, open).png',
    type: 'special',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 15,
    maxStock: 15,
    catchRate: 1.0,
  },
  // Situational Balls
  {
    id: 'net_ball',
    cobblemonId: 'net_ball',
    name: 'Net Ball',
    description: 'Efectiva contra Pokémon de tipo Agua y Bicho. 3.5x',
    sprite: '/pokeballs/Net Ball_model.png',
    spriteOpen: '/pokeballs/Net Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 25,
    maxStock: 25,
    catchRate: 3.5,
  },
  {
    id: 'dive_ball',
    cobblemonId: 'dive_ball',
    name: 'Dive Ball',
    description: 'Efectiva bajo el agua. 3.5x en agua.',
    sprite: '/pokeballs/Dive Ball_model.png',
    spriteOpen: '/pokeballs/Dive Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 25,
    maxStock: 25,
    catchRate: 3.5,
  },
  {
    id: 'nest_ball',
    cobblemonId: 'nest_ball',
    name: 'Nest Ball',
    description: 'Más efectiva contra Pokémon de bajo nivel.',
    sprite: '/pokeballs/Nest Ball_model.png',
    spriteOpen: '/pokeballs/Nest Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 25,
    maxStock: 25,
    catchRate: 4.0,
  },
  {
    id: 'repeat_ball',
    cobblemonId: 'repeat_ball',
    name: 'Repeat Ball',
    description: 'Efectiva contra Pokémon ya capturados. 3.5x',
    sprite: '/pokeballs/Repeat Ball_model.png',
    spriteOpen: '/pokeballs/Repeat Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 20,
    maxStock: 20,
    catchRate: 3.5,
  },
  {
    id: 'timer_ball',
    cobblemonId: 'timer_ball',
    name: 'Timer Ball',
    description: 'Más efectiva cuanto más dure el combate. Hasta 4x',
    sprite: '/pokeballs/Timer Ball_model.png',
    spriteOpen: '/pokeballs/Timer Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 20,
    maxStock: 20,
    catchRate: 4.0,
  },
  {
    id: 'quick_ball',
    cobblemonId: 'quick_ball',
    name: 'Quick Ball',
    description: 'Muy efectiva al inicio del combate. 5x primer turno.',
    sprite: '/pokeballs/Quick Ball_model.png',
    spriteOpen: '/pokeballs/Quick Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 20,
    maxStock: 20,
    catchRate: 5.0,
  },
  {
    id: 'dusk_ball',
    cobblemonId: 'dusk_ball',
    name: 'Dusk Ball',
    description: 'Efectiva de noche o en cuevas. 3x',
    sprite: '/pokeballs/Dusk Ball_model.png',
    spriteOpen: '/pokeballs/Dusk Ball (model, open).png',
    type: 'situational',
    basePrice: 1000,
    currentPrice: 1000,
    currentStock: 25,
    maxStock: 25,
    catchRate: 3.0,
  },
  {
    id: 'heal_ball',
    cobblemonId: 'heal_ball',
    name: 'Heal Ball',
    description: 'Cura al Pokémon capturado completamente.',
    sprite: '/pokeballs/Heal Ball_model.png',
    spriteOpen: '/pokeballs/Heal Ball (model, open).png',
    type: 'special',
    basePrice: 300,
    currentPrice: 300,
    currentStock: 30,
    maxStock: 30,
    catchRate: 1.0,
  },
  // Apricorn Balls (raras)
  {
    id: 'level_ball',
    cobblemonId: 'level_ball',
    name: 'Level Ball',
    description: 'Más efectiva si tu Pokémon es de mayor nivel.',
    sprite: '/pokeballs/Level Ball_model.png',
    spriteOpen: '/pokeballs/Level Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 8.0,
  },
  {
    id: 'lure_ball',
    cobblemonId: 'lure_ball',
    name: 'Lure Ball',
    description: 'Efectiva contra Pokémon pescados. 4x',
    sprite: '/pokeballs/Lure Ball_model.png',
    spriteOpen: '/pokeballs/Lure Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 4.0,
  },
  {
    id: 'moon_ball',
    cobblemonId: 'moon_ball',
    name: 'Moon Ball',
    description: 'Efectiva contra Pokémon que evolucionan con Piedra Lunar. 4x',
    sprite: '/pokeballs/Moon Ball_model.png',
    spriteOpen: '/pokeballs/Moon Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 4.0,
  },
  {
    id: 'friend_ball',
    cobblemonId: 'friend_ball',
    name: 'Friend Ball',
    description: 'El Pokémon capturado empieza con alta amistad.',
    sprite: '/pokeballs/Friend Ball_model.png',
    spriteOpen: '/pokeballs/Friend Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 1.0,
  },
  {
    id: 'love_ball',
    cobblemonId: 'love_ball',
    name: 'Love Ball',
    description: 'Efectiva contra Pokémon del sexo opuesto. 8x',
    sprite: '/pokeballs/Love Ball_model.png',
    spriteOpen: '/pokeballs/Love Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 8.0,
  },
  {
    id: 'heavy_ball',
    cobblemonId: 'heavy_ball',
    name: 'Heavy Ball',
    description: 'Efectiva contra Pokémon pesados.',
    sprite: '/pokeballs/Heavy Ball_model.png',
    spriteOpen: '/pokeballs/Heavy Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 4.0,
  },
  {
    id: 'fast_ball',
    cobblemonId: 'fast_ball',
    name: 'Fast Ball',
    description: 'Efectiva contra Pokémon rápidos (velocidad >100). 4x',
    sprite: '/pokeballs/Fast Ball_model.png',
    spriteOpen: '/pokeballs/Fast Ball (model, open).png',
    type: 'apricorn',
    basePrice: 2000,
    currentPrice: 2000,
    currentStock: 10,
    maxStock: 10,
    catchRate: 4.0,
  },
  // Safari/Sport/Dream/Beast
  {
    id: 'safari_ball',
    cobblemonId: 'safari_ball',
    name: 'Safari Ball',
    description: 'Ball especial de la Zona Safari. 1.5x',
    sprite: '/pokeballs/Safari Ball_model.png',
    spriteOpen: '/pokeballs/Safari Ball (model, open).png',
    type: 'special',
    basePrice: 1500,
    currentPrice: 1500,
    currentStock: 15,
    maxStock: 15,
    catchRate: 1.5,
  },
  {
    id: 'sport_ball',
    cobblemonId: 'sport_ball',
    name: 'Sport Ball',
    description: 'Ball especial del Bug-Catching Contest. 1.5x',
    sprite: '/pokeballs/Sport Ball_model.png',
    spriteOpen: '/pokeballs/Sport Ball (model, open).png',
    type: 'special',
    basePrice: 1500,
    currentPrice: 1500,
    currentStock: 15,
    maxStock: 15,
    catchRate: 1.5,
  },
  {
    id: 'dream_ball',
    cobblemonId: 'dream_ball',
    name: 'Dream Ball',
    description: 'Efectiva contra Pokémon dormidos. 4x',
    sprite: '/pokeballs/Dream Ball_model.png',
    spriteOpen: '/pokeballs/Dream Ball (model, open).png',
    type: 'special',
    basePrice: 2500,
    currentPrice: 2500,
    currentStock: 10,
    maxStock: 10,
    catchRate: 4.0,
  },
  {
    id: 'beast_ball',
    cobblemonId: 'beast_ball',
    name: 'Beast Ball',
    description: 'Diseñada para Ultra Bestias. 5x contra ellas, 0.1x contra otros.',
    sprite: '/pokeballs/Beast Ball_model.png',
    spriteOpen: '/pokeballs/Beast Ball (model, open).png',
    type: 'special',
    basePrice: 5000,
    currentPrice: 5000,
    currentStock: 5,
    maxStock: 5,
    catchRate: 5.0,
  },
];

async function seedPokeballs() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    const collection = db.collection('shop_items');

    // Limpiar colección existente
    await collection.deleteMany({});
    console.log('🗑️  Cleared existing shop items');

    // Insertar pokébolas
    const result = await collection.insertMany(POKEBALLS.map(ball => ({
      ...ball,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));

    console.log(`✅ Inserted ${result.insertedCount} Pokéballs`);
    console.log('\n📦 Pokéballs in shop:');
    POKEBALLS.forEach(ball => {
      console.log(`   - ${ball.name} (${ball.id}) - ${ball.currentStock} in stock - $${ball.basePrice}`);
    });

    console.log('\n✅ Done! Shop is ready.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedPokeballs();
