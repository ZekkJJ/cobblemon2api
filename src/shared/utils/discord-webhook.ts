/**
 * Discord Webhook para notificaciones de starters
 * Cobblemon Los Pitufos - Backend API
 */

const WEBHOOK_URL = process.env['DISCORD_WEBHOOK_URL'] || 'https://discord.com/api/webhooks/1450589868135547033/Ntws36prXTAaVxqwkbU__aj3shdQ7U6zhotOt4wc4dCfrSUgBZjo76C4gDsBSgbhMtJl';

// Type colors for embed
const TYPE_COLORS: Record<string, number> = {
    Grass: 0x78C850,
    Fire: 0xF08030,
    Water: 0x6890F0,
    Poison: 0xA040A0,
    Flying: 0xA890F0,
    Bug: 0xA8B820,
    Normal: 0xA8A878,
    Electric: 0xF8D030,
    Ground: 0xE0C068,
    Fighting: 0xC03028,
    Psychic: 0xF85888,
    Rock: 0xB8A038,
    Ice: 0x98D8D8,
    Ghost: 0x705898,
    Dragon: 0x7038F8,
    Dark: 0x705848,
    Steel: 0xB8B8D0,
    Fairy: 0xEE99AC,
};

interface StarterData {
    pokemonId: number;
    name: string;
    nameEs?: string;
    types: string[];
    stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
    abilities: { name: string; nameEs: string; isHidden: boolean; description: string }[];
    signatureMoves: { name: string; type: string; category: string; power: number | null; accuracy: number | null }[];
    evolutions: { to: number; toName: string; method: string }[];
    description: string;
    height: number;
    weight: number;
    generation: number;
    isShiny?: boolean;
    sprites?: {
        sprite: string;
        spriteAnimated: string;
        shiny: string;
        shinyAnimated: string;
        artwork: string;
        cry: string;
    };
}

export async function sendStarterWebhook(
    discordId: string,
    nickname: string,
    starter: StarterData
): Promise<boolean> {
    try {
        const isShiny = starter.isShiny || false;
        const firstType = starter.types[0] || 'Normal';
        const mainColor = TYPE_COLORS[firstType] || 0x5865F2;

        // Get the right sprite
        const spriteUrl = isShiny
            ? starter.sprites?.shiny || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${starter.pokemonId}.png`
            : starter.sprites?.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${starter.pokemonId}.png`;

        const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${isShiny ? 'shiny/' : ''}${starter.pokemonId}.png`;

        // Build stats display
        const statsTotal = starter.stats.hp + starter.stats.atk + starter.stats.def + starter.stats.spa + starter.stats.spd + starter.stats.spe;
        const statsBar = (val: number) => {
            const filled = Math.round(val / 15);
            return '█'.repeat(Math.min(filled, 10)) + '░'.repeat(Math.max(0, 10 - filled));
        };

        // Evolution chain
        const evolutionText = starter.evolutions.length > 0
            ? starter.evolutions.map(e => `➜ **${e.toName}** (${e.method})`).join('\n')
            : 'No evoluciona';

        // Abilities
        const abilitiesText = starter.abilities.map(a =>
            `${a.isHidden ? '🔒 ' : ''}**${a.nameEs}** - ${a.description}`
        ).join('\n');

        // Signature moves
        const movesText = starter.signatureMoves.map(m =>
            `**${m.name}** (${m.type}) - ${m.category === 'status' ? 'Estado' : `${m.power} PWR`}`
        ).join('\n');

        const embed = {
            title: isShiny
                ? `✨ ¡SHINY! ${starter.name} ✨`
                : `🎉 ¡Nuevo Starter Reclamado!`,
            description: `**${nickname}** (<@${discordId}>) ha obtenido a **${starter.name}**!\n\n*"${starter.description}"*`,
            color: isShiny ? 0xFFD700 : mainColor,
            thumbnail: {
                url: spriteUrl,
            },
            image: {
                url: artworkUrl,
            },
            fields: [
                {
                    name: '📊 Tipos',
                    value: starter.types.join(' / '),
                    inline: true,
                },
                {
                    name: '🏷️ Generación',
                    value: `Gen ${starter.generation}`,
                    inline: true,
                },
                {
                    name: '📏 Medidas',
                    value: `${starter.height}m / ${starter.weight}kg`,
                    inline: true,
                },
                {
                    name: '📈 Estadísticas Base',
                    value: [
                        `\`HP  ${statsBar(starter.stats.hp)} ${starter.stats.hp}\``,
                        `\`ATK ${statsBar(starter.stats.atk)} ${starter.stats.atk}\``,
                        `\`DEF ${statsBar(starter.stats.def)} ${starter.stats.def}\``,
                        `\`SPA ${statsBar(starter.stats.spa)} ${starter.stats.spa}\``,
                        `\`SPD ${statsBar(starter.stats.spd)} ${starter.stats.spd}\``,
                        `\`SPE ${statsBar(starter.stats.spe)} ${starter.stats.spe}\``,
                        `**Total: ${statsTotal}**`,
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🎯 Habilidades',
                    value: abilitiesText || 'Sin habilidades',
                    inline: false,
                },
                {
                    name: '⚔️ Movimientos Firma',
                    value: movesText || 'Sin movimientos especiales',
                    inline: false,
                },
                {
                    name: '🔄 Evoluciones',
                    value: evolutionText,
                    inline: false,
                },
            ],
            footer: {
                text: `Cobblemon Los Pitufos • cobblemon2.pals.army`,
                icon_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
            },
            timestamp: new Date().toISOString(),
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `<@${discordId}>`,
                embeds: [embed],
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Discord webhook error:', error);
        return false;
    }
}
