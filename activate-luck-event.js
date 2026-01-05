/**
 * Activate a 1-hour luck boost event for all users
 * ZekkJJ (478742167557505034) gets an extra boost
 * 
 * The gacha system checks luckBoostUntil in gacha_credits collection
 * and applies LUCK_BOOST_MULTIPLIER (1.5x = +50%) to rare+ rates
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cobblemon-pitufos';

// Event duration: 1 hour
const EVENT_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Special user gets extra boost (2 hours instead of 1)
const SPECIAL_USER_DISCORD_ID = '478742167557505034';
const SPECIAL_USER_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

async function activateLuckEvent() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Conectado a MongoDB\n');
    
    const db = client.db();
    const users = db.collection('users');
    const gachaCredits = db.collection('gacha_credits');
    
    const now = new Date();
    const eventEndTime = new Date(now.getTime() + EVENT_DURATION_MS);
    const specialUserEndTime = new Date(now.getTime() + SPECIAL_USER_DURATION_MS);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ACTIVANDO EVENTO DE SUERTE 🎉');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Hora actual: ${now.toLocaleString()}`);
    console.log(`Evento termina: ${eventEndTime.toLocaleString()}`);
    console.log(`Duración: 1 hora`);
    console.log(`Bonus: +50% probabilidad de raros+`);
    console.log('');
    
    // Get all users with Discord ID
    const allUsers = await users.find({ discordId: { $exists: true, $ne: null } }).toArray();
    console.log(`Usuarios encontrados: ${allUsers.length}`);
    
    let updated = 0;
    let created = 0;
    
    for (const user of allUsers) {
      const discordId = user.discordId;
      const isSpecialUser = discordId === SPECIAL_USER_DISCORD_ID;
      const boostUntil = isSpecialUser ? specialUserEndTime : eventEndTime;
      
      // Update or create gacha_credits record with luck boost
      const result = await gachaCredits.updateOne(
        { discordId },
        { 
          $set: { 
            luckBoostUntil: boostUntil,
            luckBoostReason: isSpecialUser ? 'special_event_vip' : 'luck_event',
            updatedAt: now
          },
          $setOnInsert: { 
            credits: 0, 
            stardust: 0, 
            createdAt: now 
          }
        },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        created++;
      } else if (result.modifiedCount > 0) {
        updated++;
      }
      
      if (isSpecialUser) {
        console.log(`\n⭐ USUARIO ESPECIAL: ${user.username || user.minecraftUsername || 'Unknown'}`);
        console.log(`   Discord ID: ${discordId}`);
        console.log(`   Boost hasta: ${specialUserEndTime.toLocaleString()} (2 horas)`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RESULTADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Usuarios actualizados: ${updated}`);
    console.log(`Registros creados: ${created}`);
    console.log(`Total afectados: ${updated + created}`);
    console.log('');
    console.log('🎰 BONUS ACTIVO:');
    console.log('   - Todos: +50% probabilidad de raros+ por 1 hora');
    console.log('   - ZekkJJ: +50% probabilidad de raros+ por 2 horas');
    console.log('');
    console.log('El bonus se aplica automáticamente en cada pull.');
    console.log('Los jugadores verán el efecto inmediatamente.');
    
    // Also create an announcement
    const announcements = db.collection('announcements');
    await announcements.insertOne({
      title: '🎉 ¡EVENTO DE SUERTE ACTIVO!',
      message: '¡Por la próxima hora, todos tienen +50% de probabilidad de obtener Pokémon raros en el Gacha! ¡Aprovecha!',
      type: 'event',
      priority: 'high',
      active: true,
      expiresAt: eventEndTime,
      createdAt: now
    });
    console.log('\n📢 Anuncio creado en el sistema');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

activateLuckEvent();
