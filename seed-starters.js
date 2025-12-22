/**
 * Script para poblar la base de datos con los 27 starters
 * Usa sprites de alta calidad de Pokémon Showdown y Official Artwork
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

// Función para obtener sprites de alta calidad
function getSprites(id) {
  // Showdown tiene sprites animados de alta calidad para todos los Pokémon
  return {
    // Sprite principal - Official Artwork (alta calidad)
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    // Sprite animado - Showdown (funciona para todos)
    spriteAnimated: `https://play.pokemonshowdown.com/sprites/ani/${getShowdownName(id)}.gif`,
    // Shiny estático
    shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`,
    // Shiny animado - Showdown
    shinyAnimated: `https://play.pokemonshowdown.com/sprites/ani-shiny/${getShowdownName(id)}.gif`,
    // Artwork oficial
    artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    // Home sprites (3D de alta calidad)
    home: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
    homeShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`,
    // Cry
    cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
  };
}

// Nombres para Showdown (lowercase, sin espacios)
function getShowdownName(id) {
  const names = {
    1: 'bulbasaur', 4: 'charmander', 7: 'squirtle',
    152: 'chikorita', 155: 'cyndaquil', 158: 'totodile',
    252: 'treecko', 255: 'torchic', 258: 'mudkip',
    387: 'turtwig', 390: 'chimchar', 393: 'piplup',
    495: 'snivy', 498: 'tepig', 501: 'oshawott',
    650: 'chespin', 653: 'fennekin', 656: 'froakie',
    722: 'rowlet', 725: 'litten', 728: 'popplio',
    810: 'grookey', 813: 'scorbunny', 816: 'sobble',
    906: 'sprigatito', 909: 'fuecoco', 912: 'quaxly',
  };
  return names[id] || '';
}

const STARTERS = [
  // Gen 1
  { pokemonId: 1, name: "Bulbasaur", nameEs: "Bulbasaur", generation: 1, types: ["Grass", "Poison"],
    stats: { hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Una rara semilla fue plantada en su espalda al nacer.", height: 0.7, weight: 6.9 },
  { pokemonId: 4, name: "Charmander", nameEs: "Charmander", generation: 1, types: ["Fire"],
    stats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Prefiere las cosas calientes. Cuando llueve, sale vapor de su cola.", height: 0.6, weight: 8.5 },
  { pokemonId: 7, name: "Squirtle", nameEs: "Squirtle", generation: 1, types: ["Water"],
    stats: { hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Tras nacer, su espalda se hincha y endurece en un caparazón.", height: 0.5, weight: 9.0 },
  // Gen 2
  { pokemonId: 152, name: "Chikorita", nameEs: "Chikorita", generation: 2, types: ["Grass"],
    stats: { hp: 45, attack: 49, defense: 65, spAttack: 49, spDefense: 65, speed: 45 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Un dulce aroma emana de la hoja en su cabeza.", height: 0.9, weight: 6.4 },
  { pokemonId: 155, name: "Cyndaquil", nameEs: "Cyndaquil", generation: 2, types: ["Fire"],
    stats: { hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Es tímido y siempre se enrolla en una bola.", height: 0.5, weight: 7.9 },
  { pokemonId: 158, name: "Totodile", nameEs: "Totodile", generation: 2, types: ["Water"],
    stats: { hp: 50, attack: 65, defense: 64, spAttack: 44, spDefense: 48, speed: 43 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Sus poderosas mandíbulas pueden aplastar cualquier cosa.", height: 0.6, weight: 9.5 },
  // Gen 3
  { pokemonId: 252, name: "Treecko", nameEs: "Treecko", generation: 3, types: ["Grass"],
    stats: { hp: 40, attack: 45, defense: 35, spAttack: 65, spDefense: 55, speed: 70 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Hace su nido en un árbol gigante del bosque.", height: 0.5, weight: 5.0 },
  { pokemonId: 255, name: "Torchic", nameEs: "Torchic", generation: 3, types: ["Fire"],
    stats: { hp: 45, attack: 60, defense: 40, spAttack: 70, spDefense: 50, speed: 45 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Tiene un saco de fuego dentro que arde perpetuamente.", height: 0.4, weight: 2.5 },
  { pokemonId: 258, name: "Mudkip", nameEs: "Mudkip", generation: 3, types: ["Water"],
    stats: { hp: 50, attack: 70, defense: 50, spAttack: 50, spDefense: 50, speed: 40 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "La aleta en su cabeza actúa como radar.", height: 0.4, weight: 7.6 },
  // Gen 4
  { pokemonId: 387, name: "Turtwig", nameEs: "Turtwig", generation: 4, types: ["Grass"],
    stats: { hp: 55, attack: 68, defense: 64, spAttack: 45, spDefense: 55, speed: 31 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Realiza fotosíntesis con su cuerpo, produciendo oxígeno.", height: 0.4, weight: 10.2 },
  { pokemonId: 390, name: "Chimchar", nameEs: "Chimchar", generation: 4, types: ["Fire"],
    stats: { hp: 44, attack: 58, defense: 44, spAttack: 58, spDefense: 44, speed: 61 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "El fuego en su cola es producido por gas en su estómago.", height: 0.5, weight: 6.2 },
  { pokemonId: 393, name: "Piplup", nameEs: "Piplup", generation: 4, types: ["Water"],
    stats: { hp: 53, attack: 51, defense: 53, spAttack: 61, spDefense: 56, speed: 40 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Vive en costas de países del norte. Experto nadador.", height: 0.4, weight: 5.2 },
  // Gen 5
  { pokemonId: 495, name: "Snivy", nameEs: "Snivy", generation: 5, types: ["Grass"],
    stats: { hp: 45, attack: 45, defense: 55, spAttack: 45, spDefense: 55, speed: 63 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Es muy inteligente y calmado.", height: 0.6, weight: 8.1 },
  { pokemonId: 498, name: "Tepig", nameEs: "Tepig", generation: 5, types: ["Fire"],
    stats: { hp: 65, attack: 63, defense: 45, spAttack: 45, spDefense: 45, speed: 45 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Sopla fuego por su nariz. Asa bayas antes de comerlas.", height: 0.5, weight: 9.9 },
  { pokemonId: 501, name: "Oshawott", nameEs: "Oshawott", generation: 5, types: ["Water"],
    stats: { hp: 55, attack: 55, defense: 45, spAttack: 63, spDefense: 45, speed: 45 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Lucha usando la concha en su estómago.", height: 0.5, weight: 5.9 },
  // Gen 6
  { pokemonId: 650, name: "Chespin", nameEs: "Chespin", generation: 6, types: ["Grass"],
    stats: { hp: 56, attack: 61, defense: 65, spAttack: 48, spDefense: 45, speed: 38 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Las púas en su cabeza son normalmente suaves.", height: 0.4, weight: 9.0 },
  { pokemonId: 653, name: "Fennekin", nameEs: "Fennekin", generation: 6, types: ["Fire"],
    stats: { hp: 40, attack: 45, defense: 40, spAttack: 62, spDefense: 60, speed: 60 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Comer una ramita lo llena de energía.", height: 0.4, weight: 9.4 },
  { pokemonId: 656, name: "Froakie", nameEs: "Froakie", generation: 6, types: ["Water"],
    stats: { hp: 41, attack: 56, defense: 40, spAttack: 62, spDefense: 44, speed: 71 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Secreta burbujas flexibles de su pecho y espalda.", height: 0.3, weight: 7.0 },
  // Gen 7
  { pokemonId: 722, name: "Rowlet", nameEs: "Rowlet", generation: 7, types: ["Grass", "Flying"],
    stats: { hp: 68, attack: 55, defense: 55, spAttack: 50, spDefense: 50, speed: 42 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Almacena energía durante el día mediante fotosíntesis.", height: 0.3, weight: 1.5 },
  { pokemonId: 725, name: "Litten", nameEs: "Litten", generation: 7, types: ["Fire"],
    stats: { hp: 45, attack: 65, defense: 40, spAttack: 60, spDefense: 40, speed: 70 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Mientras se acicala, acumula pelo en su estómago.", height: 0.4, weight: 4.3 },
  { pokemonId: 728, name: "Popplio", nameEs: "Popplio", generation: 7, types: ["Water"],
    stats: { hp: 50, attack: 54, defense: 54, spAttack: 66, spDefense: 56, speed: 40 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Sopla fluidos de su nariz, creando globos.", height: 0.4, weight: 7.5 },
  // Gen 8
  { pokemonId: 810, name: "Grookey", nameEs: "Grookey", generation: 8, types: ["Grass"],
    stats: { hp: 50, attack: 65, defense: 50, spAttack: 40, spDefense: 40, speed: 65 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Cuando golpea un ritmo con su palo especial, las ondas revitalizan plantas.", height: 0.3, weight: 5.0 },
  { pokemonId: 813, name: "Scorbunny", nameEs: "Scorbunny", generation: 8, types: ["Fire"],
    stats: { hp: 50, attack: 71, defense: 40, spAttack: 40, spDefense: 40, speed: 69 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Corre para calentar su cuerpo, luego usa sus poderosas piernas.", height: 0.3, weight: 4.5 },
  { pokemonId: 816, name: "Sobble", nameEs: "Sobble", generation: 8, types: ["Water"],
    stats: { hp: 50, attack: 40, defense: 40, spAttack: 70, spDefense: 40, speed: 70 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Cuando tiene miedo, llora. Sus lágrimas hacen llorar a los enemigos.", height: 0.3, weight: 4.0 },
  // Gen 9
  { pokemonId: 906, name: "Sprigatito", nameEs: "Sprigatito", generation: 9, types: ["Grass"],
    stats: { hp: 40, attack: 61, defense: 54, spAttack: 45, spDefense: 45, speed: 65 },
    abilities: [{ name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Potencia movimientos Planta con poca vida." }],
    description: "Su pelaje tiene una composición similar a las plantas.", height: 0.4, weight: 4.1 },
  { pokemonId: 909, name: "Fuecoco", nameEs: "Fuecoco", generation: 9, types: ["Fire"],
    stats: { hp: 67, attack: 45, defense: 59, spAttack: 63, spDefense: 40, speed: 36 },
    abilities: [{ name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Potencia movimientos Fuego con poca vida." }],
    description: "Se acuesta en rocas calientes y usa el calor para crear energía de fuego.", height: 0.4, weight: 9.8 },
  { pokemonId: 912, name: "Quaxly", nameEs: "Quaxly", generation: 9, types: ["Water"],
    stats: { hp: 55, attack: 65, defense: 45, spAttack: 50, spDefense: 45, speed: 50 },
    abilities: [{ name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Potencia movimientos Agua con poca vida." }],
    description: "Su pelo brillante está cubierto de un gel rico en crema.", height: 0.5, weight: 6.1 },
];

async function seedStarters() {
  console.log('🌱 Conectando a MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE || 'admin');
    const collection = db.collection('starters');
    
    // Obtener starters existentes para preservar claims
    const existingStarters = await collection.find({}).toArray();
    const claimedMap = {};
    existingStarters.forEach(s => {
      if (s.isClaimed) {
        claimedMap[s.pokemonId] = {
          isClaimed: true,
          claimedBy: s.claimedBy,
          claimedByNickname: s.claimedByNickname,
          claimedAt: s.claimedAt,
          isShiny: s.isShiny,
        };
      }
    });
    
    console.log(`📊 Encontrados ${existingStarters.length} starters existentes, ${Object.keys(claimedMap).length} reclamados`);
    
    // Preparar los 27 starters con sprites de alta calidad
    const startersToInsert = STARTERS.map(starter => {
      const claimed = claimedMap[starter.pokemonId] || {};
      return {
        ...starter,
        sprites: getSprites(starter.pokemonId),
        isClaimed: claimed.isClaimed || false,
        claimedBy: claimed.claimedBy || null,
        claimedByNickname: claimed.claimedByNickname || null,
        claimedAt: claimed.claimedAt || null,
        isShiny: claimed.isShiny || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    
    // Eliminar todos y reinsertar
    await collection.deleteMany({});
    const result = await collection.insertMany(startersToInsert);
    
    console.log(`✅ Insertados ${result.insertedCount} starters`);
    console.log('📋 Lista de starters:');
    startersToInsert.forEach(s => {
      const status = s.isClaimed ? `🔴 Reclamado por ${s.claimedBy}` : '🟢 Disponible';
      console.log(`   #${s.pokemonId} ${s.nameEs} - ${status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada');
  }
}

seedStarters();
