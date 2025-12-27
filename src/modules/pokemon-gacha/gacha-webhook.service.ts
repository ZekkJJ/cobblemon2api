/**
 * Gacha Webhook Service
 * Cobblemon Los Pitufos - Backend API
 * 
 * Envía notificaciones a Discord cuando se obtienen Pokémon raros
 */

import { GachaReward, Rarity } from '../../shared/types/pokemon-gacha.types.js';
import { getPokemonSprite, getPokemonArtwork } from '../../shared/data/gacha-pokemon-pool.data.js';

// Colores por rareza para embeds de Discord
const RARITY_COLORS: Record<Rarity, number> = {
  common: 0x9CA3AF,      // gray
  uncommon: 0x22C55E,    // green
  rare: 0x3B82F6,        // blue
  epic: 0xA855F7,        // purple
  legendary: 0xF59E0B,   // amber/gold
  mythic: 0xEC4899,      // pink
};

// Emojis por rareza
const RARITY_EMOJIS: Record<Rarity, string> = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  epic: '🟣',
  legendary: '🟡',
  mythic: '💖',
};

// Nombres de rareza en español
const RARITY_NAMES_ES: Record<Rarity, string> = {
  common: 'Común',
  uncommon: 'Poco Común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
  mythic: 'Mítico',
};

interface WebhookConfig {
  url: string;
  enabled: boolean;
}

export class GachaWebhookService {
  private webhookUrl: string;
  private enabled: boolean;

  constructor(config?: WebhookConfig) {
    // URL del webhook de Discord para notificaciones de gacha
    this.webhookUrl = config?.url || process.env.DISCORD_GACHA_WEBHOOK_URL || '';
    this.enabled = config?.enabled ?? (!!this.webhookUrl);
  }

  /**
   * Determina si se debe enviar notificación para esta recompensa
   */
  shouldNotify(reward: GachaReward): boolean {
    if (!this.enabled || !this.webhookUrl) return false;
    
    // Notificar para: Legendary, Mythic, o cualquier Shiny
    return (
      reward.rarity === 'legendary' ||
      reward.rarity === 'mythic' ||
      reward.isShiny
    );
  }

