/**
 * Set pity counter correctly for a user (guaranteed epic+ on next pull)
 * The gacha system uses gacha_pity collection with playerId (discordId) and bannerId
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';
const DISCORD_ID = '478742167557505034';
const PITY_VALUE = 399; // Just below hard pity (400), so next pull is guaranteed epic+

async function setPity() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    const gachaPity = db.collection('gacha_pity');
    const gachaBanners = db.collection('gacha_banners');
    
    // Buscar usuario
    const user = await users.findOne({ discordId: DISCORD_ID });
    
    if (!user) {
      console.log('❌ Usuario no encontrado con Discord ID:', DISCORD_ID);
      return;
    }
    
    console.log('Usuario encontrado:', user.username || user.minecraftUsername || 'Unknown');
    console.log('Minecraft UUID:', user.minecraftUuid);
    console.log('');
    
    // Obtener todos los banners activos
    const banners = await gachaBanners.find({ isActive: true }).toArray();
    console.log('Banners activos:', banners.length);
    
    // Actualizar pity para TODOS los banners activos
    for (const banner of banners) {
      const bannerId = banner.bannerId;
      
      // Buscar pity existente
      const existingPity = await gachaPity.findOne({ 
        playerId: DISCORD_ID,
        bannerId: bannerId
      });
      
      console.log(`\nBanner: ${banner.name || bannerId}`);
      console.log(`  Pity actual: ${existingPity?.currentPity || 0}`);
      
      // Actualizar o crear pity
      const result = await gachaPity.updateOne(
        { playerId: DISCORD_ID, bannerId: bannerId },
        { 
          $set: { 
            currentPity: PITY_VALUE,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        console.log(`  ✅ Pity creado: ${PITY_VALUE}`);
      } else if (result.modifiedCount > 0) {
        console.log(`  ✅ Pity actualizado: ${existingPity?.currentPity || 0} → ${PITY_VALUE}`);
      } else {
        console.log(`  ⚠️ Sin cambios (ya era ${PITY_VALUE})`);
      }
    }
    
    // Si no hay banners, crear pity para el banner estándar
    if (banners.length === 0) {
      console.log('\nNo hay banners activos, creando pity para banner estándar...');
      await gachaPity.updateOne(
        { playerId: DISCORD_ID, bannerId: 'standard' },
        { 
          $set: { 
            currentPity: PITY_VALUE,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
      console.log('✅ Pity creado para banner estándar');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RESULTADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Usuario: ${user.username || user.minecraftUsername || 'Unknown'}`);
    console.log(`Discord ID: ${DISCORD_ID}`);
    console.log(`Pity: ${PITY_VALUE} / 400 (Hard Pity)`);
    console.log(`Próximo pull: ÉPICO+ GARANTIZADO`);
    
    // Verificar el pity final
    const finalPity = await gachaPity.find({ playerId: DISCORD_ID }).toArray();
    console.log('\nPity final por banner:');
    for (const p of finalPity) {
      console.log(`  - ${p.bannerId}: ${p.currentPity}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

setPity();
