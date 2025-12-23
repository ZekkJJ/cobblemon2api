/**
 * Script para limpiar mods sin archivos de la base de datos
 * Ejecutar: node clean-mods.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon';

async function cleanMods() {
  console.log('🧹 Limpiando mods sin archivos...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    const modsCollection = db.collection('mods');
    
    // Obtener todos los mods
    const allMods = await modsCollection.find({}).toArray();
    console.log(`📦 Total de mods en DB: ${allMods.length}\n`);
    
    // Analizar cada mod
    let modsWithFiles = 0;
    let modsWithoutFiles = 0;
    let modsWithZeroSize = 0;
    
    for (const mod of allMods) {
      const hasFile = mod.filePath && mod.filePath.length > 0;
      const hasSize = mod.originalSize && mod.originalSize > 0;
      
      if (hasFile && hasSize) {
        modsWithFiles++;
        console.log(`✅ ${mod.name} - ${mod.originalSize} bytes - ${mod.filePath}`);
      } else if (hasFile && !hasSize) {
        modsWithZeroSize++;
        console.log(`⚠️  ${mod.name} - tiene filePath pero size=0`);
      } else {
        modsWithoutFiles++;
        console.log(`❌ ${mod.name} - SIN ARCHIVO (filePath: ${mod.filePath || 'null'})`);
      }
    }
    
    console.log('\n📊 Resumen:');
    console.log(`   - Con archivos válidos: ${modsWithFiles}`);
    console.log(`   - Con filePath pero size=0: ${modsWithZeroSize}`);
    console.log(`   - Sin archivos: ${modsWithoutFiles}`);
    
    // Preguntar si eliminar
    if (modsWithoutFiles > 0 || modsWithZeroSize > 0) {
      console.log('\n🗑️  Eliminando mods sin archivos válidos...');
      
      const result = await modsCollection.deleteMany({
        $or: [
          { filePath: null },
          { filePath: '' },
          { filePath: { $exists: false } },
          { originalSize: 0 },
          { originalSize: null },
          { originalSize: { $exists: false } },
        ]
      });
      
      console.log(`✅ Eliminados: ${result.deletedCount} mods`);
    } else {
      console.log('\n✅ Todos los mods tienen archivos válidos');
    }
    
    // Mostrar estado final
    const remainingMods = await modsCollection.find({}).toArray();
    console.log(`\n📦 Mods restantes: ${remainingMods.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Conexión cerrada');
  }
}

cleanMods();
