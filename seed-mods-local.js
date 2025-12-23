/**
 * Script para subir mods desde tu carpeta local de Minecraft a MongoDB
 * 
 * USO:
 * 1. Asegúrate de tener las variables de entorno configuradas (MONGODB_URI)
 * 2. Ejecuta: node seed-mods-local.js
 * 
 * Este script:
 * - Lee todos los .jar y .zip de tu carpeta de mods
 * - Crea entradas en MongoDB con la metadata
 * - Copia los archivos a backend/uploads/mods/
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuración
const MODS_SOURCE_DIR = 'C:\\Users\\ptmsh\\AppData\\Roaming\\.minecraft\\mods';
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'mods');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon';

// Asegurar que el directorio de uploads existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('📁 Created uploads directory:', UPLOADS_DIR);
}

// Función para sanitizar nombres de archivo
const sanitizeFilename = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  
  const safeName = name
    .replace(/\s+/g, '_')
    .replace(/[()[\]{}]/g, '')
    .replace(/[+]/g, '_plus_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return safeName + ext;
};

// Función para extraer info del nombre del mod
const extractModInfo = (filename) => {
  const baseName = filename.replace(/\.(jar|zip)$/i, '');
  
  // Intentar extraer versión
  const versionMatch = baseName.match(/[-_](\d+\.\d+(\.\d+)?)/);
  const version = versionMatch ? versionMatch[1] : '1.0.0';
  
  // Limpiar nombre
  let cleanName = baseName
    .replace(/-fabric|-forge|-mc\d+\.\d+(\.\d+)?/gi, '')
    .replace(/[-_]\d+\.\d+(\.\d+)?/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Detectar mod loader
  const modLoader = baseName.toLowerCase().includes('forge') ? 'forge' : 'fabric';
  
  // Detectar categoría basada en el nombre
  let category = 'required';
  const lowerName = baseName.toLowerCase();
  if (lowerName.includes('shader') || lowerName.includes('iris')) {
    category = 'shader';
  } else if (lowerName.includes('resourcepack') || lowerName.includes('resource')) {
    category = 'resourcepack';
  } else if (lowerName.includes('optional') || lowerName.includes('jei') || lowerName.includes('minimap')) {
    category = 'optional';
  }
  
  return { cleanName, version, modLoader, category };
};

async function seedMods() {
  console.log('🎮 Cobblemon Los Pitufos - Seed Mods Script');
  console.log('==========================================\n');
  
  // Verificar que la carpeta de mods existe
  if (!fs.existsSync(MODS_SOURCE_DIR)) {
    console.error('❌ Mods folder not found:', MODS_SOURCE_DIR);
    process.exit(1);
  }
  
  // Leer archivos de mods
  const files = fs.readdirSync(MODS_SOURCE_DIR)
    .filter(f => f.endsWith('.jar') || f.endsWith('.zip'));
  
  console.log(`📦 Found ${files.length} mod files\n`);
  
  if (files.length === 0) {
    console.log('No mods found to upload.');
    process.exit(0);
  }
  
  // Conectar a MongoDB
  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const modsCollection = db.collection('mods');
    
    // Primero, limpiar mods sin archivos válidos
    const cleanupResult = await modsCollection.deleteMany({
      $or: [
        { filePath: null },
        { filePath: '' },
        { filePath: { $exists: false } },
        { originalSize: 0 },
        { originalSize: null },
        { originalSize: { $exists: false } },
      ]
    });
    console.log(`🧹 Cleaned up ${cleanupResult.deletedCount} mods without files\n`);
    
    let uploaded = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const file of files) {
      const sourcePath = path.join(MODS_SOURCE_DIR, file);
      const safeFilename = sanitizeFilename(file);
      const destPath = path.join(UPLOADS_DIR, safeFilename);
      
      try {
        // Verificar si ya existe
        const existing = await modsCollection.findOne({ 
          filename: file,
          isActive: true 
        });
        
        if (existing && existing.originalSize > 0) {
          console.log(`⏭️  Skipped (exists): ${file}`);
          skipped++;
          continue;
        }
        
        // Obtener info del archivo
        const stats = fs.statSync(sourcePath);
        const { cleanName, version, modLoader, category } = extractModInfo(file);
        
        // Copiar archivo
        fs.copyFileSync(sourcePath, destPath);
        
        // Calcular checksum
        const fileBuffer = fs.readFileSync(destPath);
        const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        // Crear o actualizar en MongoDB
        const modData = {
          name: cleanName || file.replace(/\.(jar|zip)$/i, ''),
          slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version,
          description: `Mod ${cleanName} para Minecraft`,
          category,
          modLoader,
          minecraftVersion: '1.21.1',
          author: '',
          website: '',
          downloadUrl: '',
          filePath: destPath,
          filename: file,
          originalSize: stats.size,
          compressedSize: 0,
          checksum,
          changelog: '',
          isActive: true,
          updatedAt: new Date(),
          previousVersions: [],
        };
        
        if (existing) {
          // Actualizar existente
          await modsCollection.updateOne(
            { _id: existing._id },
            { $set: modData }
          );
        } else {
          // Crear nuevo
          modData.createdAt = new Date();
          await modsCollection.insertOne(modData);
        }
        
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`✅ Uploaded: ${file} (${sizeMB} MB) [${category}]`);
        uploaded++;
        
      } catch (err) {
        console.error(`❌ Error with ${file}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n==========================================');
    console.log('📊 Summary:');
    console.log(`   ✅ Uploaded: ${uploaded}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${files.length}`);
    
    // Mostrar estadísticas finales
    const totalMods = await modsCollection.countDocuments({ isActive: true });
    const totalSize = await modsCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$originalSize' } } }
    ]).toArray();
    
    const totalSizeMB = totalSize[0] ? (totalSize[0].total / 1024 / 1024).toFixed(2) : 0;
    
    console.log(`\n📈 Database Stats:`);
    console.log(`   Total mods: ${totalMods}`);
    console.log(`   Total size: ${totalSizeMB} MB`);
    
  } catch (err) {
    console.error('❌ Database error:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Ejecutar
seedMods().catch(console.error);
