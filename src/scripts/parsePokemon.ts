interface PokemonData {
  name: string;
  sprite_url: string;
  types: string[];
  abilities: string[];
  ev_yield: string;
  dropped_items: Array<{
    name: string;
    sprite_url: string;
    chance: string;
    quantity: string;
  }>;
  base_stats: {
    hp: number;
    attack: number;
    defence: number;
    sp_atk: number;
    sp_def: number;
    speed: number;
  };
  spawn_locations: Array<{
    bucket: string;
    level: string;
    preset?: string;
    requirements: {
      biomes_yes: string[];
      biomes_no: string[];
      other: Record<string, string>;
    };
  }>;
  moves?: {
    level: Array<{
      level: number;
      move: string;
      type: string;
      category: string;
      base_power: number | string;
      accuracy: number;
      pp: number;
    }>;
    tm?: any[];
    egg?: any[];
    tutor?: any[];
  };
  can_ride?: {
    seats: number;
    air_mount?: {
      acceleration: number;
      jump: number;
      skill: number;
      speed: number;
      stamina: number;
    };
    ground_mount?: {
      acceleration: number;
      jump: number;
      skill: number;
      speed: number;
      stamina: number;
    };
  };
}

export function parsePokemonMarkdown(markdown: string): PokemonData {
  const lines = markdown.split('\n');
  
  const sprite_url = lines[0].match(/!\[.*?\]\((.*?)\)/)?.[1] || '';
  const name = sprite_url.split('/').filter(s => s).pop()?.split('.')[0] || '';
  
  const types: string[] = [];
  const abilities: string[] = [];
  let ev_yield = '';
  const dropped_items: PokemonData['dropped_items'] = [];
  const base_stats: PokemonData['base_stats'] = {
    hp: 0,
    attack: 0,
    defence: 0,
    sp_atk: 0,
    sp_def: 0,
    speed: 0
  };
  const spawn_locations: PokemonData['spawn_locations'] = [];
  
  let i = 2;
  while (i < lines.length && lines[i].trim() && !lines[i].includes('Abilities')) {
    const type = lines[i].trim();
    if (type && !type.includes('![')) types.push(type);
    i++;
  }
  
  while (i < lines.length && !lines[i].includes('EV Yield')) i++;
  i++;
  if (i < lines.length) ev_yield = lines[i].trim();
  
  while (i < lines.length && !lines[i].includes('Dropped Items')) i++;
  i++;
  while (i < lines.length && lines[i].trim()) {
    const itemName = lines[i++].trim();
    const spriteLine = lines[i++] || '';
    const itemSprite = spriteLine.match(/!\[.*?\]\((.*?)\)/)?.[1] || '';
    
    const chanceLine = lines[i++] || '';
    const chance = chanceLine.replace('Chance:', '').trim();
    
    const quantityLine = lines[i++] || '';
    const quantity = quantityLine.replace('Quantity:', '').trim();
    
    if (itemName && !itemName.includes('Base Stats')) {
      dropped_items.push({
        name: itemName,
        sprite_url: itemSprite,
        chance,
        quantity
      });
    } else {
      break;
    }
  }
  
  while (i < lines.length && !lines[i].includes('Base Stats')) i++;
  i++;
  const statNames = ['HP', 'Attack', 'Defence', 'SpAtk', 'SpDef', 'Speed'];
  for (const statName of statNames) {
    while (i < lines.length && !lines[i].includes(statName)) i++;
    i++;
    const statValue = parseInt(lines[i]?.trim() || '0');
    const key = statName.toLowerCase().replace('spatk', 'sp_atk').replace('spdef', 'sp_def') as keyof PokemonData['base_stats'];
    base_stats[key] = statValue;
    i++;
  }
  
  while (i < lines.length && !lines[i].includes('spawn') && !lines[i].includes('Spawning Details')) i++;
  
  while (lines[i] && lines[i].includes('Spawning Details')) {
    i++;
    const spawn: PokemonData['spawn_locations'][0] = {
      bucket: '',
      level: '',
      requirements: {
        biomes_yes: [],
        biomes_no: [],
        other: {}
      }
    };
    
    while (i < lines.length && lines[i].trim() && !lines[i].includes('Spawning Details')) {
      const line = lines[i].trim();
      
      if (line.includes('Bucket:')) {
        spawn.bucket = line.replace('Bucket:', '').trim();
      } else if (line.includes('Level:')) {
        spawn.level = line.replace('Level:', '').trim();
      } else if (line.includes('Preset:')) {
        spawn.preset = line.replace('Preset:', '').trim();
      } else if (line.includes('Will Spawn in Biomes:')) {
        i++;
        while (i < lines.length && lines[i].trim().startsWith('#')) {
          spawn.requirements.biomes_yes.push(lines[i].trim());
          i++;
        }
        i--;
      } else if (line.includes("Won't Spawn in Biomes:")) {
        i++;
        while (i < lines.length && lines[i].trim().startsWith('#')) {
          spawn.requirements.biomes_no.push(lines[i].trim());
          i++;
        }
        i--;
      } else if (line.includes(':') && !line.includes('http')) {
        const [key, value] = line.split(':');
        if (key && value) {
          spawn.requirements.other[key.trim()] = value.trim();
        }
      }
      
      i++;
    }
    
    if (spawn.bucket) spawn_locations.push(spawn);
  }
  
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sprite_url,
    types,
    abilities,
    ev_yield,
    dropped_items,
    base_stats,
    spawn_locations
  };
}
