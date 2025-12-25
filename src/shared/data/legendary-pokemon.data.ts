/**
 * Lista completa de Pokémon Legendarios, Míticos y Ultra Bestias
 * Incluye Pokémon de Cobblemon base y mods populares:
 * - Cobblemon base (Gen 1-9)
 * - Mega Pokemon Showdown (Megas)
 * - Legendary Monuments
 * - AFP (Additional Forms Pack)
 * - Cobblemon Lore
 * 
 * Cobblemon Los Pitufos - Backend API
 */

// ============================================
// LEGENDARIOS OFICIALES (Gen 1-9)
// ============================================

export const LEGENDARY_POKEMON: Set<string> = new Set([
  // Gen 1 - Kanto
  'articuno', 'zapdos', 'moltres', 'mewtwo',
  
  // Gen 2 - Johto
  'raikou', 'entei', 'suicune', 'lugia', 'ho-oh',
  
  // Gen 3 - Hoenn
  'regirock', 'regice', 'registeel', 'latias', 'latios',
  'kyogre', 'groudon', 'rayquaza',
  
  // Gen 4 - Sinnoh
  'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran',
  'regigigas', 'giratina', 'cresselia',
  
  // Gen 5 - Unova
  'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus',
  'reshiram', 'zekrom', 'landorus', 'kyurem',
  
  // Gen 6 - Kalos
  'xerneas', 'yveltal', 'zygarde',
  
  // Gen 7 - Alola
  'type:null', 'silvally', 'tapukoko', 'tapulele', 'tapubulu', 'tapufini',
  'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'necrozma',
  
  // Gen 8 - Galar
  'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu',
  'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex',
  
  // Gen 9 - Paldea
  'koraidon', 'miraidon', 'tinglu', 'chienpao', 'wochien', 'chiyu',
  'roaringmoon', 'ironvaliant', 'walkingwake', 'ironleaves',
  'ogerpon', 'terapagos', 'pecharunt',
]);

// ============================================
// MÍTICOS (Mythical)
// ============================================

export const MYTHICAL_POKEMON: Set<string> = new Set([
  // Gen 1
  'mew',
  
  // Gen 2
  'celebi',
  
  // Gen 3
  'jirachi', 'deoxys',
  
  // Gen 4
  'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
  
  // Gen 5
  'victini', 'keldeo', 'meloetta', 'genesect',
  
  // Gen 6
  'diancie', 'hoopa', 'volcanion',
  
  // Gen 7
  'magearna', 'marshadow', 'zeraora', 'meltan', 'melmetal',
  
  // Gen 8
  'zarude',
  
  // Gen 9
  'pecharunt',
]);

// ============================================
// ULTRA BESTIAS (Ultra Beasts)
// ============================================

export const ULTRA_BEASTS: Set<string> = new Set([
  'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela',
  'kartana', 'guzzlord', 'poipole', 'naganadel', 'stakataka', 'blacephalon',
]);

// ============================================
// PARADOX POKEMON (Gen 9)
// ============================================

export const PARADOX_POKEMON: Set<string> = new Set([
  // Past Paradox
  'greattusk', 'screamtail', 'brutebonnet', 'fluttermane', 'slitherwing',
  'sandyshocks', 'roaringmoon', 'walkingwake', 'gougingfire', 'ragingbolt',
  
  // Future Paradox
  'irontreads', 'ironbundle', 'ironhands', 'ironjugulis', 'ironmoth',
  'ironthorns', 'ironvaliant', 'ironleaves', 'ironcrown', 'ironboulder',
]);

// ============================================
// MEGA EVOLUTIONS (Mega Pokemon Showdown mod)
// ============================================

export const MEGA_POKEMON: Set<string> = new Set([
  // Gen 1 Megas
  'venusaurmega', 'charizardmegax', 'charizardmegay', 'blastoisemega',
  'baboramega', 'baboramega', 'alakazammega', 'gengarmega', 'kangaskhanmega',
  'pinsirmega', 'gyaradosmega', 'aerodactylmega', 'maboramega',
  
  // Gen 2 Megas
  'ampharosmega', 'steelixmega', 'scizormega', 'heracrossmega', 'houndoommega',
  'tyranitarmega',
  
  // Gen 3 Megas
  'sceptilemega', 'blazikenmega', 'swampertmega', 'gardevoirmega', 'sableyemega',
  'maboramega', 'sharpedomega', 'cameruptmega', 'altariamega', 'banettemega',
  'absolmega', 'glaliemega', 'salamencemega', 'metagrossmega', 'latiasmega',
  'latiosmega', 'rayquazamega', 'kyogremega', 'groudonmega',
  
  // Gen 4 Megas
  'lopunnymega', 'gaboramega', 'lucariomega', 'abomasnowmega', 'gallademega',
  
  // Gen 5 Megas
  'audibomega',
  
  // Gen 6 Megas
  'daboramega',
  
  // Primal Forms
  'kyogreprimal', 'groudonprimal',
]);

