/**
 * Script para verificar todos los usuarios y sus balances
 * Ejecutar: node check-all-users.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

async function checkAllUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB');
    console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    const db = client.db();
    
    // Listar todas las colecciones
    console.log('\n=== COLECCIONES EN LA BASE DE DATOS ===');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documentos`);
    }
    
    // Verificar usuarios
    console.log('\n=== TODOS LOS USUARIOS ===');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Total usuarios: ${users.length}`);
    
    users.forEach(u => {
      console.log(`\n  Usuario: ${u.minecraftUsername || u.nickname || 'Sin nombre'}`);
      console.log(`    Discord ID: ${u.discordId || 'N/A'}`);
      console.log(`    Minecraft UUID: ${u.minecraftUuid || 'N/A'}`);
      console.log(`    Balance CobbleDollars: ${u.cobbleDollarsBalance || 0}`);
      console.log(`    Verificado: ${u.verified || false}`);
      console.log(`    Party: ${u.pokemonParty?.length || 0} Pokémon`);
      console.log(`    PC: ${u.pcStorage?.reduce((acc, box) => acc + (box.pokemon?.length || 0), 0) || 0} Pokémon`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n✓ Conexión cerrada');
  }
}

checkAllUsers();
