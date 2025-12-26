/**
 * Pool de Items para el Sistema Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los items disponibles en el gacha organizados por rareza
 */

import { ItemPoolEntry, Rarity } from '../types/pokemon-gacha.types.js';

/**
 * Items Comunes (60% probabilidad base)
 */
export const COMMON_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:poke_ball', name: 'Poké Ball', nameEs: 'Poké Ball', rarity: 'common', baseWeight: 3, quantity: 5, sprite: 'poke_ball' },
  { itemId: 'cobblemon:potion', name: 'Potion', nameEs: 'Poción', rarity: 'common', baseWeight: 2, quantity: 3, sprite: 'potion' },
  { itemId: 'cobblemon:antidote', name: 'Antidote', nameEs: 'Antídoto', rarity: 'common', baseWeight: 1, quantity: 2, sprite: 'antidote' },
  { itemId: 'cobblemon:paralyze_heal', name: 'Paralyze Heal', nameEs: 'Antiparaliz', rarity: 'common', baseWeight: 1, quantity: 2, sprite: 'paralyze_heal' },
  { itemId: 'cobblemon:awakening', name: 'Awakening', nameEs: 'Despertar', rarity: 'common', baseWeight: 1, quantity: 2, sprite: 'awakening' },
  { itemId: 'cobblemon:burn_heal', name: 'Burn Heal', nameEs: 'Antiquemar', rarity: 'common', baseWeight: 1, quantity: 2, sprite: 'burn_heal' },
  { itemId: 'cobblemon:ice_heal', name: 'Ice Heal', nameEs: 'Antihielo', rarity: 'common', baseWeight: 1, quantity: 2, sprite: 'ice_heal' },
];

/**
 * Items Poco Comunes (25% probabilidad base)
 */
export const UNCOMMON_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:great_ball', name: 'Great Ball', nameEs: 'Super Ball', rarity: 'uncommon', baseWeight: 3, quantity: 3, sprite: 'great_ball' },
  { itemId: 'cobblemon:super_potion', name: 'Super Potion', nameEs: 'Superpoción', rarity: 'uncommon', baseWeight: 2, quantity: 2, sprite: 'super_potion' },
  { itemId: 'cobblemon:revive', name: 'Revive', nameEs: 'Revivir', rarity: 'uncommon', baseWeight: 1, quantity: 1, sprite: 'revive' },
  { itemId: 'cobblemon:full_heal', name: 'Full Heal', nameEs: 'Cura Total', rarity: 'uncommon', baseWeight: 1, quantity: 2, sprite: 'full_heal' },
  { itemId: 'cobblemon:ether', name: 'Ether', nameEs: 'Éter', rarity: 'uncommon', baseWeight: 1, quantity: 1, sprite: 'ether' },
  { itemId: 'cobblemon:escape_rope', name: 'Escape Rope', nameEs: 'Cuerda Huida', rarity: 'uncommon', baseWeight: 1, quantity: 2, sprite: 'escape_rope' },
  { itemId: 'cobblemon:repel', name: 'Repel', nameEs: 'Repelente', rarity: 'uncommon', baseWeight: 1, quantity: 3, sprite: 'repel' },
];

/**
 * Items Raros (10% probabilidad base)
 */
export const RARE_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:ultra_ball', name: 'Ultra Ball', nameEs: 'Ultra Ball', rarity: 'rare', baseWeight: 3, quantity: 2, sprite: 'ultra_ball' },
  { itemId: 'cobblemon:hyper_potion', name: 'Hyper Potion', nameEs: 'Hiperpoción', rarity: 'rare', baseWeight: 2, quantity: 2, sprite: 'hyper_potion' },
  { itemId: 'cobblemon:max_revive', name: 'Max Revive', nameEs: 'Revivir Máx', rarity: 'rare', baseWeight: 1, quantity: 1, sprite: 'max_revive' },
  { itemId: 'cobblemon:max_ether', name: 'Max Ether', nameEs: 'Éter Máx', rarity: 'rare', baseWeight: 1, quantity: 1, sprite: 'max_ether' },
  { itemId: 'cobblemon:dream_ball', name: 'Dream Ball', nameEs: 'Ensueño Ball', rarity: 'rare', baseWeight: 1, quantity: 1, sprite: 'dream_ball' },
  { itemId: 'cobblemon:quick_ball', name: 'Quick Ball', nameEs: 'Veloz Ball', rarity: 'rare', baseWeight: 1, quantity: 2, sprite: 'quick_ball' },
  { itemId: 'cobblemon:dusk_ball', name: 'Dusk Ball', nameEs: 'Ocaso Ball', rarity: 'rare', baseWeight: 1, quantity: 2, sprite: 'dusk_ball' },
  { itemId: 'cobblemon:timer_ball', name: 'Timer Ball', nameEs: 'Turno Ball', rarity: 'rare', baseWeight: 1, quantity: 2, sprite: 'timer_ball' },
  { itemId: 'cobblemon:rare_candy', name: 'Rare Candy', nameEs: 'Caramelo Raro', rarity: 'rare', baseWeight: 2, quantity: 1, sprite: 'rare_candy' },
];


/**
 * Items Épicos (4% probabilidad base)
 */