  /**
   * Envía notificación de tirada rara a Discord
   */
  async sendRarePullNotification(
    reward: GachaReward,
    playerName: string,
    playerAvatar?: string
  ): Promise<boolean> {
    if (!this.shouldNotify(reward)) return false;

    try {
      const embed = this.buildEmbed(reward, playerName, playerAvatar);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '🎰 Gacha Los Pitufos',
          avatar_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        console.error(`[GachaWebhook] Error sending notification: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[GachaWebhook] Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Construye el embed de Discord
   */
  private buildEmbed(
    reward: GachaReward,
    playerName: string,
    playerAvatar?: string
  ): Record<string, any> {
    const pokemonName = reward.pokemon?.nameEs || reward.pokemon?.name || 'Pokémon';
    const pokemonId = reward.pokemon?.pokemonId || 0;
    const isShiny = reward.isShiny;
    const rarity = reward.rarity;

    // Título con emojis apropiados
    let title = '';
    if (isShiny && (rarity === 'legendary' || rarity === 'mythic')) {
      title = `✨🌟 ¡SHINY ${RARITY_NAMES_ES[rarity].toUpperCase()}! 🌟✨`;
    } else if (isShiny) {
      title = `✨ ¡SHINY OBTENIDO! ✨`;
    } else if (rarity === 'mythic') {
      title = `💖 ¡MÍTICO OBTENIDO! 💖`;
    } else if (rarity === 'legendary') {
      title = `⭐ ¡LEGENDARIO OBTENIDO! ⭐`;
    } else {
      title = `${RARITY_EMOJIS[rarity]} ¡Tirada Especial!`;
    }

    // Color del embed
    let color = RARITY_COLORS[rarity];
    if (isShiny) {
      color = 0xFFD700; // Gold for shiny
    }

    // Descripción
    const shinyText = isShiny ? ' **SHINY**' : '';
    const description = `**${playerName}** ha obtenido un${shinyText} **${pokemonName}**!`;

    // Sprite del Pokémon
    const thumbnail = getPokemonSprite(pokemonId, isShiny);
    const image = getPokemonArtwork(pokemonId);

    // IVs si están disponibles
    let ivsText = '';
    if (reward.pokemon?.ivs) {
      const ivs = reward.pokemon.ivs;
      const total = ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe;
      const percentage = Math.round((total / 186) * 100);
      ivsText = `HP: ${ivs.hp} | ATK: ${ivs.atk} | DEF: ${ivs.def}\nSpA: ${ivs.spa} | SpD: ${ivs.spd} | SPE: ${ivs.spe}\n**Total: ${total}/186 (${percentage}%)**`;
    }

    // Campos del embed
    const fields: Array<{ name: string; value: string; inline: boolean }> = [
      {
        name: '📊 Rareza',
        value: `${RARITY_EMOJIS[rarity]} ${RARITY_NAMES_ES[rarity]}`,
        inline: true,
      },
      {
        name: '🎯 Banner',
        value: reward.bannerName || 'Standard',
        inline: true,
      },
    ];

    if (isShiny) {
      fields.push({
        name: '✨ Shiny',
        value: '¡SÍ!',
        inline: true,
      });
    }

    if (reward.isFeatured) {
      fields.push({
        name: '⭐ Destacado',
        value: '¡SÍ!',
        inline: true,
      });
    }

    if (ivsText) {
      fields.push({
        name: '📈 IVs',
        value: ivsText,
        inline: false,
      });
    }

    if (reward.pokemon?.nature) {
      fields.push({
        name: '🎭 Naturaleza',
        value: reward.pokemon.nature,
        inline: true,
      });
    }

    return {
      title,
      description,
      color,
      thumbnail: { url: thumbnail },
      image: { url: image },
      fields,
      footer: {
        text: '🎰 Gacha Los Pitufos | ¡Buena suerte a todos!',
        icon_url: playerAvatar || undefined,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Envía notificación de múltiples tiradas raras (para multi-pull)
   */
  async sendMultiPullHighlights(
    rewards: GachaReward[],
    playerName: string,
    playerAvatar?: string
  ): Promise<boolean> {
    if (!this.enabled || !this.webhookUrl) return false;

    // Filtrar solo las recompensas que merecen notificación
    const notifiableRewards = rewards.filter(r => this.shouldNotify(r));
    
    if (notifiableRewards.length === 0) return false;

    // Si hay múltiples, enviar un resumen
    if (notifiableRewards.length > 1) {
      return await this.sendMultiHighlightEmbed(notifiableRewards, playerName, playerAvatar);
    }

    // Si solo hay una, enviar notificación individual
    return await this.sendRarePullNotification(notifiableRewards[0], playerName, playerAvatar);
  }

  /**
   * Envía embed con múltiples highlights
   */
  private async sendMultiHighlightEmbed(
    rewards: GachaReward[],
    playerName: string,
    playerAvatar?: string
  ): Promise<boolean> {
    try {
      const shinies = rewards.filter(r => r.isShiny).length;
      const legendaries = rewards.filter(r => r.rarity === 'legendary').length;
      const mythics = rewards.filter(r => r.rarity === 'mythic').length;

      let title = '🎰 ¡MULTI-PULL ÉPICO!';
      let color = 0xA855F7; // Purple

      if (mythics > 0) {
        title = '💖 ¡MULTI-PULL MÍTICO!';
        color = 0xEC4899;
      } else if (legendaries > 0) {
        title = '⭐ ¡MULTI-PULL LEGENDARIO!';
        color = 0xF59E0B;
      }

      if (shinies > 0) {
        title = `✨ ${title} ✨`;
        color = 0xFFD700;
      }

      const pokemonList = rewards.map(r => {
        const name = r.pokemon?.nameEs || r.pokemon?.name || 'Pokémon';
        const emoji = RARITY_EMOJIS[r.rarity];
        const shiny = r.isShiny ? ' ✨' : '';
        return `${emoji} **${name}**${shiny}`;
      }).join('\n');

      const embed = {
        title,
        description: `**${playerName}** ha obtenido ${rewards.length} Pokémon especiales en un multi-pull!\n\n${pokemonList}`,
        color,
        fields: [
          { name: '🎯 Total Especiales', value: `${rewards.length}`, inline: true },
          { name: '✨ Shinies', value: `${shinies}`, inline: true },
          { name: '⭐ Legendarios', value: `${legendaries}`, inline: true },
          { name: '💖 Míticos', value: `${mythics}`, inline: true },
        ],
        footer: {
          text: '🎰 Gacha Los Pitufos | ¡Increíble suerte!',
          icon_url: playerAvatar || undefined,
        },
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: '🎰 Gacha Los Pitufos',
          avatar_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
          embeds: [embed],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[GachaWebhook] Failed to send multi-highlight:', error);
      return false;
    }
  }
}

// Singleton instance
export const gachaWebhook = new GachaWebhookService();