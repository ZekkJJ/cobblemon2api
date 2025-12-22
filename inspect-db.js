/**
 * Script para inspeccionar la base de datos MongoDB
 * y entender la estructura real de los datos
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = 'admin'; // Base de datos correcta

async function inspectDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Conectando a MongoDB...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');
    
    const db = client.db(MONGODB_DB);
    
    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('📚 Colecciones encontradas:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    console.log('');
    
    // Inspeccionar cada colección
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 COLECCIÓN: ${collectionName}`);
      console.log('='.repeat(60));
      
      const coll = db.collection(collectionName);
      
      // Contar documentos
      const count = await coll.countDocuments();
      console.log(`📊 Total de documentos: ${count}`);
      
      if (count > 0) {
        // Obtener un documento de ejemplo
        const sample = await coll.findOne();
        console.log('\n📄 Ejemplo de documento:');
        console.log(JSON.stringify(sample, null, 2));
        
        // Obtener los campos únicos
        const keys = Object.keys(sample);
        console.log('\n🔑 Campos en el documento:');
        keys.forEach(key => {
          const value = sample[key];
          const type = Array.isArray(value) ? 'Array' : typeof value;
          console.log(`   - ${key}: ${type}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Inspección completada');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

inspectDatabase();
