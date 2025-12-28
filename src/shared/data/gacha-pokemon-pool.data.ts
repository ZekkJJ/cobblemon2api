/**
 * Pool de Pokémon para el Sistema Gacha - EXPANDED 400+ Pokemon
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define los Pokémon disponibles en el gacha organizados por rareza
 * Gen 1-9 coverage for comprehensive gacha experience
 */

import { PokemonPoolEntry, Rarity } from '../types/pokemon-gacha.types.js';

/**
 * Pokémon Comunes (60% probabilidad base) - ~150 Pokemon
 * Pokémon básicos de todas las generaciones
 */
export const COMMON_POKEMON: PokemonPoolEntry[] = [
  // Gen 1 Basic
  { pokemonId: 10, name: 'Caterpie', nameEs: 'Caterpie', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 13, name: 'Weedle', nameEs: 'Weedle', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 16, name: 'Pidgey', nameEs: 'Pidgey', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 19, name: 'Rattata', nameEs: 'Rattata', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 21, name: 'Spearow', nameEs: 'Spearow', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 23, name: 'Ekans', nameEs: 'Ekans', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 27, name: 'Sandshrew', nameEs: 'Sandshrew', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 29, name: 'Nidoran♀', nameEs: 'Nidoran♀', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 32, name: 'Nidoran♂', nameEs: 'Nidoran♂', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 35, name: 'Clefairy', nameEs: 'Clefairy', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 39, name: 'Jigglypuff', nameEs: 'Jigglypuff', rarity: 'common', baseWeight: 1, types: ['Normal', 'Fairy'] },
  { pokemonId: 41, name: 'Zubat', nameEs: 'Zubat', rarity: 'common', baseWeight: 1, types: ['Poison', 'Flying'] },
  { pokemonId: 43, name: 'Oddish', nameEs: 'Oddish', rarity: 'common', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 46, name: 'Paras', nameEs: 'Paras', rarity: 'common', baseWeight: 1, types: ['Bug', 'Grass'] },
  { pokemonId: 48, name: 'Venonat', nameEs: 'Venonat', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 50, name: 'Diglett', nameEs: 'Diglett', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 52, name: 'Meowth', nameEs: 'Meowth', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 54, name: 'Psyduck', nameEs: 'Psyduck', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 56, name: 'Mankey', nameEs: 'Mankey', rarity: 'common', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 69, name: 'Bellsprout', nameEs: 'Bellsprout', rarity: 'common', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 72, name: 'Tentacool', nameEs: 'Tentacool', rarity: 'common', baseWeight: 1, types: ['Water', 'Poison'] },
  { pokemonId: 74, name: 'Geodude', nameEs: 'Geodude', rarity: 'common', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 77, name: 'Ponyta', nameEs: 'Ponyta', rarity: 'common', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 79, name: 'Slowpoke', nameEs: 'Slowpoke', rarity: 'common', baseWeight: 1, types: ['Water', 'Psychic'] },
  { pokemonId: 81, name: 'Magnemite', nameEs: 'Magnemite', rarity: 'common', baseWeight: 1, types: ['Electric', 'Steel'] },
  { pokemonId: 84, name: 'Doduo', nameEs: 'Doduo', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 86, name: 'Seel', nameEs: 'Seel', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 88, name: 'Grimer', nameEs: 'Grimer', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 90, name: 'Shellder', nameEs: 'Shellder', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 92, name: 'Gastly', nameEs: 'Gastly', rarity: 'common', baseWeight: 1, types: ['Ghost', 'Poison'] },
  { pokemonId: 96, name: 'Drowzee', nameEs: 'Drowzee', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 98, name: 'Krabby', nameEs: 'Krabby', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 100, name: 'Voltorb', nameEs: 'Voltorb', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 102, name: 'Exeggcute', nameEs: 'Exeggcute', rarity: 'common', baseWeight: 1, types: ['Grass', 'Psychic'] },
  { pokemonId: 104, name: 'Cubone', nameEs: 'Cubone', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 109, name: 'Koffing', nameEs: 'Koffing', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 116, name: 'Horsea', nameEs: 'Horsea', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 118, name: 'Goldeen', nameEs: 'Goldeen', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 120, name: 'Staryu', nameEs: 'Staryu', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 129, name: 'Magikarp', nameEs: 'Magikarp', rarity: 'common', baseWeight: 1, types: ['Water'] },
  // Gen 2 Basic
  { pokemonId: 161, name: 'Sentret', nameEs: 'Sentret', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 163, name: 'Hoothoot', nameEs: 'Hoothoot', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 165, name: 'Ledyba', nameEs: 'Ledyba', rarity: 'common', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 167, name: 'Spinarak', nameEs: 'Spinarak', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 170, name: 'Chinchou', nameEs: 'Chinchou', rarity: 'common', baseWeight: 1, types: ['Water', 'Electric'] },
  { pokemonId: 177, name: 'Natu', nameEs: 'Natu', rarity: 'common', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 179, name: 'Mareep', nameEs: 'Mareep', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 183, name: 'Marill', nameEs: 'Marill', rarity: 'common', baseWeight: 1, types: ['Water', 'Fairy'] },
  { pokemonId: 187, name: 'Hoppip', nameEs: 'Hoppip', rarity: 'common', baseWeight: 1, types: ['Grass', 'Flying'] },
  { pokemonId: 191, name: 'Sunkern', nameEs: 'Sunkern', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 193, name: 'Yanma', nameEs: 'Yanma', rarity: 'common', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 194, name: 'Wooper', nameEs: 'Wooper', rarity: 'common', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 198, name: 'Murkrow', nameEs: 'Murkrow', rarity: 'common', baseWeight: 1, types: ['Dark', 'Flying'] },
  { pokemonId: 200, name: 'Misdreavus', nameEs: 'Misdreavus', rarity: 'common', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 204, name: 'Pineco', nameEs: 'Pineco', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 206, name: 'Dunsparce', nameEs: 'Dunsparce', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 209, name: 'Snubbull', nameEs: 'Snubbull', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 211, name: 'Qwilfish', nameEs: 'Qwilfish', rarity: 'common', baseWeight: 1, types: ['Water', 'Poison'] },
  { pokemonId: 213, name: 'Shuckle', nameEs: 'Shuckle', rarity: 'common', baseWeight: 1, types: ['Bug', 'Rock'] },
  { pokemonId: 216, name: 'Teddiursa', nameEs: 'Teddiursa', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 218, name: 'Slugma', nameEs: 'Slugma', rarity: 'common', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 220, name: 'Swinub', nameEs: 'Swinub', rarity: 'common', baseWeight: 1, types: ['Ice', 'Ground'] },
  { pokemonId: 223, name: 'Remoraid', nameEs: 'Remoraid', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 228, name: 'Houndour', nameEs: 'Houndour', rarity: 'common', baseWeight: 1, types: ['Dark', 'Fire'] },
  { pokemonId: 231, name: 'Phanpy', nameEs: 'Phanpy', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  // Gen 3 Basic
  { pokemonId: 263, name: 'Zigzagoon', nameEs: 'Zigzagoon', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 265, name: 'Wurmple', nameEs: 'Wurmple', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 270, name: 'Lotad', nameEs: 'Lotad', rarity: 'common', baseWeight: 1, types: ['Water', 'Grass'] },
  { pokemonId: 273, name: 'Seedot', nameEs: 'Seedot', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 276, name: 'Taillow', nameEs: 'Taillow', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 278, name: 'Wingull', nameEs: 'Wingull', rarity: 'common', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 280, name: 'Ralts', nameEs: 'Ralts', rarity: 'common', baseWeight: 1, types: ['Psychic', 'Fairy'] },
  { pokemonId: 283, name: 'Surskit', nameEs: 'Surskit', rarity: 'common', baseWeight: 1, types: ['Bug', 'Water'] },
  { pokemonId: 285, name: 'Shroomish', nameEs: 'Shroomish', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 287, name: 'Slakoth', nameEs: 'Slakoth', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 290, name: 'Nincada', nameEs: 'Nincada', rarity: 'common', baseWeight: 1, types: ['Bug', 'Ground'] },
  { pokemonId: 293, name: 'Whismur', nameEs: 'Whismur', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 296, name: 'Makuhita', nameEs: 'Makuhita', rarity: 'common', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 299, name: 'Nosepass', nameEs: 'Nosepass', rarity: 'common', baseWeight: 1, types: ['Rock'] },
  { pokemonId: 300, name: 'Skitty', nameEs: 'Skitty', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 304, name: 'Aron', nameEs: 'Aron', rarity: 'common', baseWeight: 1, types: ['Steel', 'Rock'] },
  { pokemonId: 307, name: 'Meditite', nameEs: 'Meditite', rarity: 'common', baseWeight: 1, types: ['Fighting', 'Psychic'] },
  { pokemonId: 309, name: 'Electrike', nameEs: 'Electrike', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 311, name: 'Plusle', nameEs: 'Plusle', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 312, name: 'Minun', nameEs: 'Minun', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 316, name: 'Gulpin', nameEs: 'Gulpin', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 318, name: 'Carvanha', nameEs: 'Carvanha', rarity: 'common', baseWeight: 1, types: ['Water', 'Dark'] },
  { pokemonId: 320, name: 'Wailmer', nameEs: 'Wailmer', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 322, name: 'Numel', nameEs: 'Numel', rarity: 'common', baseWeight: 1, types: ['Fire', 'Ground'] },
  { pokemonId: 325, name: 'Spoink', nameEs: 'Spoink', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 328, name: 'Trapinch', nameEs: 'Trapinch', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 331, name: 'Cacnea', nameEs: 'Cacnea', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 333, name: 'Swablu', nameEs: 'Swablu', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 339, name: 'Barboach', nameEs: 'Barboach', rarity: 'common', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 341, name: 'Corphish', nameEs: 'Corphish', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 343, name: 'Baltoy', nameEs: 'Baltoy', rarity: 'common', baseWeight: 1, types: ['Ground', 'Psychic'] },
  { pokemonId: 349, name: 'Feebas', nameEs: 'Feebas', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 351, name: 'Castform', nameEs: 'Castform', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 353, name: 'Shuppet', nameEs: 'Shuppet', rarity: 'common', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 355, name: 'Duskull', nameEs: 'Duskull', rarity: 'common', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 361, name: 'Snorunt', nameEs: 'Snorunt', rarity: 'common', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 363, name: 'Spheal', nameEs: 'Spheal', rarity: 'common', baseWeight: 1, types: ['Ice', 'Water'] },
  // Gen 4 Basic
  { pokemonId: 396, name: 'Starly', nameEs: 'Starly', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 399, name: 'Bidoof', nameEs: 'Bidoof', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 401, name: 'Kricketot', nameEs: 'Kricketot', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 403, name: 'Shinx', nameEs: 'Shinx', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 406, name: 'Budew', nameEs: 'Budew', rarity: 'common', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 412, name: 'Burmy', nameEs: 'Burmy', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 415, name: 'Combee', nameEs: 'Combee', rarity: 'common', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 417, name: 'Pachirisu', nameEs: 'Pachirisu', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 418, name: 'Buizel', nameEs: 'Buizel', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 420, name: 'Cherubi', nameEs: 'Cherubi', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 422, name: 'Shellos', nameEs: 'Shellos', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 427, name: 'Buneary', nameEs: 'Buneary', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 431, name: 'Glameow', nameEs: 'Glameow', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 434, name: 'Stunky', nameEs: 'Stunky', rarity: 'common', baseWeight: 1, types: ['Poison', 'Dark'] },
  { pokemonId: 436, name: 'Bronzor', nameEs: 'Bronzor', rarity: 'common', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 441, name: 'Chatot', nameEs: 'Chatot', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 449, name: 'Hippopotas', nameEs: 'Hippopotas', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 451, name: 'Skorupi', nameEs: 'Skorupi', rarity: 'common', baseWeight: 1, types: ['Poison', 'Bug'] },
  { pokemonId: 453, name: 'Croagunk', nameEs: 'Croagunk', rarity: 'common', baseWeight: 1, types: ['Poison', 'Fighting'] },
  { pokemonId: 456, name: 'Finneon', nameEs: 'Finneon', rarity: 'common', baseWeight: 1, types: ['Water'] },
  // Gen 5 Basic
  { pokemonId: 504, name: 'Patrat', nameEs: 'Patrat', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 506, name: 'Lillipup', nameEs: 'Lillipup', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 509, name: 'Purrloin', nameEs: 'Purrloin', rarity: 'common', baseWeight: 1, types: ['Dark'] },
  { pokemonId: 519, name: 'Pidove', nameEs: 'Pidove', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 522, name: 'Blitzle', nameEs: 'Blitzle', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 527, name: 'Woobat', nameEs: 'Woobat', rarity: 'common', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 529, name: 'Drilbur', nameEs: 'Drilbur', rarity: 'common', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 535, name: 'Tympole', nameEs: 'Tympole', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 540, name: 'Sewaddle', nameEs: 'Sewaddle', rarity: 'common', baseWeight: 1, types: ['Bug', 'Grass'] },
  { pokemonId: 543, name: 'Venipede', nameEs: 'Venipede', rarity: 'common', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 546, name: 'Cottonee', nameEs: 'Cottonee', rarity: 'common', baseWeight: 1, types: ['Grass', 'Fairy'] },
  { pokemonId: 548, name: 'Petilil', nameEs: 'Petilil', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 551, name: 'Sandile', nameEs: 'Sandile', rarity: 'common', baseWeight: 1, types: ['Ground', 'Dark'] },
  { pokemonId: 557, name: 'Dwebble', nameEs: 'Dwebble', rarity: 'common', baseWeight: 1, types: ['Bug', 'Rock'] },
  { pokemonId: 562, name: 'Yamask', nameEs: 'Yamask', rarity: 'common', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 568, name: 'Trubbish', nameEs: 'Trubbish', rarity: 'common', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 572, name: 'Minccino', nameEs: 'Minccino', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 577, name: 'Solosis', nameEs: 'Solosis', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 580, name: 'Ducklett', nameEs: 'Ducklett', rarity: 'common', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 585, name: 'Deerling', nameEs: 'Deerling', rarity: 'common', baseWeight: 1, types: ['Normal', 'Grass'] },
  { pokemonId: 588, name: 'Karrablast', nameEs: 'Karrablast', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 590, name: 'Foongus', nameEs: 'Foongus', rarity: 'common', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 592, name: 'Frillish', nameEs: 'Frillish', rarity: 'common', baseWeight: 1, types: ['Water', 'Ghost'] },
  { pokemonId: 595, name: 'Joltik', nameEs: 'Joltik', rarity: 'common', baseWeight: 1, types: ['Bug', 'Electric'] },
  { pokemonId: 597, name: 'Ferroseed', nameEs: 'Ferroseed', rarity: 'common', baseWeight: 1, types: ['Grass', 'Steel'] },
  { pokemonId: 602, name: 'Tynamo', nameEs: 'Tynamo', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 605, name: 'Elgyem', nameEs: 'Elgyem', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 607, name: 'Litwick', nameEs: 'Litwick', rarity: 'common', baseWeight: 1, types: ['Ghost', 'Fire'] },
  { pokemonId: 613, name: 'Cubchoo', nameEs: 'Cubchoo', rarity: 'common', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 616, name: 'Shelmet', nameEs: 'Shelmet', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 619, name: 'Mienfoo', nameEs: 'Mienfoo', rarity: 'common', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 622, name: 'Golett', nameEs: 'Golett', rarity: 'common', baseWeight: 1, types: ['Ground', 'Ghost'] },
  { pokemonId: 624, name: 'Pawniard', nameEs: 'Pawniard', rarity: 'common', baseWeight: 1, types: ['Dark', 'Steel'] },
  // Gen 6-9 Basic
  { pokemonId: 659, name: 'Bunnelby', nameEs: 'Bunnelby', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 661, name: 'Fletchling', nameEs: 'Fletchling', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 664, name: 'Scatterbug', nameEs: 'Scatterbug', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 669, name: 'Flabebe', nameEs: 'Flabebe', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 672, name: 'Skiddo', nameEs: 'Skiddo', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 674, name: 'Pancham', nameEs: 'Pancham', rarity: 'common', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 677, name: 'Espurr', nameEs: 'Espurr', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 682, name: 'Spritzee', nameEs: 'Spritzee', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 684, name: 'Swirlix', nameEs: 'Swirlix', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 686, name: 'Inkay', nameEs: 'Inkay', rarity: 'common', baseWeight: 1, types: ['Dark', 'Psychic'] },
  { pokemonId: 688, name: 'Binacle', nameEs: 'Binacle', rarity: 'common', baseWeight: 1, types: ['Rock', 'Water'] },
  { pokemonId: 690, name: 'Skrelp', nameEs: 'Skrelp', rarity: 'common', baseWeight: 1, types: ['Poison', 'Water'] },
  { pokemonId: 692, name: 'Clauncher', nameEs: 'Clauncher', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 694, name: 'Helioptile', nameEs: 'Helioptile', rarity: 'common', baseWeight: 1, types: ['Electric', 'Normal'] },
  { pokemonId: 704, name: 'Goomy', nameEs: 'Goomy', rarity: 'common', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 714, name: 'Noibat', nameEs: 'Noibat', rarity: 'common', baseWeight: 1, types: ['Flying', 'Dragon'] },
  { pokemonId: 731, name: 'Pikipek', nameEs: 'Pikipek', rarity: 'common', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 734, name: 'Yungoos', nameEs: 'Yungoos', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 736, name: 'Grubbin', nameEs: 'Grubbin', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 742, name: 'Cutiefly', nameEs: 'Cutiefly', rarity: 'common', baseWeight: 1, types: ['Bug', 'Fairy'] },
  { pokemonId: 744, name: 'Rockruff', nameEs: 'Rockruff', rarity: 'common', baseWeight: 1, types: ['Rock'] },
  { pokemonId: 747, name: 'Mareanie', nameEs: 'Mareanie', rarity: 'common', baseWeight: 1, types: ['Poison', 'Water'] },
  { pokemonId: 751, name: 'Dewpider', nameEs: 'Dewpider', rarity: 'common', baseWeight: 1, types: ['Water', 'Bug'] },
  { pokemonId: 753, name: 'Fomantis', nameEs: 'Fomantis', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 757, name: 'Salandit', nameEs: 'Salandit', rarity: 'common', baseWeight: 1, types: ['Poison', 'Fire'] },
  { pokemonId: 759, name: 'Stufful', nameEs: 'Stufful', rarity: 'common', baseWeight: 1, types: ['Normal', 'Fighting'] },
  { pokemonId: 761, name: 'Bounsweet', nameEs: 'Bounsweet', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 767, name: 'Wimpod', nameEs: 'Wimpod', rarity: 'common', baseWeight: 1, types: ['Bug', 'Water'] },
  { pokemonId: 819, name: 'Skwovet', nameEs: 'Skwovet', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 821, name: 'Rookidee', nameEs: 'Rookidee', rarity: 'common', baseWeight: 1, types: ['Flying'] },
  { pokemonId: 824, name: 'Blipbug', nameEs: 'Blipbug', rarity: 'common', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 827, name: 'Nickit', nameEs: 'Nickit', rarity: 'common', baseWeight: 1, types: ['Dark'] },
  { pokemonId: 829, name: 'Gossifleur', nameEs: 'Gossifleur', rarity: 'common', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 831, name: 'Wooloo', nameEs: 'Wooloo', rarity: 'common', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 833, name: 'Chewtle', nameEs: 'Chewtle', rarity: 'common', baseWeight: 1, types: ['Water'] },
  { pokemonId: 835, name: 'Yamper', nameEs: 'Yamper', rarity: 'common', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 840, name: 'Applin', nameEs: 'Applin', rarity: 'common', baseWeight: 1, types: ['Grass', 'Dragon'] },
  { pokemonId: 850, name: 'Sizzlipede', nameEs: 'Sizzlipede', rarity: 'common', baseWeight: 1, types: ['Fire', 'Bug'] },
  { pokemonId: 854, name: 'Sinistea', nameEs: 'Sinistea', rarity: 'common', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 856, name: 'Hatenna', nameEs: 'Hatenna', rarity: 'common', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 859, name: 'Impidimp', nameEs: 'Impidimp', rarity: 'common', baseWeight: 1, types: ['Dark', 'Fairy'] },
  { pokemonId: 868, name: 'Milcery', nameEs: 'Milcery', rarity: 'common', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 872, name: 'Snom', nameEs: 'Snom', rarity: 'common', baseWeight: 1, types: ['Ice', 'Bug'] },
  { pokemonId: 878, name: 'Cufant', nameEs: 'Cufant', rarity: 'common', baseWeight: 1, types: ['Steel'] },
  { pokemonId: 885, name: 'Dreepy', nameEs: 'Dreepy', rarity: 'common', baseWeight: 1, types: ['Dragon', 'Ghost'] },
];

/**
 * Pokémon Poco Comunes (25% probabilidad base) - ~100 Pokemon
 * Pokémon de primera evolución y algunos básicos más raros
 */
export const UNCOMMON_POKEMON: PokemonPoolEntry[] = [
  // Gen 1 Mid-evolutions
  { pokemonId: 11, name: 'Metapod', nameEs: 'Metapod', rarity: 'uncommon', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 14, name: 'Kakuna', nameEs: 'Kakuna', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 17, name: 'Pidgeotto', nameEs: 'Pidgeotto', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 20, name: 'Raticate', nameEs: 'Raticate', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 22, name: 'Fearow', nameEs: 'Fearow', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 24, name: 'Arbok', nameEs: 'Arbok', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 25, name: 'Pikachu', nameEs: 'Pikachu', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 28, name: 'Sandslash', nameEs: 'Sandslash', rarity: 'uncommon', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 30, name: 'Nidorina', nameEs: 'Nidorina', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 33, name: 'Nidorino', nameEs: 'Nidorino', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 36, name: 'Clefable', nameEs: 'Clefable', rarity: 'uncommon', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 37, name: 'Vulpix', nameEs: 'Vulpix', rarity: 'uncommon', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 42, name: 'Golbat', nameEs: 'Golbat', rarity: 'uncommon', baseWeight: 1, types: ['Poison', 'Flying'] },
  { pokemonId: 44, name: 'Gloom', nameEs: 'Gloom', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 47, name: 'Parasect', nameEs: 'Parasect', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Grass'] },
  { pokemonId: 49, name: 'Venomoth', nameEs: 'Venomoth', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 51, name: 'Dugtrio', nameEs: 'Dugtrio', rarity: 'uncommon', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 53, name: 'Persian', nameEs: 'Persian', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 55, name: 'Golduck', nameEs: 'Golduck', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 57, name: 'Primeape', nameEs: 'Primeape', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 58, name: 'Growlithe', nameEs: 'Growlithe', rarity: 'uncommon', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 60, name: 'Poliwag', nameEs: 'Poliwag', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 61, name: 'Poliwhirl', nameEs: 'Poliwhirl', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 63, name: 'Abra', nameEs: 'Abra', rarity: 'uncommon', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 66, name: 'Machop', nameEs: 'Machop', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 67, name: 'Machoke', nameEs: 'Machoke', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 70, name: 'Weepinbell', nameEs: 'Weepinbell', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 75, name: 'Graveler', nameEs: 'Graveler', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 80, name: 'Slowbro', nameEs: 'Slowbro', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Psychic'] },
  { pokemonId: 82, name: 'Magneton', nameEs: 'Magneton', rarity: 'uncommon', baseWeight: 1, types: ['Electric', 'Steel'] },
  { pokemonId: 85, name: 'Dodrio', nameEs: 'Dodrio', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 87, name: 'Dewgong', nameEs: 'Dewgong', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Ice'] },
  { pokemonId: 89, name: 'Muk', nameEs: 'Muk', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 93, name: 'Haunter', nameEs: 'Haunter', rarity: 'uncommon', baseWeight: 1, types: ['Ghost', 'Poison'] },
  { pokemonId: 95, name: 'Onix', nameEs: 'Onix', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 97, name: 'Hypno', nameEs: 'Hypno', rarity: 'uncommon', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 99, name: 'Kingler', nameEs: 'Kingler', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 101, name: 'Electrode', nameEs: 'Electrode', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 105, name: 'Marowak', nameEs: 'Marowak', rarity: 'uncommon', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 108, name: 'Lickitung', nameEs: 'Lickitung', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 110, name: 'Weezing', nameEs: 'Weezing', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 111, name: 'Rhyhorn', nameEs: 'Rhyhorn', rarity: 'uncommon', baseWeight: 1, types: ['Ground', 'Rock'] },
  { pokemonId: 114, name: 'Tangela', nameEs: 'Tangela', rarity: 'uncommon', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 117, name: 'Seadra', nameEs: 'Seadra', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 119, name: 'Seaking', nameEs: 'Seaking', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 122, name: 'Mr. Mime', nameEs: 'Mr. Mime', rarity: 'uncommon', baseWeight: 1, types: ['Psychic', 'Fairy'] },
  { pokemonId: 123, name: 'Scyther', nameEs: 'Scyther', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 124, name: 'Jynx', nameEs: 'Jynx', rarity: 'uncommon', baseWeight: 1, types: ['Ice', 'Psychic'] },
  { pokemonId: 125, name: 'Electabuzz', nameEs: 'Electabuzz', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 126, name: 'Magmar', nameEs: 'Magmar', rarity: 'uncommon', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 127, name: 'Pinsir', nameEs: 'Pinsir', rarity: 'uncommon', baseWeight: 1, types: ['Bug'] },
  { pokemonId: 128, name: 'Tauros', nameEs: 'Tauros', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 132, name: 'Ditto', nameEs: 'Ditto', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 133, name: 'Eevee', nameEs: 'Eevee', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 137, name: 'Porygon', nameEs: 'Porygon', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 138, name: 'Omanyte', nameEs: 'Omanyte', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Water'] },
  { pokemonId: 140, name: 'Kabuto', nameEs: 'Kabuto', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Water'] },
  { pokemonId: 142, name: 'Aerodactyl', nameEs: 'Aerodactyl', rarity: 'uncommon', baseWeight: 1, types: ['Rock', 'Flying'] },
  // Gen 2 Mid-evolutions
  { pokemonId: 162, name: 'Furret', nameEs: 'Furret', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 164, name: 'Noctowl', nameEs: 'Noctowl', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 166, name: 'Ledian', nameEs: 'Ledian', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 168, name: 'Ariados', nameEs: 'Ariados', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 171, name: 'Lanturn', nameEs: 'Lanturn', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Electric'] },
  { pokemonId: 178, name: 'Xatu', nameEs: 'Xatu', rarity: 'uncommon', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 180, name: 'Flaaffy', nameEs: 'Flaaffy', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 184, name: 'Azumarill', nameEs: 'Azumarill', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Fairy'] },
  { pokemonId: 188, name: 'Skiploom', nameEs: 'Skiploom', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Flying'] },
  { pokemonId: 195, name: 'Quagsire', nameEs: 'Quagsire', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 203, name: 'Girafarig', nameEs: 'Girafarig', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Psychic'] },
  { pokemonId: 205, name: 'Forretress', nameEs: 'Forretress', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Steel'] },
  { pokemonId: 207, name: 'Gligar', nameEs: 'Gligar', rarity: 'uncommon', baseWeight: 1, types: ['Ground', 'Flying'] },
  { pokemonId: 210, name: 'Granbull', nameEs: 'Granbull', rarity: 'uncommon', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 212, name: 'Scizor', nameEs: 'Scizor', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Steel'] },
  { pokemonId: 214, name: 'Heracross', nameEs: 'Heracross', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Fighting'] },
  { pokemonId: 215, name: 'Sneasel', nameEs: 'Sneasel', rarity: 'uncommon', baseWeight: 1, types: ['Dark', 'Ice'] },
  { pokemonId: 217, name: 'Ursaring', nameEs: 'Ursaring', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 219, name: 'Magcargo', nameEs: 'Magcargo', rarity: 'uncommon', baseWeight: 1, types: ['Fire', 'Rock'] },
  { pokemonId: 221, name: 'Piloswine', nameEs: 'Piloswine', rarity: 'uncommon', baseWeight: 1, types: ['Ice', 'Ground'] },
  { pokemonId: 222, name: 'Corsola', nameEs: 'Corsola', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Rock'] },
  { pokemonId: 224, name: 'Octillery', nameEs: 'Octillery', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 225, name: 'Delibird', nameEs: 'Delibird', rarity: 'uncommon', baseWeight: 1, types: ['Ice', 'Flying'] },
  { pokemonId: 226, name: 'Mantine', nameEs: 'Mantine', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 227, name: 'Skarmory', nameEs: 'Skarmory', rarity: 'uncommon', baseWeight: 1, types: ['Steel', 'Flying'] },
  { pokemonId: 229, name: 'Houndoom', nameEs: 'Houndoom', rarity: 'uncommon', baseWeight: 1, types: ['Dark', 'Fire'] },
  { pokemonId: 232, name: 'Donphan', nameEs: 'Donphan', rarity: 'uncommon', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 234, name: 'Stantler', nameEs: 'Stantler', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 235, name: 'Smeargle', nameEs: 'Smeargle', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 237, name: 'Hitmontop', nameEs: 'Hitmontop', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 241, name: 'Miltank', nameEs: 'Miltank', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  // Gen 3-9 Mid-evolutions
  { pokemonId: 264, name: 'Linoone', nameEs: 'Linoone', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 271, name: 'Lombre', nameEs: 'Lombre', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Grass'] },
  { pokemonId: 274, name: 'Nuzleaf', nameEs: 'Nuzleaf', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Dark'] },
  { pokemonId: 277, name: 'Swellow', nameEs: 'Swellow', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 279, name: 'Pelipper', nameEs: 'Pelipper', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 281, name: 'Kirlia', nameEs: 'Kirlia', rarity: 'uncommon', baseWeight: 1, types: ['Psychic', 'Fairy'] },
  { pokemonId: 286, name: 'Breloom', nameEs: 'Breloom', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Fighting'] },
  { pokemonId: 288, name: 'Vigoroth', nameEs: 'Vigoroth', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 294, name: 'Loudred', nameEs: 'Loudred', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 297, name: 'Hariyama', nameEs: 'Hariyama', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 305, name: 'Lairon', nameEs: 'Lairon', rarity: 'uncommon', baseWeight: 1, types: ['Steel', 'Rock'] },
  { pokemonId: 308, name: 'Medicham', nameEs: 'Medicham', rarity: 'uncommon', baseWeight: 1, types: ['Fighting', 'Psychic'] },
  { pokemonId: 310, name: 'Manectric', nameEs: 'Manectric', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 317, name: 'Swalot', nameEs: 'Swalot', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 319, name: 'Sharpedo', nameEs: 'Sharpedo', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Dark'] },
  { pokemonId: 321, name: 'Wailord', nameEs: 'Wailord', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 323, name: 'Camerupt', nameEs: 'Camerupt', rarity: 'uncommon', baseWeight: 1, types: ['Fire', 'Ground'] },
  { pokemonId: 326, name: 'Grumpig', nameEs: 'Grumpig', rarity: 'uncommon', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 329, name: 'Vibrava', nameEs: 'Vibrava', rarity: 'uncommon', baseWeight: 1, types: ['Ground', 'Dragon'] },
  { pokemonId: 332, name: 'Cacturne', nameEs: 'Cacturne', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Dark'] },
  { pokemonId: 340, name: 'Whiscash', nameEs: 'Whiscash', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 342, name: 'Crawdaunt', nameEs: 'Crawdaunt', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Dark'] },
  { pokemonId: 344, name: 'Claydol', nameEs: 'Claydol', rarity: 'uncommon', baseWeight: 1, types: ['Ground', 'Psychic'] },
  { pokemonId: 354, name: 'Banette', nameEs: 'Banette', rarity: 'uncommon', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 356, name: 'Dusclops', nameEs: 'Dusclops', rarity: 'uncommon', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 362, name: 'Glalie', nameEs: 'Glalie', rarity: 'uncommon', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 364, name: 'Sealeo', nameEs: 'Sealeo', rarity: 'uncommon', baseWeight: 1, types: ['Ice', 'Water'] },
  { pokemonId: 397, name: 'Staravia', nameEs: 'Staravia', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 400, name: 'Bibarel', nameEs: 'Bibarel', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Water'] },
  { pokemonId: 404, name: 'Luxio', nameEs: 'Luxio', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 419, name: 'Floatzel', nameEs: 'Floatzel', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 423, name: 'Gastrodon', nameEs: 'Gastrodon', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 428, name: 'Lopunny', nameEs: 'Lopunny', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 432, name: 'Purugly', nameEs: 'Purugly', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 435, name: 'Skuntank', nameEs: 'Skuntank', rarity: 'uncommon', baseWeight: 1, types: ['Poison', 'Dark'] },
  { pokemonId: 437, name: 'Bronzong', nameEs: 'Bronzong', rarity: 'uncommon', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 450, name: 'Hippowdon', nameEs: 'Hippowdon', rarity: 'uncommon', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 452, name: 'Drapion', nameEs: 'Drapion', rarity: 'uncommon', baseWeight: 1, types: ['Poison', 'Dark'] },
  { pokemonId: 454, name: 'Toxicroak', nameEs: 'Toxicroak', rarity: 'uncommon', baseWeight: 1, types: ['Poison', 'Fighting'] },
  { pokemonId: 457, name: 'Lumineon', nameEs: 'Lumineon', rarity: 'uncommon', baseWeight: 1, types: ['Water'] },
  { pokemonId: 505, name: 'Watchog', nameEs: 'Watchog', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 507, name: 'Herdier', nameEs: 'Herdier', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 510, name: 'Liepard', nameEs: 'Liepard', rarity: 'uncommon', baseWeight: 1, types: ['Dark'] },
  { pokemonId: 520, name: 'Tranquill', nameEs: 'Tranquill', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 523, name: 'Zebstrika', nameEs: 'Zebstrika', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 528, name: 'Swoobat', nameEs: 'Swoobat', rarity: 'uncommon', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 536, name: 'Palpitoad', nameEs: 'Palpitoad', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 541, name: 'Swadloon', nameEs: 'Swadloon', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Grass'] },
  { pokemonId: 544, name: 'Whirlipede', nameEs: 'Whirlipede', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 552, name: 'Krokorok', nameEs: 'Krokorok', rarity: 'uncommon', baseWeight: 1, types: ['Ground', 'Dark'] },
  { pokemonId: 558, name: 'Crustle', nameEs: 'Crustle', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Rock'] },
  { pokemonId: 569, name: 'Garbodor', nameEs: 'Garbodor', rarity: 'uncommon', baseWeight: 1, types: ['Poison'] },
  { pokemonId: 573, name: 'Cinccino', nameEs: 'Cinccino', rarity: 'uncommon', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 578, name: 'Duosion', nameEs: 'Duosion', rarity: 'uncommon', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 581, name: 'Swanna', nameEs: 'Swanna', rarity: 'uncommon', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 586, name: 'Sawsbuck', nameEs: 'Sawsbuck', rarity: 'uncommon', baseWeight: 1, types: ['Normal', 'Grass'] },
  { pokemonId: 591, name: 'Amoonguss', nameEs: 'Amoonguss', rarity: 'uncommon', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 596, name: 'Galvantula', nameEs: 'Galvantula', rarity: 'uncommon', baseWeight: 1, types: ['Bug', 'Electric'] },
  { pokemonId: 603, name: 'Eelektrik', nameEs: 'Eelektrik', rarity: 'uncommon', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 608, name: 'Lampent', nameEs: 'Lampent', rarity: 'uncommon', baseWeight: 1, types: ['Ghost', 'Fire'] },
  { pokemonId: 614, name: 'Beartic', nameEs: 'Beartic', rarity: 'uncommon', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 620, name: 'Mienshao', nameEs: 'Mienshao', rarity: 'uncommon', baseWeight: 1, types: ['Fighting'] },
];


/**
 * Pokémon Raros (10% probabilidad base) - ~80 Pokemon
 * Pokémon de evolución final y algunos especiales
 */
export const RARE_POKEMON: PokemonPoolEntry[] = [
  // Gen 1 Final evolutions
  { pokemonId: 3, name: 'Venusaur', nameEs: 'Venusaur', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 6, name: 'Charizard', nameEs: 'Charizard', rarity: 'rare', baseWeight: 1, types: ['Fire', 'Flying'] },
  { pokemonId: 9, name: 'Blastoise', nameEs: 'Blastoise', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 12, name: 'Butterfree', nameEs: 'Butterfree', rarity: 'rare', baseWeight: 1, types: ['Bug', 'Flying'] },
  { pokemonId: 15, name: 'Beedrill', nameEs: 'Beedrill', rarity: 'rare', baseWeight: 1, types: ['Bug', 'Poison'] },
  { pokemonId: 18, name: 'Pidgeot', nameEs: 'Pidgeot', rarity: 'rare', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 26, name: 'Raichu', nameEs: 'Raichu', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 31, name: 'Nidoqueen', nameEs: 'Nidoqueen', rarity: 'rare', baseWeight: 1, types: ['Poison', 'Ground'] },
  { pokemonId: 34, name: 'Nidoking', nameEs: 'Nidoking', rarity: 'rare', baseWeight: 1, types: ['Poison', 'Ground'] },
  { pokemonId: 38, name: 'Ninetales', nameEs: 'Ninetales', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 40, name: 'Wigglytuff', nameEs: 'Wigglytuff', rarity: 'rare', baseWeight: 1, types: ['Normal', 'Fairy'] },
  { pokemonId: 45, name: 'Vileplume', nameEs: 'Vileplume', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 59, name: 'Arcanine', nameEs: 'Arcanine', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 62, name: 'Poliwrath', nameEs: 'Poliwrath', rarity: 'rare', baseWeight: 1, types: ['Water', 'Fighting'] },
  { pokemonId: 65, name: 'Alakazam', nameEs: 'Alakazam', rarity: 'rare', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 68, name: 'Machamp', nameEs: 'Machamp', rarity: 'rare', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 71, name: 'Victreebel', nameEs: 'Victreebel', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 73, name: 'Tentacruel', nameEs: 'Tentacruel', rarity: 'rare', baseWeight: 1, types: ['Water', 'Poison'] },
  { pokemonId: 76, name: 'Golem', nameEs: 'Golem', rarity: 'rare', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 78, name: 'Rapidash', nameEs: 'Rapidash', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 91, name: 'Cloyster', nameEs: 'Cloyster', rarity: 'rare', baseWeight: 1, types: ['Water', 'Ice'] },
  { pokemonId: 94, name: 'Gengar', nameEs: 'Gengar', rarity: 'rare', baseWeight: 1, types: ['Ghost', 'Poison'] },
  { pokemonId: 103, name: 'Exeggutor', nameEs: 'Exeggutor', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Psychic'] },
  { pokemonId: 106, name: 'Hitmonlee', nameEs: 'Hitmonlee', rarity: 'rare', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 107, name: 'Hitmonchan', nameEs: 'Hitmonchan', rarity: 'rare', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 112, name: 'Rhydon', nameEs: 'Rhydon', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Rock'] },
  { pokemonId: 113, name: 'Chansey', nameEs: 'Chansey', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 115, name: 'Kangaskhan', nameEs: 'Kangaskhan', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 121, name: 'Starmie', nameEs: 'Starmie', rarity: 'rare', baseWeight: 1, types: ['Water', 'Psychic'] },
  { pokemonId: 130, name: 'Gyarados', nameEs: 'Gyarados', rarity: 'rare', baseWeight: 1, types: ['Water', 'Flying'] },
  { pokemonId: 131, name: 'Lapras', nameEs: 'Lapras', rarity: 'rare', baseWeight: 1, types: ['Water', 'Ice'] },
  { pokemonId: 134, name: 'Vaporeon', nameEs: 'Vaporeon', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 135, name: 'Jolteon', nameEs: 'Jolteon', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 136, name: 'Flareon', nameEs: 'Flareon', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 139, name: 'Omastar', nameEs: 'Omastar', rarity: 'rare', baseWeight: 1, types: ['Rock', 'Water'] },
  { pokemonId: 141, name: 'Kabutops', nameEs: 'Kabutops', rarity: 'rare', baseWeight: 1, types: ['Rock', 'Water'] },
  { pokemonId: 143, name: 'Snorlax', nameEs: 'Snorlax', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  // Gen 2 Final evolutions
  { pokemonId: 154, name: 'Meganium', nameEs: 'Meganium', rarity: 'rare', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 157, name: 'Typhlosion', nameEs: 'Typhlosion', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 160, name: 'Feraligatr', nameEs: 'Feraligatr', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 169, name: 'Crobat', nameEs: 'Crobat', rarity: 'rare', baseWeight: 1, types: ['Poison', 'Flying'] },
  { pokemonId: 181, name: 'Ampharos', nameEs: 'Ampharos', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 182, name: 'Bellossom', nameEs: 'Bellossom', rarity: 'rare', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 186, name: 'Politoed', nameEs: 'Politoed', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 189, name: 'Jumpluff', nameEs: 'Jumpluff', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Flying'] },
  { pokemonId: 196, name: 'Espeon', nameEs: 'Espeon', rarity: 'rare', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 197, name: 'Umbreon', nameEs: 'Umbreon', rarity: 'rare', baseWeight: 1, types: ['Dark'] },
  { pokemonId: 199, name: 'Slowking', nameEs: 'Slowking', rarity: 'rare', baseWeight: 1, types: ['Water', 'Psychic'] },
  { pokemonId: 208, name: 'Steelix', nameEs: 'Steelix', rarity: 'rare', baseWeight: 1, types: ['Steel', 'Ground'] },
  { pokemonId: 230, name: 'Kingdra', nameEs: 'Kingdra', rarity: 'rare', baseWeight: 1, types: ['Water', 'Dragon'] },
  { pokemonId: 233, name: 'Porygon2', nameEs: 'Porygon2', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 242, name: 'Blissey', nameEs: 'Blissey', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  // Gen 3 Final evolutions
  { pokemonId: 254, name: 'Sceptile', nameEs: 'Sceptile', rarity: 'rare', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 257, name: 'Blaziken', nameEs: 'Blaziken', rarity: 'rare', baseWeight: 1, types: ['Fire', 'Fighting'] },
  { pokemonId: 260, name: 'Swampert', nameEs: 'Swampert', rarity: 'rare', baseWeight: 1, types: ['Water', 'Ground'] },
  { pokemonId: 272, name: 'Ludicolo', nameEs: 'Ludicolo', rarity: 'rare', baseWeight: 1, types: ['Water', 'Grass'] },
  { pokemonId: 275, name: 'Shiftry', nameEs: 'Shiftry', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Dark'] },
  { pokemonId: 282, name: 'Gardevoir', nameEs: 'Gardevoir', rarity: 'rare', baseWeight: 1, types: ['Psychic', 'Fairy'] },
  { pokemonId: 289, name: 'Slaking', nameEs: 'Slaking', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 295, name: 'Exploud', nameEs: 'Exploud', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 306, name: 'Aggron', nameEs: 'Aggron', rarity: 'rare', baseWeight: 1, types: ['Steel', 'Rock'] },
  { pokemonId: 330, name: 'Flygon', nameEs: 'Flygon', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Dragon'] },
  { pokemonId: 334, name: 'Altaria', nameEs: 'Altaria', rarity: 'rare', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 350, name: 'Milotic', nameEs: 'Milotic', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 365, name: 'Walrein', nameEs: 'Walrein', rarity: 'rare', baseWeight: 1, types: ['Ice', 'Water'] },
  // Gen 4 Final evolutions
  { pokemonId: 389, name: 'Torterra', nameEs: 'Torterra', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Ground'] },
  { pokemonId: 392, name: 'Infernape', nameEs: 'Infernape', rarity: 'rare', baseWeight: 1, types: ['Fire', 'Fighting'] },
  { pokemonId: 395, name: 'Empoleon', nameEs: 'Empoleon', rarity: 'rare', baseWeight: 1, types: ['Water', 'Steel'] },
  { pokemonId: 398, name: 'Staraptor', nameEs: 'Staraptor', rarity: 'rare', baseWeight: 1, types: ['Normal', 'Flying'] },
  { pokemonId: 405, name: 'Luxray', nameEs: 'Luxray', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 407, name: 'Roserade', nameEs: 'Roserade', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Poison'] },
  { pokemonId: 430, name: 'Honchkrow', nameEs: 'Honchkrow', rarity: 'rare', baseWeight: 1, types: ['Dark', 'Flying'] },
  { pokemonId: 429, name: 'Mismagius', nameEs: 'Mismagius', rarity: 'rare', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 461, name: 'Weavile', nameEs: 'Weavile', rarity: 'rare', baseWeight: 1, types: ['Dark', 'Ice'] },
  { pokemonId: 462, name: 'Magnezone', nameEs: 'Magnezone', rarity: 'rare', baseWeight: 1, types: ['Electric', 'Steel'] },
  { pokemonId: 464, name: 'Rhyperior', nameEs: 'Rhyperior', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Rock'] },
  { pokemonId: 466, name: 'Electivire', nameEs: 'Electivire', rarity: 'rare', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 467, name: 'Magmortar', nameEs: 'Magmortar', rarity: 'rare', baseWeight: 1, types: ['Fire'] },
  { pokemonId: 468, name: 'Togekiss', nameEs: 'Togekiss', rarity: 'rare', baseWeight: 1, types: ['Fairy', 'Flying'] },
  { pokemonId: 470, name: 'Leafeon', nameEs: 'Leafeon', rarity: 'rare', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 471, name: 'Glaceon', nameEs: 'Glaceon', rarity: 'rare', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 472, name: 'Gliscor', nameEs: 'Gliscor', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Flying'] },
  { pokemonId: 473, name: 'Mamoswine', nameEs: 'Mamoswine', rarity: 'rare', baseWeight: 1, types: ['Ice', 'Ground'] },
  { pokemonId: 474, name: 'Porygon-Z', nameEs: 'Porygon-Z', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 475, name: 'Gallade', nameEs: 'Gallade', rarity: 'rare', baseWeight: 1, types: ['Psychic', 'Fighting'] },
  { pokemonId: 477, name: 'Dusknoir', nameEs: 'Dusknoir', rarity: 'rare', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 478, name: 'Froslass', nameEs: 'Froslass', rarity: 'rare', baseWeight: 1, types: ['Ice', 'Ghost'] },
  // Gen 5+ Final evolutions
  { pokemonId: 497, name: 'Serperior', nameEs: 'Serperior', rarity: 'rare', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 500, name: 'Emboar', nameEs: 'Emboar', rarity: 'rare', baseWeight: 1, types: ['Fire', 'Fighting'] },
  { pokemonId: 503, name: 'Samurott', nameEs: 'Samurott', rarity: 'rare', baseWeight: 1, types: ['Water'] },
  { pokemonId: 508, name: 'Stoutland', nameEs: 'Stoutland', rarity: 'rare', baseWeight: 1, types: ['Normal'] },
  { pokemonId: 530, name: 'Excadrill', nameEs: 'Excadrill', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Steel'] },
  { pokemonId: 553, name: 'Krookodile', nameEs: 'Krookodile', rarity: 'rare', baseWeight: 1, types: ['Ground', 'Dark'] },
  { pokemonId: 579, name: 'Reuniclus', nameEs: 'Reuniclus', rarity: 'rare', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 598, name: 'Ferrothorn', nameEs: 'Ferrothorn', rarity: 'rare', baseWeight: 1, types: ['Grass', 'Steel'] },
  { pokemonId: 609, name: 'Chandelure', nameEs: 'Chandelure', rarity: 'rare', baseWeight: 1, types: ['Ghost', 'Fire'] },
  { pokemonId: 625, name: 'Bisharp', nameEs: 'Bisharp', rarity: 'rare', baseWeight: 1, types: ['Dark', 'Steel'] },
  { pokemonId: 663, name: 'Talonflame', nameEs: 'Talonflame', rarity: 'rare', baseWeight: 1, types: ['Fire', 'Flying'] },
  { pokemonId: 700, name: 'Sylveon', nameEs: 'Sylveon', rarity: 'rare', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 706, name: 'Goodra', nameEs: 'Goodra', rarity: 'rare', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 768, name: 'Golisopod', nameEs: 'Golisopod', rarity: 'rare', baseWeight: 1, types: ['Bug', 'Water'] },
  { pokemonId: 823, name: 'Corviknight', nameEs: 'Corviknight', rarity: 'rare', baseWeight: 1, types: ['Flying', 'Steel'] },
  { pokemonId: 858, name: 'Hatterene', nameEs: 'Hatterene', rarity: 'rare', baseWeight: 1, types: ['Psychic', 'Fairy'] },
  { pokemonId: 861, name: 'Grimmsnarl', nameEs: 'Grimmsnarl', rarity: 'rare', baseWeight: 1, types: ['Dark', 'Fairy'] },
  { pokemonId: 887, name: 'Dragapult', nameEs: 'Dragapult', rarity: 'rare', baseWeight: 1, types: ['Dragon', 'Ghost'] },
];


/**
 * Pokémon Épicos (4% probabilidad base) - ~50 Pokemon
 * Evoluciones finales fuertes y pseudo-legendarios pre-evolución
 */
export const EPIC_POKEMON: PokemonPoolEntry[] = [
  // Pseudo-legendary pre-evolutions
  { pokemonId: 147, name: 'Dratini', nameEs: 'Dratini', rarity: 'epic', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 148, name: 'Dragonair', nameEs: 'Dragonair', rarity: 'epic', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 246, name: 'Larvitar', nameEs: 'Larvitar', rarity: 'epic', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 247, name: 'Pupitar', nameEs: 'Pupitar', rarity: 'epic', baseWeight: 1, types: ['Rock', 'Ground'] },
  { pokemonId: 371, name: 'Bagon', nameEs: 'Bagon', rarity: 'epic', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 372, name: 'Shelgon', nameEs: 'Shelgon', rarity: 'epic', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 374, name: 'Beldum', nameEs: 'Beldum', rarity: 'epic', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 375, name: 'Metang', nameEs: 'Metang', rarity: 'epic', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 443, name: 'Gible', nameEs: 'Gible', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Ground'] },
  { pokemonId: 444, name: 'Gabite', nameEs: 'Gabite', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Ground'] },
  { pokemonId: 633, name: 'Deino', nameEs: 'Deino', rarity: 'epic', baseWeight: 1, types: ['Dark', 'Dragon'] },
  { pokemonId: 634, name: 'Zweilous', nameEs: 'Zweilous', rarity: 'epic', baseWeight: 1, types: ['Dark', 'Dragon'] },
  { pokemonId: 782, name: 'Jangmo-o', nameEs: 'Jangmo-o', rarity: 'epic', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 783, name: 'Hakamo-o', nameEs: 'Hakamo-o', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Fighting'] },
  // Strong final evolutions
  { pokemonId: 248, name: 'Tyranitar', nameEs: 'Tyranitar', rarity: 'epic', baseWeight: 1, types: ['Rock', 'Dark'] },
  { pokemonId: 373, name: 'Salamence', nameEs: 'Salamence', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 376, name: 'Metagross', nameEs: 'Metagross', rarity: 'epic', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 445, name: 'Garchomp', nameEs: 'Garchomp', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Ground'] },
  { pokemonId: 635, name: 'Hydreigon', nameEs: 'Hydreigon', rarity: 'epic', baseWeight: 1, types: ['Dark', 'Dragon'] },
  { pokemonId: 784, name: 'Kommo-o', nameEs: 'Kommo-o', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Fighting'] },
  // Dragonite line
  { pokemonId: 149, name: 'Dragonite', nameEs: 'Dragonite', rarity: 'epic', baseWeight: 1, types: ['Dragon', 'Flying'] },
  // Other strong Pokemon
  { pokemonId: 145, name: 'Zapdos', nameEs: 'Zapdos', rarity: 'epic', baseWeight: 0.5, types: ['Electric', 'Flying'] },
  { pokemonId: 144, name: 'Articuno', nameEs: 'Articuno', rarity: 'epic', baseWeight: 0.5, types: ['Ice', 'Flying'] },
  { pokemonId: 146, name: 'Moltres', nameEs: 'Moltres', rarity: 'epic', baseWeight: 0.5, types: ['Fire', 'Flying'] },
  { pokemonId: 243, name: 'Raikou', nameEs: 'Raikou', rarity: 'epic', baseWeight: 0.5, types: ['Electric'] },
  { pokemonId: 244, name: 'Entei', nameEs: 'Entei', rarity: 'epic', baseWeight: 0.5, types: ['Fire'] },
  { pokemonId: 245, name: 'Suicune', nameEs: 'Suicune', rarity: 'epic', baseWeight: 0.5, types: ['Water'] },
  { pokemonId: 377, name: 'Regirock', nameEs: 'Regirock', rarity: 'epic', baseWeight: 0.5, types: ['Rock'] },
  { pokemonId: 378, name: 'Regice', nameEs: 'Regice', rarity: 'epic', baseWeight: 0.5, types: ['Ice'] },
  { pokemonId: 379, name: 'Registeel', nameEs: 'Registeel', rarity: 'epic', baseWeight: 0.5, types: ['Steel'] },
  { pokemonId: 380, name: 'Latias', nameEs: 'Latias', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Psychic'] },
  { pokemonId: 381, name: 'Latios', nameEs: 'Latios', rarity: 'epic', baseWeight: 0.5, types: ['Dragon', 'Psychic'] },
  { pokemonId: 480, name: 'Uxie', nameEs: 'Uxie', rarity: 'epic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 481, name: 'Mesprit', nameEs: 'Mesprit', rarity: 'epic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 482, name: 'Azelf', nameEs: 'Azelf', rarity: 'epic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 485, name: 'Heatran', nameEs: 'Heatran', rarity: 'epic', baseWeight: 0.5, types: ['Fire', 'Steel'] },
  { pokemonId: 486, name: 'Regigigas', nameEs: 'Regigigas', rarity: 'epic', baseWeight: 0.5, types: ['Normal'] },
  { pokemonId: 488, name: 'Cresselia', nameEs: 'Cresselia', rarity: 'epic', baseWeight: 0.5, types: ['Psychic'] },
  { pokemonId: 638, name: 'Cobalion', nameEs: 'Cobalion', rarity: 'epic', baseWeight: 0.5, types: ['Steel', 'Fighting'] },
  { pokemonId: 639, name: 'Terrakion', nameEs: 'Terrakion', rarity: 'epic', baseWeight: 0.5, types: ['Rock', 'Fighting'] },
  { pokemonId: 640, name: 'Virizion', nameEs: 'Virizion', rarity: 'epic', baseWeight: 0.5, types: ['Grass', 'Fighting'] },
  { pokemonId: 641, name: 'Tornadus', nameEs: 'Tornadus', rarity: 'epic', baseWeight: 0.5, types: ['Flying'] },
  { pokemonId: 642, name: 'Thundurus', nameEs: 'Thundurus', rarity: 'epic', baseWeight: 0.5, types: ['Electric', 'Flying'] },
  { pokemonId: 645, name: 'Landorus', nameEs: 'Landorus', rarity: 'epic', baseWeight: 0.5, types: ['Ground', 'Flying'] },
  { pokemonId: 785, name: 'Tapu Koko', nameEs: 'Tapu Koko', rarity: 'epic', baseWeight: 0.5, types: ['Electric', 'Fairy'] },
  { pokemonId: 786, name: 'Tapu Lele', nameEs: 'Tapu Lele', rarity: 'epic', baseWeight: 0.5, types: ['Psychic', 'Fairy'] },
  { pokemonId: 787, name: 'Tapu Bulu', nameEs: 'Tapu Bulu', rarity: 'epic', baseWeight: 0.5, types: ['Grass', 'Fairy'] },
  { pokemonId: 788, name: 'Tapu Fini', nameEs: 'Tapu Fini', rarity: 'epic', baseWeight: 0.5, types: ['Water', 'Fairy'] },
];

/**
 * Pokémon Legendarios (0.6% probabilidad base) - ~30 Pokemon
 * Pseudo-legendarios finales y legendarios menores
 */
export const LEGENDARY_POKEMON_POOL: PokemonPoolEntry[] = [
  // Box Legendaries (lower tier)
  { pokemonId: 150, name: 'Mewtwo', nameEs: 'Mewtwo', rarity: 'legendary', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 249, name: 'Lugia', nameEs: 'Lugia', rarity: 'legendary', baseWeight: 1, types: ['Psychic', 'Flying'] },
  { pokemonId: 250, name: 'Ho-Oh', nameEs: 'Ho-Oh', rarity: 'legendary', baseWeight: 1, types: ['Fire', 'Flying'] },
  { pokemonId: 382, name: 'Kyogre', nameEs: 'Kyogre', rarity: 'legendary', baseWeight: 1, types: ['Water'] },
  { pokemonId: 383, name: 'Groudon', nameEs: 'Groudon', rarity: 'legendary', baseWeight: 1, types: ['Ground'] },
  { pokemonId: 384, name: 'Rayquaza', nameEs: 'Rayquaza', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Flying'] },
  { pokemonId: 483, name: 'Dialga', nameEs: 'Dialga', rarity: 'legendary', baseWeight: 1, types: ['Steel', 'Dragon'] },
  { pokemonId: 484, name: 'Palkia', nameEs: 'Palkia', rarity: 'legendary', baseWeight: 1, types: ['Water', 'Dragon'] },
  { pokemonId: 487, name: 'Giratina', nameEs: 'Giratina', rarity: 'legendary', baseWeight: 1, types: ['Ghost', 'Dragon'] },
  { pokemonId: 643, name: 'Reshiram', nameEs: 'Reshiram', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Fire'] },
  { pokemonId: 644, name: 'Zekrom', nameEs: 'Zekrom', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Electric'] },
  { pokemonId: 646, name: 'Kyurem', nameEs: 'Kyurem', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Ice'] },
  { pokemonId: 716, name: 'Xerneas', nameEs: 'Xerneas', rarity: 'legendary', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 717, name: 'Yveltal', nameEs: 'Yveltal', rarity: 'legendary', baseWeight: 1, types: ['Dark', 'Flying'] },
  { pokemonId: 718, name: 'Zygarde', nameEs: 'Zygarde', rarity: 'legendary', baseWeight: 1, types: ['Dragon', 'Ground'] },
  { pokemonId: 791, name: 'Solgaleo', nameEs: 'Solgaleo', rarity: 'legendary', baseWeight: 1, types: ['Psychic', 'Steel'] },
  { pokemonId: 792, name: 'Lunala', nameEs: 'Lunala', rarity: 'legendary', baseWeight: 1, types: ['Psychic', 'Ghost'] },
  { pokemonId: 800, name: 'Necrozma', nameEs: 'Necrozma', rarity: 'legendary', baseWeight: 1, types: ['Psychic'] },
  { pokemonId: 888, name: 'Zacian', nameEs: 'Zacian', rarity: 'legendary', baseWeight: 1, types: ['Fairy'] },
  { pokemonId: 889, name: 'Zamazenta', nameEs: 'Zamazenta', rarity: 'legendary', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 890, name: 'Eternatus', nameEs: 'Eternatus', rarity: 'legendary', baseWeight: 1, types: ['Poison', 'Dragon'] },
  { pokemonId: 891, name: 'Kubfu', nameEs: 'Kubfu', rarity: 'legendary', baseWeight: 1, types: ['Fighting'] },
  { pokemonId: 892, name: 'Urshifu', nameEs: 'Urshifu', rarity: 'legendary', baseWeight: 1, types: ['Fighting', 'Dark'] },
  { pokemonId: 894, name: 'Regieleki', nameEs: 'Regieleki', rarity: 'legendary', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 895, name: 'Regidrago', nameEs: 'Regidrago', rarity: 'legendary', baseWeight: 1, types: ['Dragon'] },
  { pokemonId: 896, name: 'Glastrier', nameEs: 'Glastrier', rarity: 'legendary', baseWeight: 1, types: ['Ice'] },
  { pokemonId: 897, name: 'Spectrier', nameEs: 'Spectrier', rarity: 'legendary', baseWeight: 1, types: ['Ghost'] },
  { pokemonId: 898, name: 'Calyrex', nameEs: 'Calyrex', rarity: 'legendary', baseWeight: 1, types: ['Psychic', 'Grass'] },
];


/**
 * Pokémon Míticos (0.0001% probabilidad base) - ~25 Pokemon
 * Pokémon míticos de todas las generaciones
 */
export const MYTHIC_POKEMON: PokemonPoolEntry[] = [
  // Gen 1
  { pokemonId: 151, name: 'Mew', nameEs: 'Mew', rarity: 'mythic', baseWeight: 1, types: ['Psychic'] },
  // Gen 2
  { pokemonId: 251, name: 'Celebi', nameEs: 'Celebi', rarity: 'mythic', baseWeight: 1, types: ['Psychic', 'Grass'] },
  // Gen 3
  { pokemonId: 385, name: 'Jirachi', nameEs: 'Jirachi', rarity: 'mythic', baseWeight: 1, types: ['Steel', 'Psychic'] },
  { pokemonId: 386, name: 'Deoxys', nameEs: 'Deoxys', rarity: 'mythic', baseWeight: 1, types: ['Psychic'] },
  // Gen 4
  { pokemonId: 489, name: 'Phione', nameEs: 'Phione', rarity: 'mythic', baseWeight: 1, types: ['Water'] },
  { pokemonId: 490, name: 'Manaphy', nameEs: 'Manaphy', rarity: 'mythic', baseWeight: 1, types: ['Water'] },
  { pokemonId: 491, name: 'Darkrai', nameEs: 'Darkrai', rarity: 'mythic', baseWeight: 1, types: ['Dark'] },
  { pokemonId: 492, name: 'Shaymin', nameEs: 'Shaymin', rarity: 'mythic', baseWeight: 1, types: ['Grass'] },
  { pokemonId: 493, name: 'Arceus', nameEs: 'Arceus', rarity: 'mythic', baseWeight: 0.5, types: ['Normal'] },
  // Gen 5
  { pokemonId: 494, name: 'Victini', nameEs: 'Victini', rarity: 'mythic', baseWeight: 1, types: ['Psychic', 'Fire'] },
  { pokemonId: 647, name: 'Keldeo', nameEs: 'Keldeo', rarity: 'mythic', baseWeight: 1, types: ['Water', 'Fighting'] },
  { pokemonId: 648, name: 'Meloetta', nameEs: 'Meloetta', rarity: 'mythic', baseWeight: 1, types: ['Normal', 'Psychic'] },
  { pokemonId: 649, name: 'Genesect', nameEs: 'Genesect', rarity: 'mythic', baseWeight: 1, types: ['Bug', 'Steel'] },
  // Gen 6
  { pokemonId: 719, name: 'Diancie', nameEs: 'Diancie', rarity: 'mythic', baseWeight: 1, types: ['Rock', 'Fairy'] },
  { pokemonId: 720, name: 'Hoopa', nameEs: 'Hoopa', rarity: 'mythic', baseWeight: 1, types: ['Psychic', 'Ghost'] },
  { pokemonId: 721, name: 'Volcanion', nameEs: 'Volcanion', rarity: 'mythic', baseWeight: 1, types: ['Fire', 'Water'] },
  // Gen 7
  { pokemonId: 801, name: 'Magearna', nameEs: 'Magearna', rarity: 'mythic', baseWeight: 1, types: ['Steel', 'Fairy'] },
  { pokemonId: 802, name: 'Marshadow', nameEs: 'Marshadow', rarity: 'mythic', baseWeight: 1, types: ['Fighting', 'Ghost'] },
  { pokemonId: 807, name: 'Zeraora', nameEs: 'Zeraora', rarity: 'mythic', baseWeight: 1, types: ['Electric'] },
  { pokemonId: 808, name: 'Meltan', nameEs: 'Meltan', rarity: 'mythic', baseWeight: 1, types: ['Steel'] },
  { pokemonId: 809, name: 'Melmetal', nameEs: 'Melmetal', rarity: 'mythic', baseWeight: 1, types: ['Steel'] },
  // Gen 8
  { pokemonId: 893, name: 'Zarude', nameEs: 'Zarude', rarity: 'mythic', baseWeight: 1, types: ['Dark', 'Grass'] },
];

// ============================================
// POOL COMBINADO Y UTILIDADES
// ============================================

/**
 * Pool completo de Pokémon
 */
export const ALL_POKEMON_POOL: PokemonPoolEntry[] = [
  ...COMMON_POKEMON,
  ...UNCOMMON_POKEMON,
  ...RARE_POKEMON,
  ...EPIC_POKEMON,
  ...LEGENDARY_POKEMON_POOL,
  ...MYTHIC_POKEMON,
];

/**
 * Obtiene el pool de Pokémon por rareza
 */
export function getPokemonPoolByRarity(rarity: Rarity): PokemonPoolEntry[] {
  switch (rarity) {
    case 'common': return COMMON_POKEMON;
    case 'uncommon': return UNCOMMON_POKEMON;
    case 'rare': return RARE_POKEMON;
    case 'epic': return EPIC_POKEMON;
    case 'legendary': return LEGENDARY_POKEMON_POOL;
    case 'mythic': return MYTHIC_POKEMON;
    default: return [];
  }
}

/**
 * Busca un Pokémon por ID
 */
export function findPokemonById(pokemonId: number): PokemonPoolEntry | undefined {
  return ALL_POKEMON_POOL.find(p => p.pokemonId === pokemonId);
}

/**
 * Busca un Pokémon por nombre
 */
export function findPokemonByName(name: string): PokemonPoolEntry | undefined {
  const normalizedName = name.toLowerCase();
  return ALL_POKEMON_POOL.find(
    p => p.name.toLowerCase() === normalizedName || 
         (p.nameEs && p.nameEs.toLowerCase() === normalizedName)
  );
}

/**
 * Obtiene la URL del sprite de un Pokémon
 */
export function getPokemonSprite(pokemonId: number, isShiny: boolean = false): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  if (isShiny) {
    return `${baseUrl}/shiny/${pokemonId}.png`;
  }
  return `${baseUrl}/${pokemonId}.png`;
}

/**
 * Obtiene la URL del artwork oficial de un Pokémon
 */
export function getPokemonArtwork(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Pool completo de Pokémon por rareza
 */
export const POKEMON_POOL_BY_RARITY: Record<Rarity, PokemonPoolEntry[]> = {
  common: COMMON_POKEMON,
  uncommon: UNCOMMON_POKEMON,
  rare: RARE_POKEMON,
  epic: EPIC_POKEMON,
  legendary: LEGENDARY_POKEMON_POOL,
  mythic: MYTHIC_POKEMON,
};

/**
 * Estadísticas del pool
 */
export const POOL_STATS = {
  common: COMMON_POKEMON.length,
  uncommon: UNCOMMON_POKEMON.length,
  rare: RARE_POKEMON.length,
  epic: EPIC_POKEMON.length,
  legendary: LEGENDARY_POKEMON_POOL.length,
  mythic: MYTHIC_POKEMON.length,
  total: ALL_POKEMON_POOL.length,
};
];

/**
 * Pokémon Legendarios (0.5% probabilidad base)
 */
export const LEGENDARY_POKEMON_POOL: PokemonPoolEntry[] = [
  { pokemonId: 144, name: 'Articuno', nameEs: 'Articuno', rarity: 'legendary', baseWeight: 0.3, types: ['Ice', 'Flying'] },
  { pokemonId: 145, name: 'Zapdos', nameEs: 'Zapdos', rarity: 'legendary', baseWeight: 0.3, types: ['Electric', 'Flying'] },
  { pokemonId: 146, name: 'Moltres', nameEs: 'Moltres', rarity: 'legendary', baseWeight: 0.3, types: ['Fire', 'Flying'] },
  { pokemonId: 150, name: 'Mewtwo', nameEs: 'Mewtwo', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic'] },
  { pokemonId: 243, name: 'Raikou', nameEs: 'Raikou', rarity: 'legendary', baseWeight: 0.3, types: ['Electric'] },
  { pokemonId: 244, name: 'Entei', nameEs: 'Entei', rarity: 'legendary', baseWeight: 0.3, types: ['Fire'] },
  { pokemonId: 245, name: 'Suicune', nameEs: 'Suicune', rarity: 'legendary', baseWeight: 0.3, types: ['Water'] },
  { pokemonId: 249, name: 'Lugia', nameEs: 'Lugia', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Flying'] },
  { pokemonId: 250, name: 'Ho-Oh', nameEs: 'Ho-Oh', rarity: 'legendary', baseWeight: 0.2, types: ['Fire', 'Flying'] },
  { pokemonId: 382, name: 'Kyogre', nameEs: 'Kyogre', rarity: 'legendary', baseWeight: 0.2, types: ['Water'] },
  { pokemonId: 383, name: 'Groudon', nameEs: 'Groudon', rarity: 'legendary', baseWeight: 0.2, types: ['Ground'] },
  { pokemonId: 384, name: 'Rayquaza', nameEs: 'Rayquaza', rarity: 'legendary', baseWeight: 0.15, types: ['Dragon', 'Flying'] },
  { pokemonId: 483, name: 'Dialga', nameEs: 'Dialga', rarity: 'legendary', baseWeight: 0.2, types: ['Steel', 'Dragon'] },
  { pokemonId: 484, name: 'Palkia', nameEs: 'Palkia', rarity: 'legendary', baseWeight: 0.2, types: ['Water', 'Dragon'] },
  { pokemonId: 487, name: 'Giratina', nameEs: 'Giratina', rarity: 'legendary', baseWeight: 0.2, types: ['Ghost', 'Dragon'] },
  { pokemonId: 643, name: 'Reshiram', nameEs: 'Reshiram', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Fire'] },
  { pokemonId: 644, name: 'Zekrom', nameEs: 'Zekrom', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Electric'] },
  { pokemonId: 646, name: 'Kyurem', nameEs: 'Kyurem', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Ice'] },
  { pokemonId: 716, name: 'Xerneas', nameEs: 'Xerneas', rarity: 'legendary', baseWeight: 0.2, types: ['Fairy'] },
  { pokemonId: 717, name: 'Yveltal', nameEs: 'Yveltal', rarity: 'legendary', baseWeight: 0.2, types: ['Dark', 'Flying'] },
  { pokemonId: 718, name: 'Zygarde', nameEs: 'Zygarde', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Ground'] },
  { pokemonId: 791, name: 'Solgaleo', nameEs: 'Solgaleo', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Steel'] },
  { pokemonId: 792, name: 'Lunala', nameEs: 'Lunala', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Ghost'] },
  { pokemonId: 800, name: 'Necrozma', nameEs: 'Necrozma', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic'] },
  { pokemonId: 888, name: 'Zacian', nameEs: 'Zacian', rarity: 'legendary', baseWeight: 0.2, types: ['Fairy'] },
  { pokemonId: 889, name: 'Zamazenta', nameEs: 'Zamazenta', rarity: 'legendary', baseWeight: 0.2, types: ['Fighting'] },
  { pokemonId: 890, name: 'Eternatus', nameEs: 'Eternatus', rarity: 'legendary', baseWeight: 0.2, types: ['Poison', 'Dragon'] },
];

/**
 * Pokémon Míticos (0.1% probabilidad base)
 */
export const MYTHIC_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 151, name: 'Mew', nameEs: 'Mew', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 251, name: 'Celebi', nameEs: 'Celebi', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Grass'] },
  { pokemonId: 385, name: 'Jirachi', nameEs: 'Jirachi', rarity: 'mythic', baseWeight: 0.1, types: ['Steel', 'Psychic'] },
  { pokemonId: 386, name: 'Deoxys', nameEs: 'Deoxys', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 489, name: 'Phione', nameEs: 'Phione', rarity: 'mythic', baseWeight: 0.15, types: ['Water'] },
  { pokemonId: 490, name: 'Manaphy', nameEs: 'Manaphy', rarity: 'mythic', baseWeight: 0.1, types: ['Water'] },
  { pokemonId: 491, name: 'Darkrai', nameEs: 'Darkrai', rarity: 'mythic', baseWeight: 0.1, types: ['Dark'] },
  { pokemonId: 492, name: 'Shaymin', nameEs: 'Shaymin', rarity: 'mythic', baseWeight: 0.1, types: ['Grass'] },
  { pokemonId: 493, name: 'Arceus', nameEs: 'Arceus', rarity: 'mythic', baseWeight: 0.05, types: ['Normal'] },
  { pokemonId: 494, name: 'Victini', nameEs: 'Victini', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Fire'] },
  { pokemonId: 647, name: 'Keldeo', nameEs: 'Keldeo', rarity: 'mythic', baseWeight: 0.1, types: ['Water', 'Fighting'] },
  { pokemonId: 648, name: 'Meloetta', nameEs: 'Meloetta', rarity: 'mythic', baseWeight: 0.1, types: ['Normal', 'Psychic'] },
  { pokemonId: 649, name: 'Genesect', nameEs: 'Genesect', rarity: 'mythic', baseWeight: 0.1, types: ['Bug', 'Steel'] },
  { pokemonId: 719, name: 'Diancie', nameEs: 'Diancie', rarity: 'mythic', baseWeight: 0.1, types: ['Rock', 'Fairy'] },
  { pokemonId: 720, name: 'Hoopa', nameEs: 'Hoopa', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Ghost'] },
  { pokemonId: 721, name: 'Volcanion', nameEs: 'Volcanion', rarity: 'mythic', baseWeight: 0.1, types: ['Fire', 'Water'] },
  { pokemonId: 801, name: 'Magearna', nameEs: 'Magearna', rarity: 'mythic', baseWeight: 0.1, types: ['Steel', 'Fairy'] },
  { pokemonId: 802, name: 'Marshadow', nameEs: 'Marshadow', rarity: 'mythic', baseWeight: 0.1, types: ['Fighting', 'Ghost'] },
  { pokemonId: 807, name: 'Zeraora', nameEs: 'Zeraora', rarity: 'mythic', baseWeight: 0.1, types: ['Electric'] },
  { pokemonId: 808, name: 'Meltan', nameEs: 'Meltan', rarity: 'mythic', baseWeight: 0.15, types: ['Steel'] },
  { pokemonId: 809, name: 'Melmetal', nameEs: 'Melmetal', rarity: 'mythic', baseWeight: 0.1, types: ['Steel'] },
  { pokemonId: 893, name: 'Zarude', nameEs: 'Zarude', rarity: 'mythic', baseWeight: 0.1, types: ['Dark', 'Grass'] },
];

/**
 * Pool completo de todos los Pokémon
 */
export const ALL_POKEMON_POOL: PokemonPoolEntry[] = [
  ...COMMON_POKEMON,
  ...UNCOMMON_POKEMON,
  ...RARE_POKEMON,
  ...EPIC_POKEMON,
  ...LEGENDARY_POKEMON_POOL,
  ...MYTHIC_POKEMON,
];

/**
 * Obtiene el pool de Pokémon por rareza
 */
export function getPokemonPoolByRarity(rarity: Rarity): PokemonPoolEntry[] {
  switch (rarity) {
    case 'common': return COMMON_POKEMON;
    case 'uncommon': return UNCOMMON_POKEMON;
    case 'rare': return RARE_POKEMON;
    case 'epic': return EPIC_POKEMON;
    case 'legendary': return LEGENDARY_POKEMON_POOL;
    case 'mythic': return MYTHIC_POKEMON;
    default: return [];
  }
}

/**
 * Busca un Pokémon por ID
 */
export function findPokemonById(pokemonId: number): PokemonPoolEntry | undefined {
  return ALL_POKEMON_POOL.find(p => p.pokemonId === pokemonId);
}

/**
 * Busca un Pokémon por nombre
 */
export function findPokemonByName(name: string): PokemonPoolEntry | undefined {
  const normalizedName = name.toLowerCase();
  return ALL_POKEMON_POOL.find(
    p => p.name.toLowerCase() === normalizedName || 
         (p.nameEs && p.nameEs.toLowerCase() === normalizedName)
  );
}

/**
 * Obtiene la URL del sprite de un Pokémon
 */
export function getPokemonSprite(pokemonId: number, isShiny: boolean = false): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  if (isShiny) {
    return `${baseUrl}/shiny/${pokemonId}.png`;
  }
  return `${baseUrl}/${pokemonId}.png`;
}

/**
 * Obtiene la URL del artwork oficial de un Pokémon
 */
export function getPokemonArtwork(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Pool completo de Pokémon por rareza
 */
export const POKEMON_POOL_BY_RARITY: Record<Rarity, PokemonPoolEntry[]> = {
  common: COMMON_POKEMON,
  uncommon: UNCOMMON_POKEMON,
  rare: RARE_POKEMON,
  epic: EPIC_POKEMON,
  legendary: LEGENDARY_POKEMON_POOL,
  mythic: MYTHIC_POKEMON,
};

/**
 * Estadísticas del pool
 */
export const POOL_STATS = {
  common: COMMON_POKEMON.length,
  uncommon: UNCOMMON_POKEMON.length,
  rare: RARE_POKEMON.length,
  epic: EPIC_POKEMON.length,
  legendary: LEGENDARY_POKEMON_POOL.length,
  mythic: MYTHIC_POKEMON.length,
  total: ALL_POKEMON_POOL.length,
};
];

/**
 * Pokémon Legendarios (0.5% probabilidad base)
 */
export const LEGENDARY_POKEMON_POOL: PokemonPoolEntry[] = [
  { pokemonId: 144, name: 'Articuno', nameEs: 'Articuno', rarity: 'legendary', baseWeight: 0.3, types: ['Ice', 'Flying'] },
  { pokemonId: 145, name: 'Zapdos', nameEs: 'Zapdos', rarity: 'legendary', baseWeight: 0.3, types: ['Electric', 'Flying'] },
  { pokemonId: 146, name: 'Moltres', nameEs: 'Moltres', rarity: 'legendary', baseWeight: 0.3, types: ['Fire', 'Flying'] },
  { pokemonId: 150, name: 'Mewtwo', nameEs: 'Mewtwo', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic'] },
  { pokemonId: 243, name: 'Raikou', nameEs: 'Raikou', rarity: 'legendary', baseWeight: 0.3, types: ['Electric'] },
  { pokemonId: 244, name: 'Entei', nameEs: 'Entei', rarity: 'legendary', baseWeight: 0.3, types: ['Fire'] },
  { pokemonId: 245, name: 'Suicune', nameEs: 'Suicune', rarity: 'legendary', baseWeight: 0.3, types: ['Water'] },
  { pokemonId: 249, name: 'Lugia', nameEs: 'Lugia', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Flying'] },
  { pokemonId: 250, name: 'Ho-Oh', nameEs: 'Ho-Oh', rarity: 'legendary', baseWeight: 0.2, types: ['Fire', 'Flying'] },
  { pokemonId: 382, name: 'Kyogre', nameEs: 'Kyogre', rarity: 'legendary', baseWeight: 0.2, types: ['Water'] },
  { pokemonId: 383, name: 'Groudon', nameEs: 'Groudon', rarity: 'legendary', baseWeight: 0.2, types: ['Ground'] },
  { pokemonId: 384, name: 'Rayquaza', nameEs: 'Rayquaza', rarity: 'legendary', baseWeight: 0.15, types: ['Dragon', 'Flying'] },
  { pokemonId: 483, name: 'Dialga', nameEs: 'Dialga', rarity: 'legendary', baseWeight: 0.2, types: ['Steel', 'Dragon'] },
  { pokemonId: 484, name: 'Palkia', nameEs: 'Palkia', rarity: 'legendary', baseWeight: 0.2, types: ['Water', 'Dragon'] },
  { pokemonId: 487, name: 'Giratina', nameEs: 'Giratina', rarity: 'legendary', baseWeight: 0.2, types: ['Ghost', 'Dragon'] },
  { pokemonId: 643, name: 'Reshiram', nameEs: 'Reshiram', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Fire'] },
  { pokemonId: 644, name: 'Zekrom', nameEs: 'Zekrom', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Electric'] },
  { pokemonId: 646, name: 'Kyurem', nameEs: 'Kyurem', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Ice'] },
  { pokemonId: 716, name: 'Xerneas', nameEs: 'Xerneas', rarity: 'legendary', baseWeight: 0.2, types: ['Fairy'] },
  { pokemonId: 717, name: 'Yveltal', nameEs: 'Yveltal', rarity: 'legendary', baseWeight: 0.2, types: ['Dark', 'Flying'] },
  { pokemonId: 718, name: 'Zygarde', nameEs: 'Zygarde', rarity: 'legendary', baseWeight: 0.2, types: ['Dragon', 'Ground'] },
  { pokemonId: 791, name: 'Solgaleo', nameEs: 'Solgaleo', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Steel'] },
  { pokemonId: 792, name: 'Lunala', nameEs: 'Lunala', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic', 'Ghost'] },
  { pokemonId: 800, name: 'Necrozma', nameEs: 'Necrozma', rarity: 'legendary', baseWeight: 0.2, types: ['Psychic'] },
  { pokemonId: 888, name: 'Zacian', nameEs: 'Zacian', rarity: 'legendary', baseWeight: 0.2, types: ['Fairy'] },
  { pokemonId: 889, name: 'Zamazenta', nameEs: 'Zamazenta', rarity: 'legendary', baseWeight: 0.2, types: ['Fighting'] },
  { pokemonId: 890, name: 'Eternatus', nameEs: 'Eternatus', rarity: 'legendary', baseWeight: 0.2, types: ['Poison', 'Dragon'] },
];

/**
 * Pokémon Míticos (0.1% probabilidad base)
 */
export const MYTHIC_POKEMON: PokemonPoolEntry[] = [
  { pokemonId: 151, name: 'Mew', nameEs: 'Mew', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 251, name: 'Celebi', nameEs: 'Celebi', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Grass'] },
  { pokemonId: 385, name: 'Jirachi', nameEs: 'Jirachi', rarity: 'mythic', baseWeight: 0.1, types: ['Steel', 'Psychic'] },
  { pokemonId: 386, name: 'Deoxys', nameEs: 'Deoxys', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic'] },
  { pokemonId: 489, name: 'Phione', nameEs: 'Phione', rarity: 'mythic', baseWeight: 0.15, types: ['Water'] },
  { pokemonId: 490, name: 'Manaphy', nameEs: 'Manaphy', rarity: 'mythic', baseWeight: 0.1, types: ['Water'] },
  { pokemonId: 491, name: 'Darkrai', nameEs: 'Darkrai', rarity: 'mythic', baseWeight: 0.1, types: ['Dark'] },
  { pokemonId: 492, name: 'Shaymin', nameEs: 'Shaymin', rarity: 'mythic', baseWeight: 0.1, types: ['Grass'] },
  { pokemonId: 493, name: 'Arceus', nameEs: 'Arceus', rarity: 'mythic', baseWeight: 0.05, types: ['Normal'] },
  { pokemonId: 494, name: 'Victini', nameEs: 'Victini', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Fire'] },
  { pokemonId: 647, name: 'Keldeo', nameEs: 'Keldeo', rarity: 'mythic', baseWeight: 0.1, types: ['Water', 'Fighting'] },
  { pokemonId: 648, name: 'Meloetta', nameEs: 'Meloetta', rarity: 'mythic', baseWeight: 0.1, types: ['Normal', 'Psychic'] },
  { pokemonId: 649, name: 'Genesect', nameEs: 'Genesect', rarity: 'mythic', baseWeight: 0.1, types: ['Bug', 'Steel'] },
  { pokemonId: 719, name: 'Diancie', nameEs: 'Diancie', rarity: 'mythic', baseWeight: 0.1, types: ['Rock', 'Fairy'] },
  { pokemonId: 720, name: 'Hoopa', nameEs: 'Hoopa', rarity: 'mythic', baseWeight: 0.1, types: ['Psychic', 'Ghost'] },
  { pokemonId: 721, name: 'Volcanion', nameEs: 'Volcanion', rarity: 'mythic', baseWeight: 0.1, types: ['Fire', 'Water'] },
  { pokemonId: 801, name: 'Magearna', nameEs: 'Magearna', rarity: 'mythic', baseWeight: 0.1, types: ['Steel', 'Fairy'] },
  { pokemonId: 802, name: 'Marshadow', nameEs: 'Marshadow', rarity: 'mythic', baseWeight: 0.1, types: ['Fighting', 'Ghost'] },
  { pokemonId: 807, name: 'Zeraora', nameEs: 'Zeraora', rarity: 'mythic', baseWeight: 0.1, types: ['Electric'] },
  { pokemonId: 808, name: 'Meltan', nameEs: 'Meltan', rarity: 'mythic', baseWeight: 0.15, types: ['Steel'] },
  { pokemonId: 809, name: 'Melmetal', nameEs: 'Melmetal', rarity: 'mythic', baseWeight: 0.1, types: ['Steel'] },
  { pokemonId: 893, name: 'Zarude', nameEs: 'Zarude', rarity: 'mythic', baseWeight: 0.1, types: ['Dark', 'Grass'] },
];

/**
 * Pool completo de todos los Pokémon
 */
export const ALL_POKEMON_POOL: PokemonPoolEntry[] = [
  ...COMMON_POKEMON,
  ...UNCOMMON_POKEMON,
  ...RARE_POKEMON,
  ...EPIC_POKEMON,
  ...LEGENDARY_POKEMON_POOL,
  ...MYTHIC_POKEMON,
];

/**
 * Obtiene el pool de Pokémon por rareza
 */
export function getPokemonPoolByRarity(rarity: Rarity): PokemonPoolEntry[] {
  switch (rarity) {
    case 'common': return COMMON_POKEMON;
    case 'uncommon': return UNCOMMON_POKEMON;
    case 'rare': return RARE_POKEMON;
    case 'epic': return EPIC_POKEMON;
    case 'legendary': return LEGENDARY_POKEMON_POOL;
    case 'mythic': return MYTHIC_POKEMON;
    default: return [];
  }
}

/**
 * Busca un Pokémon por ID
 */
export function findPokemonById(pokemonId: number): PokemonPoolEntry | undefined {
  return ALL_POKEMON_POOL.find(p => p.pokemonId === pokemonId);
}

/**
 * Busca un Pokémon por nombre
 */
export function findPokemonByName(name: string): PokemonPoolEntry | undefined {
  const normalizedName = name.toLowerCase();
  return ALL_POKEMON_POOL.find(
    p => p.name.toLowerCase() === normalizedName || 
         (p.nameEs && p.nameEs.toLowerCase() === normalizedName)
  );
}

/**
 * Obtiene la URL del sprite de un Pokémon
 */
export function getPokemonSprite(pokemonId: number, isShiny: boolean = false): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  if (isShiny) {
    return `${baseUrl}/shiny/${pokemonId}.png`;
  }
  return `${baseUrl}/${pokemonId}.png`;
}

/**
 * Obtiene la URL del artwork oficial de un Pokémon
 */
export function getPokemonArtwork(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

/**
 * Pool completo de Pokémon por rareza
 */
export const POKEMON_POOL_BY_RARITY: Record<Rarity, PokemonPoolEntry[]> = {
  common: COMMON_POKEMON,
  uncommon: UNCOMMON_POKEMON,
  rare: RARE_POKEMON,
  epic: EPIC_POKEMON,
  legendary: LEGENDARY_POKEMON_POOL,
  mythic: MYTHIC_POKEMON,
};

/**
 * Estadísticas del pool
 */
export const POOL_STATS = {
  common: COMMON_POKEMON.length,
  uncommon: UNCOMMON_POKEMON.length,
  rare: RARE_POKEMON.length,
  epic: EPIC_POKEMON.length,
  legendary: LEGENDARY_POKEMON_POOL.length,
  mythic: MYTHIC_POKEMON.length,
  total: ALL_POKEMON_POOL.length,
};
