/**
 * Set pity counter for a user (guaranteed legendary on next pull)
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';
const DISCORD_ID = '478742167557505034';
const PITY_VALUE = 999; // Guaranteed legendary (pity threshold is usually 90-100)

async function setPity() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    const gachaPity = db.collection('gacha_pity');
    
    // Buscar usuario
    const user = await users.findOne({ discordId: DISCORD_ID });
    
    if (!user) {
      console.log('❌ Usuario no encontrado con Discord ID:', DISCORD_ID);
      return;
    }
    
    console.log('Usuario encontrado:', user.username || 'Unknown');
    console.log('Minecraft UUID:', user.minecraftUuid);
    
    // Buscar o crear registro de pity
    const existingPity = await gachaPity.findOne({ 
      $or: [
        { discordId: DISCORD_ID },
        { minecraftUuid: user.minecraftUuid }
      ]
    });
    
    if (existingPity) {
      console.log('\nPity actual:', existingPity.pityCounter || 0);
      
      // Actualizar pity existente
      const result = await gachaPity.updateOne(
        { _id: existingPity._id },
        { 
          $set: { 
            pityCounter: PITY_VALUE,
            legendaryPity: PITY_VALUE,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Pity actualizado: ${existingPity.pityCounter || 0} → ${PITY_VALUE}`);
      }
    } else {
      // Crear nuevo registro de pity
      const newPity = {
        discordId: DISCORD_ID,
        minecraftUuid: user.minecraftUuid,
        username: user.username,
        pityCounter: PITY_VALUE,
        legendaryPity: PITY_VALUE,
        totalPulls: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await gachaPity.insertOne(newPity);
      console.log(`✅ Nuevo registro de pity creado con valor: ${PITY_VALUE}`);
    }
    
    // También actualizar en el documento del usuario si tiene campo de pity
    await users.updateOne(
      { discordId: DISCORD_ID },
      { 
        $set: { 
          'gacha.pityCounter': PITY_VALUE,
          'gacha.legendaryPity': PITY_VALUE
        }
      }
    );
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RESULTADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Usuario: ${user.username || 'Unknown'}`);
    console.log(`Discord ID: ${DISCORD_ID}`);
    console.log(`Pity: ${PITY_VALUE} (LEGENDARIO GARANTIZADO en próximo pull)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

setPity();