export const EPIC_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:safari_ball', name: 'Safari Ball', nameEs: 'Safari Ball', rarity: 'epic', baseWeight: 2, quantity: 1, sprite: 'safari_ball' },
  { itemId: 'cobblemon:sport_ball', name: 'Sport Ball', nameEs: 'Competi Ball', rarity: 'epic', baseWeight: 2, quantity: 1, sprite: 'sport_ball' },
  { itemId: 'cobblemon:max_potion', name: 'Max Potion', nameEs: 'Máx Poción', rarity: 'epic', baseWeight: 1, quantity: 2, sprite: 'max_potion' },
  { itemId: 'cobblemon:full_restore', name: 'Full Restore', nameEs: 'Restaurar Todo', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'full_restore' },
  { itemId: 'cobblemon:max_elixir', name: 'Max Elixir', nameEs: 'Elixir Máx', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'max_elixir' },
  { itemId: 'cobblemon:pp_up', name: 'PP Up', nameEs: 'Más PP', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'pp_up' },
  { itemId: 'cobblemon:protein', name: 'Protein', nameEs: 'Proteína', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'protein' },
  { itemId: 'cobblemon:iron', name: 'Iron', nameEs: 'Hierro', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'iron' },
  { itemId: 'cobblemon:calcium', name: 'Calcium', nameEs: 'Calcio', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'calcium' },
  { itemId: 'cobblemon:zinc', name: 'Zinc', nameEs: 'Zinc', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'zinc' },
  { itemId: 'cobblemon:carbos', name: 'Carbos', nameEs: 'Carburante', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'carbos' },
  { itemId: 'cobblemon:hp_up', name: 'HP Up', nameEs: 'Más PS', rarity: 'epic', baseWeight: 1, quantity: 1, sprite: 'hp_up' },
];

/**
 * Items Legendarios (0.6% probabilidad base)
 */
export const LEGENDARY_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:beast_ball', name: 'Beast Ball', nameEs: 'Ente Ball', rarity: 'legendary', baseWeight: 2, quantity: 1, sprite: 'beast_ball' },
  { itemId: 'cobblemon:cherish_ball', name: 'Cherish Ball', nameEs: 'Gloria Ball', rarity: 'legendary', baseWeight: 1, quantity: 1, sprite: 'cherish_ball' },
  { itemId: 'cobblemon:pp_max', name: 'PP Max', nameEs: 'Máx PP', rarity: 'legendary', baseWeight: 1, quantity: 1, sprite: 'pp_max' },
  { itemId: 'cobblemon:ability_capsule', name: 'Ability Capsule', nameEs: 'Cápsula Habilidad', rarity: 'legendary', baseWeight: 1, quantity: 1, sprite: 'ability_capsule' },
  { itemId: 'cobblemon:bottle_cap', name: 'Bottle Cap', nameEs: 'Chapa Plateada', rarity: 'legendary', baseWeight: 2, quantity: 1, sprite: 'bottle_cap' },
  { itemId: 'cobblemon:exp_candy_xl', name: 'Exp. Candy XL', nameEs: 'Caramelo Exp. XL', rarity: 'legendary', baseWeight: 1, quantity: 3, sprite: 'exp_candy_xl' },
];

/**
 * Items Míticos (0.0001% probabilidad base)
 */
export const MYTHIC_ITEMS: ItemPoolEntry[] = [
  { itemId: 'cobblemon:master_ball', name: 'Master Ball', nameEs: 'Master Ball', rarity: 'mythic', baseWeight: 3, quantity: 1, sprite: 'master_ball' },
  { itemId: 'cobblemon:gold_bottle_cap', name: 'Gold Bottle Cap', nameEs: 'Chapa Dorada', rarity: 'mythic', baseWeight: 2, quantity: 1, sprite: 'gold_bottle_cap' },
  { itemId: 'cobblemon:ability_patch', name: 'Ability Patch', nameEs: 'Parche Habilidad', rarity: 'mythic', baseWeight: 1, quantity: 1, sprite: 'ability_patch' },
];

/**
 * Pool completo de items por rareza
 */
export const ITEMS_POOL_BY_RARITY: Record<Rarity, ItemPoolEntry[]> = {
  common: COMMON_ITEMS,
  uncommon: UNCOMMON_ITEMS,
  rare: RARE_ITEMS,
  epic: EPIC_ITEMS,
  legendary: LEGENDARY_ITEMS,
  mythic: MYTHIC_ITEMS,
};

/**
 * Pool completo de todos los items
 */
export const ALL_ITEMS_POOL: ItemPoolEntry[] = [
  ...COMMON_ITEMS,
  ...UNCOMMON_ITEMS,
  ...RARE_ITEMS,
  ...EPIC_ITEMS,
  ...LEGENDARY_ITEMS,
  ...MYTHIC_ITEMS,
];

/**
 * Obtiene el pool de items para una rareza específica
 */
export function getItemsPoolByRarity(rarity: Rarity): ItemPoolEntry[] {
  return ITEMS_POOL_BY_RARITY[rarity] || [];
}

/**
 * Obtiene un item por su ID
 */
export function getItemById(itemId: string): ItemPoolEntry | undefined {
  return ALL_ITEMS_POOL.find(i => i.itemId === itemId);
}

/**
 * Genera la URL del sprite de un item
 */
export function getItemSprite(itemId: string): string {
  // Extraer el nombre del item del ID (ej: cobblemon:master_ball -> master_ball)
  const itemName = itemId.split(':')[1] || itemId;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemName}.png`;
}
