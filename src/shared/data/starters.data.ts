/**
 * Datos de Starters (Pokémon Iniciales)
 * Cobblemon Los Pitufos - Backend API
 * 
 * Datos completos de los 27 starters oficiales (Gen 1-9)
 * Los sprites usan GIFs animados de PokeAPI
 */

import type { Starter, StarterStats, Ability, SignatureMove, Evolution } from '../types/pokemon.types.js';

function getSprites(id: number) {
    const hasAnimated = id <= 649;
    return {
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        spriteAnimated: hasAnimated
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
        shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`,
        shinyAnimated: hasAnimated
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${id}.gif`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/${id}.gif`,
        artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
    };
}

export const STARTERS_DATA: Omit<Starter, '_id' | 'isClaimed' | 'claimedBy' | 'claimedByNickname' | 'claimedAt'>[] = [
    // ==================== GENERATION 1 ====================
    {
        pokemonId: 1,
        name: "Bulbasaur",
        nameEs: "Bulbasaur",
        generation: 1,
        types: ["Grass", "Poison"],
        stats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Chlorophyll", nameEs: "Clorofila", isHidden: true, description: "Boosts Speed in sunshine." }
        ],
        signatureMoves: [
            { name: "Solar Beam", type: "Grass", category: "special", power: 120, accuracy: 100 },
            { name: "Sludge Bomb", type: "Poison", category: "special", power: 90, accuracy: 100 }
        ],
        evolutions: [
            { to: 2, toName: "Ivysaur", method: "Level 16" },
            { to: 3, toName: "Venusaur", method: "Level 32" }
        ],
        description: "A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.",
        height: 0.7,
        weight: 6.9,
    },
    {
        pokemonId: 4,
        name: "Charmander",
        nameEs: "Charmander",
        generation: 1,
        types: ["Fire"],
        stats: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Solar Power", nameEs: "Poder Solar", isHidden: true, description: "Boosts Sp. Atk in sunshine, but loses HP." }
        ],
        signatureMoves: [
            { name: "Flamethrower", type: "Fire", category: "special", power: 90, accuracy: 100 },
            { name: "Dragon Claw", type: "Dragon", category: "physical", power: 80, accuracy: 100 }
        ],
        evolutions: [
            { to: 5, toName: "Charmeleon", method: "Level 16" },
            { to: 6, toName: "Charizard", method: "Level 36" }
        ],
        description: "It prefers hot things. When it rains, steam is said to spout from the tip of its tail.",
        height: 0.6,
        weight: 8.5,
    },
    {
        pokemonId: 7,
        name: "Squirtle",
        nameEs: "Squirtle",
        generation: 1,
        types: ["Water"],
        stats: { hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Rain Dish", nameEs: "Cura Lluvia", isHidden: true, description: "Gradually recovers HP in rain." }
        ],
        signatureMoves: [
            { name: "Hydro Pump", type: "Water", category: "special", power: 110, accuracy: 80 },
            { name: "Ice Beam", type: "Ice", category: "special", power: 90, accuracy: 100 }
        ],
        evolutions: [
            { to: 8, toName: "Wartortle", method: "Level 16" },
            { to: 9, toName: "Blastoise", method: "Level 36" }
        ],
        description: "After birth, its back swells and hardens into a shell. It sprays foam powerfully from its mouth.",
        height: 0.5,
        weight: 9.0,
    },
    // ==================== GENERATION 2 ====================
    {
        pokemonId: 152,
        name: "Chikorita",
        nameEs: "Chikorita",
        generation: 2,
        types: ["Grass"],
        stats: { hp: 45, atk: 49, def: 65, spa: 49, spd: 65, spe: 45 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Leaf Guard", nameEs: "Defensa Hoja", isHidden: true, description: "Prevents status conditions in sunshine." }
        ],
        signatureMoves: [
            { name: "Leaf Storm", type: "Grass", category: "special", power: 130, accuracy: 90 },
            { name: "Aromatherapy", type: "Grass", category: "status", power: null, accuracy: null }
        ],
        evolutions: [
            { to: 153, toName: "Bayleef", method: "Level 16" },
            { to: 154, toName: "Meganium", method: "Level 32" }
        ],
        description: "A sweet aroma emanates from the leaf on its head. It is docile and loves to soak up sunrays.",
        height: 0.9,
        weight: 6.4,
    },
    {
        pokemonId: 155,
        name: "Cyndaquil",
        nameEs: "Cyndaquil",
        generation: 2,
        types: ["Fire"],
        stats: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Flash Fire", nameEs: "Absorbe Fuego", isHidden: true, description: "Powers up Fire moves if hit by one." }
        ],
        signatureMoves: [
            { name: "Eruption", type: "Fire", category: "special", power: 150, accuracy: 100 },
            { name: "Lava Plume", type: "Fire", category: "special", power: 80, accuracy: 100 }
        ],
        evolutions: [
            { to: 156, toName: "Quilava", method: "Level 14" },
            { to: 157, toName: "Typhlosion", method: "Level 36" }
        ],
        description: "It is timid, and always curls itself up in a ball. If attacked, it flares up its back for protection.",
        height: 0.5,
        weight: 7.9,
    },
    {
        pokemonId: 158,
        name: "Totodile",
        nameEs: "Totodile",
        generation: 2,
        types: ["Water"],
        stats: { hp: 50, atk: 65, def: 64, spa: 44, spd: 48, spe: 43 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Sheer Force", nameEs: "Potencia Bruta", isHidden: true, description: "Removes added effects to increase move damage." }
        ],
        signatureMoves: [
            { name: "Aqua Tail", type: "Water", category: "physical", power: 90, accuracy: 90 },
            { name: "Crunch", type: "Dark", category: "physical", power: 80, accuracy: 100 }
        ],
        evolutions: [
            { to: 159, toName: "Croconaw", method: "Level 18" },
            { to: 160, toName: "Feraligatr", method: "Level 30" }
        ],
        description: "Its powerful jaws can crush anything. Even its Trainer must be careful.",
        height: 0.6,
        weight: 9.5,
    },
    // ==================== GENERATION 3 ====================
    {
        pokemonId: 252,
        name: "Treecko",
        nameEs: "Treecko",
        generation: 3,
        types: ["Grass"],
        stats: { hp: 40, atk: 45, def: 35, spa: 65, spd: 55, spe: 70 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Unburden", nameEs: "Liviano", isHidden: true, description: "Boosts Speed if held item is used." }
        ],
        signatureMoves: [
            { name: "Leaf Blade", type: "Grass", category: "physical", power: 90, accuracy: 100 },
            { name: "Giga Drain", type: "Grass", category: "special", power: 75, accuracy: 100 }
        ],
        evolutions: [
            { to: 253, toName: "Grovyle", method: "Level 16" },
            { to: 254, toName: "Sceptile", method: "Level 36" }
        ],
        description: "It makes its nest in a giant tree in the forest. It ferociously guards against anything nearing its territory.",
        height: 0.5,
        weight: 5.0,
    },
    {
        pokemonId: 255,
        name: "Torchic",
        nameEs: "Torchic",
        generation: 3,
        types: ["Fire"],
        stats: { hp: 45, atk: 60, def: 40, spa: 70, spd: 50, spe: 45 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Speed Boost", nameEs: "Impulso", isHidden: true, description: "Speed increases every turn." }
        ],
        signatureMoves: [
            { name: "Blaze Kick", type: "Fire", category: "physical", power: 85, accuracy: 90 },
            { name: "Brave Bird", type: "Flying", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 256, toName: "Combusken", method: "Level 16" },
            { to: 257, toName: "Blaziken", method: "Level 36" }
        ],
        description: "It has a flame sac inside its belly that perpetually burns. It feels warm if hugged.",
        height: 0.4,
        weight: 2.5,
    },
    {
        pokemonId: 258,
        name: "Mudkip",
        nameEs: "Mudkip",
        generation: 3,
        types: ["Water"],
        stats: { hp: 50, atk: 70, def: 50, spa: 50, spd: 50, spe: 40 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Damp", nameEs: "Humedad", isHidden: true, description: "Prevents the use of self-destructing moves." }
        ],
        signatureMoves: [
            { name: "Muddy Water", type: "Water", category: "special", power: 90, accuracy: 85 },
            { name: "Earthquake", type: "Ground", category: "physical", power: 100, accuracy: 100 }
        ],
        evolutions: [
            { to: 259, toName: "Marshtomp", method: "Level 16" },
            { to: 260, toName: "Swampert", method: "Level 36" }
        ],
        description: "The fin on its head acts as a radar. It uses the fin to sense movement in water and air.",
        height: 0.4,
        weight: 7.6,
    },
    // ==================== GENERATION 4 ====================
    {
        pokemonId: 387,
        name: "Turtwig",
        nameEs: "Turtwig",
        generation: 4,
        types: ["Grass"],
        stats: { hp: 55, atk: 68, def: 64, spa: 45, spd: 55, spe: 31 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Shell Armor", nameEs: "Coraza", isHidden: true, description: "Blocks critical hits." }
        ],
        signatureMoves: [
            { name: "Wood Hammer", type: "Grass", category: "physical", power: 120, accuracy: 100 },
            { name: "Earthquake", type: "Ground", category: "physical", power: 100, accuracy: 100 }
        ],
        evolutions: [
            { to: 388, toName: "Grotle", method: "Level 18" },
            { to: 389, toName: "Torterra", method: "Level 32" }
        ],
        description: "It undertakes photosynthesis with its body, making oxygen. The shell on its back is made of hardened soil.",
        height: 0.4,
        weight: 10.2,
    },
    {
        pokemonId: 390,
        name: "Chimchar",
        nameEs: "Chimchar",
        generation: 4,
        types: ["Fire"],
        stats: { hp: 44, atk: 58, def: 44, spa: 58, spd: 44, spe: 61 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Iron Fist", nameEs: "Puño Férreo", isHidden: true, description: "Boosts punching moves." }
        ],
        signatureMoves: [
            { name: "Flare Blitz", type: "Fire", category: "physical", power: 120, accuracy: 100 },
            { name: "Close Combat", type: "Fighting", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 391, toName: "Monferno", method: "Level 14" },
            { to: 392, toName: "Infernape", method: "Level 36" }
        ],
        description: "The fire on its tail is produced by burning gas in its belly. Even rain can't extinguish it.",
        height: 0.5,
        weight: 6.2,
    },
    {
        pokemonId: 393,
        name: "Piplup",
        nameEs: "Piplup",
        generation: 4,
        types: ["Water"],
        stats: { hp: 53, atk: 51, def: 53, spa: 61, spd: 56, spe: 40 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Defiant", nameEs: "Competitivo", isHidden: true, description: "Boosts Attack when stats are lowered." }
        ],
        signatureMoves: [
            { name: "Hydro Pump", type: "Water", category: "special", power: 110, accuracy: 80 },
            { name: "Ice Beam", type: "Ice", category: "special", power: 90, accuracy: 100 }
        ],
        evolutions: [
            { to: 394, toName: "Prinplup", method: "Level 16" },
            { to: 395, toName: "Empoleon", method: "Level 36" }
        ],
        description: "It lives along shores in northern countries. An expert swimmer, it dives for over 10 minutes to hunt.",
        height: 0.4,
        weight: 5.2,
    },
    // ==================== GENERATION 5 ====================
    {
        pokemonId: 495,
        name: "Snivy",
        nameEs: "Snivy",
        generation: 5,
        types: ["Grass"],
        stats: { hp: 45, atk: 45, def: 55, spa: 45, spd: 55, spe: 63 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Contrary", nameEs: "Respondón", isHidden: true, description: "Makes stat changes have opposite effect." }
        ],
        signatureMoves: [
            { name: "Leaf Storm", type: "Grass", category: "special", power: 130, accuracy: 90 },
            { name: "Glare", type: "Normal", category: "status", power: null, accuracy: 100 }
        ],
        evolutions: [
            { to: 496, toName: "Servine", method: "Level 17" },
            { to: 497, toName: "Serperior", method: "Level 36" }
        ],
        description: "It is very intelligent and calm. Being exposed to lots of sunlight makes its movements swifter.",
        height: 0.6,
        weight: 8.1,
    },
    {
        pokemonId: 498,
        name: "Tepig",
        nameEs: "Tepig",
        generation: 5,
        types: ["Fire"],
        stats: { hp: 65, atk: 63, def: 45, spa: 45, spd: 45, spe: 45 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Thick Fat", nameEs: "Grasa Gruesa", isHidden: true, description: "Halves damage from Fire and Ice moves." }
        ],
        signatureMoves: [
            { name: "Flare Blitz", type: "Fire", category: "physical", power: 120, accuracy: 100 },
            { name: "Head Smash", type: "Rock", category: "physical", power: 150, accuracy: 80 }
        ],
        evolutions: [
            { to: 499, toName: "Pignite", method: "Level 17" },
            { to: 500, toName: "Emboar", method: "Level 36" }
        ],
        description: "It blows fire through its nose. It roasts berries before eating them.",
        height: 0.5,
        weight: 9.9,
    },
    {
        pokemonId: 501,
        name: "Oshawott",
        nameEs: "Oshawott",
        generation: 5,
        types: ["Water"],
        stats: { hp: 55, atk: 55, def: 45, spa: 63, spd: 45, spe: 45 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Shell Armor", nameEs: "Coraza", isHidden: true, description: "Blocks critical hits." }
        ],
        signatureMoves: [
            { name: "Razor Shell", type: "Water", category: "physical", power: 75, accuracy: 95 },
            { name: "Megahorn", type: "Bug", category: "physical", power: 120, accuracy: 85 }
        ],
        evolutions: [
            { to: 502, toName: "Dewott", method: "Level 17" },
            { to: 503, toName: "Samurott", method: "Level 36" }
        ],
        description: "It fights using the scalchop on its stomach. It can counterattack without delay.",
        height: 0.5,
        weight: 5.9,
    },
    // ==================== GENERATION 6 ====================
    {
        pokemonId: 650,
        name: "Chespin",
        nameEs: "Chespin",
        generation: 6,
        types: ["Grass"],
        stats: { hp: 56, atk: 61, def: 65, spa: 48, spd: 45, spe: 38 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Bulletproof", nameEs: "Antibalas", isHidden: true, description: "Protects from ball and bomb moves." }
        ],
        signatureMoves: [
            { name: "Spiky Shield", type: "Grass", category: "status", power: null, accuracy: null },
            { name: "Wood Hammer", type: "Grass", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 651, toName: "Quilladin", method: "Level 16" },
            { to: 652, toName: "Chesnaught", method: "Level 36" }
        ],
        description: "The quills on its head are usually soft. When it flexes them, the points become sharp and piercing.",
        height: 0.4,
        weight: 9.0,
    },
    {
        pokemonId: 653,
        name: "Fennekin",
        nameEs: "Fennekin",
        generation: 6,
        types: ["Fire"],
        stats: { hp: 40, atk: 45, def: 40, spa: 62, spd: 60, spe: 60 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Magician", nameEs: "Prestidigitador", isHidden: true, description: "Steals held item when hitting with a move." }
        ],
        signatureMoves: [
            { name: "Mystical Fire", type: "Fire", category: "special", power: 75, accuracy: 100 },
            { name: "Psyshock", type: "Psychic", category: "special", power: 80, accuracy: 100 }
        ],
        evolutions: [
            { to: 654, toName: "Braixen", method: "Level 16" },
            { to: 655, toName: "Delphox", method: "Level 36" }
        ],
        description: "Eating a twig fills it with energy, and its roomy ears give vent to air hotter than 390 degrees Fahrenheit.",
        height: 0.4,
        weight: 9.4,
    },
    {
        pokemonId: 656,
        name: "Froakie",
        nameEs: "Froakie",
        generation: 6,
        types: ["Water"],
        stats: { hp: 41, atk: 56, def: 40, spa: 62, spd: 44, spe: 71 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Protean", nameEs: "Mutatipo", isHidden: true, description: "Changes type to match move being used." }
        ],
        signatureMoves: [
            { name: "Water Shuriken", type: "Water", category: "special", power: 15, accuracy: 100 },
            { name: "Mat Block", type: "Fighting", category: "status", power: null, accuracy: null }
        ],
        evolutions: [
            { to: 657, toName: "Frogadier", method: "Level 16" },
            { to: 658, toName: "Greninja", method: "Level 36" }
        ],
        description: "It secretes flexible bubbles from its chest and back. They reduce damage from attacks.",
        height: 0.3,
        weight: 7.0,
    },
    // ==================== GENERATION 7 ====================
    {
        pokemonId: 722,
        name: "Rowlet",
        nameEs: "Rowlet",
        generation: 7,
        types: ["Grass", "Flying"],
        stats: { hp: 68, atk: 55, def: 55, spa: 50, spd: 50, spe: 42 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Long Reach", nameEs: "Tiro Largo", isHidden: true, description: "Uses moves without making contact." }
        ],
        signatureMoves: [
            { name: "Spirit Shackle", type: "Ghost", category: "physical", power: 80, accuracy: 100 },
            { name: "Leaf Blade", type: "Grass", category: "physical", power: 90, accuracy: 100 }
        ],
        evolutions: [
            { to: 723, toName: "Dartrix", method: "Level 17" },
            { to: 724, toName: "Decidueye", method: "Level 34" }
        ],
        description: "It stores energy during the day from photosynthesis. It becomes active at night.",
        height: 0.3,
        weight: 1.5,
    },
    {
        pokemonId: 725,
        name: "Litten",
        nameEs: "Litten",
        generation: 7,
        types: ["Fire"],
        stats: { hp: 45, atk: 65, def: 40, spa: 60, spd: 40, spe: 70 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Intimidate", nameEs: "Intimidación", isHidden: true, description: "Lowers opponent's Attack." }
        ],
        signatureMoves: [
            { name: "Darkest Lariat", type: "Dark", category: "physical", power: 85, accuracy: 100 },
            { name: "Flare Blitz", type: "Fire", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 726, toName: "Torracat", method: "Level 17" },
            { to: 727, toName: "Incineroar", method: "Level 34" }
        ],
        description: "While grooming itself, it builds up fur inside its stomach. It sets the fur alight and spews fiery attacks.",
        height: 0.4,
        weight: 4.3,
    },
    {
        pokemonId: 728,
        name: "Popplio",
        nameEs: "Popplio",
        generation: 7,
        types: ["Water"],
        stats: { hp: 50, atk: 54, def: 54, spa: 66, spd: 56, spe: 40 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Liquid Voice", nameEs: "Voz Fluida", isHidden: true, description: "Sound moves become Water type." }
        ],
        signatureMoves: [
            { name: "Sparkling Aria", type: "Water", category: "special", power: 90, accuracy: 100 },
            { name: "Moonblast", type: "Fairy", category: "special", power: 95, accuracy: 100 }
        ],
        evolutions: [
            { to: 729, toName: "Brionne", method: "Level 17" },
            { to: 730, toName: "Primarina", method: "Level 34" }
        ],
        description: "This Pokémon snorts body fluids from its nose, blowing balloons to smash into its foes.",
        height: 0.4,
        weight: 7.5,
    },
    // ==================== GENERATION 8 ====================
    {
        pokemonId: 810,
        name: "Grookey",
        nameEs: "Grookey",
        generation: 8,
        types: ["Grass"],
        stats: { hp: 50, atk: 65, def: 50, spa: 40, spd: 40, spe: 65 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Grassy Surge", nameEs: "Herbogénesis", isHidden: true, description: "Creates Grassy Terrain when entering battle." }
        ],
        signatureMoves: [
            { name: "Drum Beating", type: "Grass", category: "physical", power: 80, accuracy: 100 },
            { name: "Wood Hammer", type: "Grass", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 811, toName: "Thwackey", method: "Level 16" },
            { to: 812, toName: "Rillaboom", method: "Level 35" }
        ],
        description: "When it uses its special stick to strike up a beat, the sound waves produced carry revitalizing energy to plants.",
        height: 0.3,
        weight: 5.0,
    },
    {
        pokemonId: 813,
        name: "Scorbunny",
        nameEs: "Scorbunny",
        generation: 8,
        types: ["Fire"],
        stats: { hp: 50, atk: 71, def: 40, spa: 40, spd: 40, spe: 69 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Libero", nameEs: "Líbero", isHidden: true, description: "Changes type to match move being used." }
        ],
        signatureMoves: [
            { name: "Pyro Ball", type: "Fire", category: "physical", power: 120, accuracy: 90 },
            { name: "Court Change", type: "Normal", category: "status", power: null, accuracy: 100 }
        ],
        evolutions: [
            { to: 814, toName: "Raboot", method: "Level 16" },
            { to: 815, toName: "Cinderace", method: "Level 35" }
        ],
        description: "It runs around to warm up its body, then uses its powerful legs to kick its way through opponents.",
        height: 0.3,
        weight: 4.5,
    },
    {
        pokemonId: 816,
        name: "Sobble",
        nameEs: "Sobble",
        generation: 8,
        types: ["Water"],
        stats: { hp: 50, atk: 40, def: 40, spa: 70, spd: 40, spe: 70 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Sniper", nameEs: "Francotirador", isHidden: true, description: "Powers up critical hits." }
        ],
        signatureMoves: [
            { name: "Snipe Shot", type: "Water", category: "special", power: 80, accuracy: 100 },
            { name: "U-turn", type: "Bug", category: "physical", power: 70, accuracy: 100 }
        ],
        evolutions: [
            { to: 817, toName: "Drizzile", method: "Level 16" },
            { to: 818, toName: "Inteleon", method: "Level 35" }
        ],
        description: "When scared, it cries. Its tears contain enzymes that make enemies cry uncontrollably.",
        height: 0.3,
        weight: 4.0,
    },
    // ==================== GENERATION 9 ====================
    {
        pokemonId: 906,
        name: "Sprigatito",
        nameEs: "Sprigatito",
        generation: 9,
        types: ["Grass"],
        stats: { hp: 40, atk: 61, def: 54, spa: 45, spd: 45, spe: 65 },
        abilities: [
            { name: "Overgrow", nameEs: "Espesura", isHidden: false, description: "Powers up Grass-type moves when HP is low." },
            { name: "Protean", nameEs: "Mutatipo", isHidden: true, description: "Changes type to match move being used." }
        ],
        signatureMoves: [
            { name: "Flower Trick", type: "Grass", category: "physical", power: 70, accuracy: null },
            { name: "Play Rough", type: "Fairy", category: "physical", power: 90, accuracy: 90 }
        ],
        evolutions: [
            { to: 907, toName: "Floragato", method: "Level 16" },
            { to: 908, toName: "Meowscarada", method: "Level 36" }
        ],
        description: "Its fluffy fur has a composition similar to plants. It washes its face to keep its fur moist.",
        height: 0.4,
        weight: 4.1,
    },
    {
        pokemonId: 909,
        name: "Fuecoco",
        nameEs: "Fuecoco",
        generation: 9,
        types: ["Fire"],
        stats: { hp: 67, atk: 45, def: 59, spa: 63, spd: 40, spe: 36 },
        abilities: [
            { name: "Blaze", nameEs: "Mar Llamas", isHidden: false, description: "Powers up Fire-type moves when HP is low." },
            { name: "Unaware", nameEs: "Ignorante", isHidden: true, description: "Ignores opponent's stat changes." }
        ],
        signatureMoves: [
            { name: "Torch Song", type: "Fire", category: "special", power: 80, accuracy: 100 },
            { name: "Shadow Ball", type: "Ghost", category: "special", power: 80, accuracy: 100 }
        ],
        evolutions: [
            { to: 910, toName: "Crocalor", method: "Level 16" },
            { to: 911, toName: "Skeledirge", method: "Level 36" }
        ],
        description: "It lies on warm rocks and uses the heat absorbed by its body to create fire energy.",
        height: 0.4,
        weight: 9.8,
    },
    {
        pokemonId: 912,
        name: "Quaxly",
        nameEs: "Quaxly",
        generation: 9,
        types: ["Water"],
        stats: { hp: 55, atk: 65, def: 45, spa: 50, spd: 45, spe: 50 },
        abilities: [
            { name: "Torrent", nameEs: "Torrente", isHidden: false, description: "Powers up Water-type moves when HP is low." },
            { name: "Moxie", nameEs: "Autoestima", isHidden: true, description: "Boosts Attack after knocking out a Pokémon." }
        ],
        signatureMoves: [
            { name: "Aqua Step", type: "Water", category: "physical", power: 80, accuracy: 100 },
            { name: "Close Combat", type: "Fighting", category: "physical", power: 120, accuracy: 100 }
        ],
        evolutions: [
            { to: 913, toName: "Quaxwell", method: "Level 16" },
            { to: 914, toName: "Quaquaval", method: "Level 36" }
        ],
        description: "It migrated to Paldea from distant lands long ago. The gel in its feathers repels water.",
        height: 0.5,
        weight: 6.1,
    },
];

// Convenience function to get sprites for any starter
export function getStarterSprites(pokemonId: number, shiny: boolean = false) {
    const sprites = getSprites(pokemonId);
    return {
        sprite: shiny ? sprites.shiny : sprites.sprite,
        spriteAnimated: shiny ? sprites.shinyAnimated : sprites.spriteAnimated,
        shiny: sprites.shiny,
        shinyAnimated: sprites.shinyAnimated,
        artwork: sprites.artwork,
        cry: sprites.cry,
    };
}

// Get type color
export function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
        Grass: '#78C850',
        Fire: '#F08030',
        Water: '#6890F0',
        Poison: '#A040A0',
        Flying: '#A890F0',
        Bug: '#A8B820',
        Normal: '#A8A878',
        Electric: '#F8D030',
        Ground: '#E0C068',
        Fighting: '#C03028',
        Psychic: '#F85888',
        Rock: '#B8A038',
        Ice: '#98D8D8',
        Ghost: '#705898',
        Dragon: '#7038F8',
        Dark: '#705848',
        Steel: '#B8B8D0',
        Fairy: '#EE99AC',
    };
    return colors[type] || '#A8A878';
}