// ============================================
// FORMAS ESPECIALES (AFP, Cobblemon Lore, etc.)
// ============================================

export const SPECIAL_FORMS: Set<string> = new Set([
  // Formas Alola
  'raaboraalola', 'raaboraalola', 'sandshrewalola', 'sandslashalola',
  'vulpixalola', 'ninetalesalola', 'diglettalola', 'dugtrioalola',
  'meowthalola', 'persianalola', 'geodudealola', 'graveleralola', 'golemalola',
  'grimeralola', 'mukalola', 'exeggutoralola', 'marowakalola',
  
  // Formas Galar
  'meowthgalar', 'ponytaGalar', 'rapidashgalar', 'farfetchdgalar',
  'weezinggalar', 'maboragalar', 'corsolagalar', 'zigzagoongalar',
  'linoonegalar', 'darumakagalar', 'darmanitangalar', 'yamaskgalar',
  'stunfiskgalar', 'slowpokegalar', 'slowbrogalar', 'slowkinggalar',
  'articunogalar', 'zapdosgalar', 'moltresgalar',
  
  // Formas Hisui
  'growlithehisui', 'arcaninehisui', 'voltorbhisui', 'electrodehisui',
  'typhlosionhisui', 'qwilfishhisui', 'sneaselhisui', 'samurotthisui',
  'lilliganthisui', 'zoruahisui', 'zoroarkhisui', 'braviaryhisui',
  'sliggoohisui', 'goodrahisui', 'avalugghisui', 'decidueyehisui',
  
  // Formas Paldea
  'taborapaldea', 'wooperpaldea',
]);

// ============================================
// POKÉMON RESTRINGIDOS (Restricted Legendaries)
// Estos son los más poderosos, típicamente baneados en competitivo
// ============================================

export const RESTRICTED_POKEMON: Set<string> = new Set([
  // Box Legendaries
  'mewtwo', 'lugia', 'ho-oh', 'kyogre', 'groudon', 'rayquaza',
  'dialga', 'palkia', 'giratina', 'reshiram', 'zekrom', 'kyurem',
  'xerneas', 'yveltal', 'zygarde', 'solgaleo', 'lunala', 'necrozma',
  'zacian', 'zamazenta', 'eternatus', 'calyrex', 'koraidon', 'miraidon',
  
  // Mythicals poderosos
  'arceus', 'darkrai', 'deoxys',
  
  // Formas especiales
  'kyuremblack', 'kyuremwhite', 'necrozmaduskmane', 'necrozmadawnwings',
  'necrozmaultra', 'calyrexicerider', 'calyrexshadowrider',
  'zaciancrowned', 'zamazentacrowned',
]);

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Verifica si un Pokémon es legendario
 */
export function isLegendary(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LEGENDARY_POKEMON.has(normalized);
}

/**
 * Verifica si un Pokémon es mítico
 */
export function isMythical(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return MYTHICAL_POKEMON.has(normalized);
}

/**
 * Verifica si un Pokémon es Ultra Bestia
 */
export function isUltraBeast(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ULTRA_BEASTS.has(normalized);
}

/**
 * Verifica si un Pokémon es Paradox
 */
export function isParadox(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return PARADOX_POKEMON.has(normalized);
}

/**
 * Verifica si un Pokémon es Mega
 */
export function isMega(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return MEGA_POKEMON.has(normalized) || normalized.includes('mega');
}

/**
 * Verifica si un Pokémon es restringido (los más poderosos)
 */
export function isRestricted(species: string): boolean {
  const normalized = species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return RESTRICTED_POKEMON.has(normalized);
}

/**
 * Verifica si un Pokémon está en cualquier categoría especial
 */
export function isSpecialPokemon(species: string): boolean {
  return isLegendary(species) || isMythical(species) || isUltraBeast(species) || 
         isParadox(species) || isMega(species);
}

/**
 * Obtiene la categoría de un Pokémon especial
 */
export function getSpecialCategory(species: string): string | null {
  if (isRestricted(species)) return 'restricted';
  if (isMythical(species)) return 'mythical';
  if (isLegendary(species)) return 'legendary';
  if (isUltraBeast(species)) return 'ultra_beast';
  if (isParadox(species)) return 'paradox';
  if (isMega(species)) return 'mega';
  return null;
}

/**
 * Obtiene todas las listas combinadas para exportar al plugin
 */
export function getAllSpecialPokemon(): {
  legendary: string[];
  mythical: string[];
  ultraBeast: string[];
  paradox: string[];
  mega: string[];
  restricted: string[];
} {
  return {
    legendary: Array.from(LEGENDARY_POKEMON),
    mythical: Array.from(MYTHICAL_POKEMON),
    ultraBeast: Array.from(ULTRA_BEASTS),
    paradox: Array.from(PARADOX_POKEMON),
    mega: Array.from(MEGA_POKEMON),
    restricted: Array.from(RESTRICTED_POKEMON),
  };
}
