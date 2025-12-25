/**
 * Discord Bot Integration for Verification
 * Cobblemon Los Pitufos
 * 
 * Bot that listens to messages in Discord channels and verifies players
 * when they send their 5-digit verification code.
 */

const { Client, GatewayIntentBits, Events } = require('discord.js');

let discordClient = null;
let db = null;
let isReady = false;

// Discord Server IDs where the bot should listen
const ALLOWED_GUILD_IDS = process.env.DISCORD_GUILD_IDS 
  ? process.env.DISCORD_GUILD_IDS.split(',').map(id => id.trim())
  : [];

/**
 * Initialize Discord Bot
 */
async function initDiscordBot(database) {
  const token = process.env.DISCORD_BOT_TOKEN;
  
  if (!token) {
    console.log('[DISCORD-BOT] No bot token configured, skipping initialization');
    return null;
  }

  db = database;

  try {
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Bot ready event
    discordClient.once(Events.ClientReady, (client) => {
      console.log(`[DISCORD-BOT] ✓ Logged in as ${client.user.tag}`);
      console.log(`[DISCORD-BOT] ✓ Listening in ${client.guilds.cache.size} servers`);
      isReady = true;
    });

    // Message event - listen for verification codes
    discordClient.on(Events.MessageCreate, handleMessage);

    // Login
    await discordClient.login(token);
    console.log('[DISCORD-BOT] ✓ Bot initialized successfully');
    
    return discordClient;
  } catch (error) {
    console.error('[DISCORD-BOT] ✗ Failed to initialize:', error.message);
    return null;
  }
}

/**
 * Handle incoming messages - check for verification codes
 */
async function handleMessage(message) {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if message is in an allowed guild (or allow all if not configured)
  if (ALLOWED_GUILD_IDS.length > 0 && message.guild) {
    if (!ALLOWED_GUILD_IDS.includes(message.guild.id)) return;
  }

  // Check if message looks like a verification code (5 alphanumeric characters)
  const content = message.content.trim().toUpperCase();
  
  // Match 5-character alphanumeric code
  if (!/^[A-Z0-9]{5}$/.test(content)) return;

  console.log(`[DISCORD-BOT] Potential verification code detected: ${content} from ${message.author.tag}`);

  try {
    // Look up the pending verification code
    const pendingVerification = await db.collection('pending_verifications').findOne({
      code: content,
      used: { $ne: true },
      expiresAt: { $gt: new Date() }
    });

    if (!pendingVerification) {
      // Code not found or expired - silently ignore (don't spam the channel)
      console.log(`[DISCORD-BOT] Code ${content} not found or expired`);
      return;
    }

    const discordId = message.author.id;
    const discordUsername = message.author.tag;
    const minecraftUuid = pendingVerification.minecraftUuid;
    const minecraftUsername = pendingVerification.minecraftUsername;

    // Check if Discord account is already linked to another Minecraft account
    const existingPlayer = await db.collection('players').findOne({
      discordId: discordId,
      minecraftUuid: { $ne: minecraftUuid }
    });

    if (existingPlayer) {
      await message.reply({
        content: `❌ Tu cuenta de Discord ya está vinculada a otra cuenta de Minecraft (\`${existingPlayer.username}\`).`,
        allowedMentions: { repliedUser: true }
      });
      return;
    }

    // Link the accounts
    await db.collection('players').updateOne(
      { minecraftUuid: minecraftUuid },
      {
        $set: {
          discordId: discordId,
          discordUsername: discordUsername,
          verified: true,
          verifiedAt: new Date(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          username: minecraftUsername,
          minecraftUuid: minecraftUuid,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Mark the code as used
    await db.collection('pending_verifications').updateOne(
      { code: content },
      { $set: { used: true, usedAt: new Date(), usedBy: discordId } }
    );

    // Send success message
    await message.reply({
      content: `✅ **¡Cuenta verificada exitosamente!**\n\n` +
               `🎮 Minecraft: \`${minecraftUsername}\`\n` +
               `💬 Discord: ${message.author}\n\n` +
               `Ya puedes jugar normalmente en el servidor y usar todas las funciones de la web.`,
      allowedMentions: { repliedUser: true }
    });

    console.log(`[DISCORD-BOT] ✓ Verified ${minecraftUsername} -> ${discordUsername}`);

    // Delete the verification message after a delay (optional, keeps channel clean)
    setTimeout(async () => {
      try {
        await message.delete();
      } catch (e) {
        // Ignore if can't delete (permissions)
      }
    }, 5000);

  } catch (error) {
    console.error('[DISCORD-BOT] Error processing verification:', error);
  }
}

/**
 * Generate a verification code for a Minecraft player
 */
async function generateVerificationCode(minecraftUuid, minecraftUsername) {
  if (!db) throw new Error('Database not initialized');

  // Generate 5-character alphanumeric code
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  // Check if player already has a pending code
  const existing = await db.collection('pending_verifications').findOne({
    minecraftUuid: minecraftUuid,
    used: { $ne: true },
    expiresAt: { $gt: new Date() }
  });

  if (existing) {
    return existing.code;
  }

  // Create new pending verification
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await db.collection('pending_verifications').insertOne({
    code: code,
    minecraftUuid: minecraftUuid,
    minecraftUsername: minecraftUsername,
    createdAt: new Date(),
    expiresAt: expiresAt,
    used: false
  });

  console.log(`[DISCORD-BOT] Generated code ${code} for ${minecraftUsername}`);
  return code;
}

/**
 * Check if a player is verified
 */
async function isPlayerVerified(minecraftUuid) {
  if (!db) return false;
  
  const player = await db.collection('players').findOne({
    minecraftUuid: minecraftUuid,
    verified: true
  });
  
  return !!player;
}

/**
 * Get bot status
 */
function getBotStatus() {
  return {
    initialized: !!discordClient,
    ready: isReady,
    username: discordClient?.user?.tag || null,
    guilds: discordClient?.guilds?.cache?.size || 0
  };
}

/**
 * Shutdown bot
 */
async function shutdownBot() {
  if (discordClient) {
    console.log('[DISCORD-BOT] Shutting down...');
    await discordClient.destroy();
    discordClient = null;
    isReady = false;
  }
}

module.exports = {
  initDiscordBot,
  generateVerificationCode,
  isPlayerVerified,
  getBotStatus,
  shutdownBot
};
