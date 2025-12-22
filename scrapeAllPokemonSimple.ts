import * as fs from 'fs/promises';
import * as path from 'path';

const BATCH_SIZE = 3; // Reduced batch size to avoid rate limits with heavy extract
const DELAY = 2000;

// Global variable to be populated in main
let pokemonUrls: string[] = [];

// Schema for Firecrawl Extract
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    pokedex_number: { type: "string" },
    sprite_url: { type: "string", description: "The URL of the main Pokemon sprite image. Look for the main image on the page." },
    types: { type: "array", items: { type: "string" } },
    abilities: { type: "array", items: { type: "string" } },
    ev_yield: { type: "string" },
    dropped_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sprite_url: { type: "string" },
          chance: { type: "string" },
          quantity: { type: "string" }
        },
        required: ["name", "chance", "quantity"]
      }
    },
    base_stats: {
      type: "object",
      properties: {
        hp: { type: "number" },
        attack: { type: "number" },
        defence: { type: "number" },
        sp_atk: { type: "number" },
        sp_def: { type: "number" },
        speed: { type: "number" }
      },
      required: ["hp", "attack", "defence", "sp_atk", "sp_def", "speed"]
    },
    spawn_locations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          bucket: { type: "string" },
          level: { type: "string" },
          preset: { type: "string" },
          requirements: {
            type: "object",
            properties: {
              biomes_yes: { type: "array", items: { type: "string" } },
              biomes_no: { type: "array", items: { type: "string" } },
              other: { type: "object", additionalProperties: { type: "string" } }
            }
          }
        }
      }
    }
  },
  required: ["name", "sprite_url", "types", "base_stats"]
};

// Interface matching the schema for TypeScript usage
interface PokemonData {
  name: string;
  pokedex_number: string;
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
}

async function scrapePokemon(url: string): Promise<PokemonData | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fc-4b3408b0ebf24a498e7ac66f5f41eb24'
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          schema: schema,
          prompt: "Extract detailed information about this Pokemon including its stats, drops, and spawn locations. Find the main sprite image URL."
        }
      })
    });

    if (!response.ok) {
      // Log the error body for more context
      const errorText = await response.text();
      console.error(`Failed to scrape ${url}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    if (data.data?.extract) {
      return data.data.extract as PokemonData;
    }

    console.warn(`No extract data found for ${url}`);
    return null;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function main() {
  // Load URLs here
  try {
    const content = await fs.readFile('./pokemon_urls.json', 'utf8');
    pokemonUrls = JSON.parse(content);
  } catch (e) {
    console.error("Error reading pokemon_urls.json:", e);
    return;
  }

  console.log(`Starting Firecrawl Extract for ${pokemonUrls.length} Pokemon...`);

  await fs.mkdir('./pokemon_data', { recursive: true });

  // Create a tracking file to know what we've done if it crashes
  const completedFile = './pokemon_data/_completed.json';
  let completed: string[] = [];
  try {
    completed = JSON.parse(await fs.readFile(completedFile, 'utf8'));
  } catch (e) {
    // ignore
  }

  // Filter out already scraped urls
  const remainingUrls = pokemonUrls.filter(url => {
    const name = url.split('/').pop() || 'unknown';
    return !completed.includes(name);
  });

  console.log(`Already completed: ${completed.length}. Remaining: ${remainingUrls.length}`);

  for (let i = 0; i < remainingUrls.length; i += BATCH_SIZE) {
    const batch = remainingUrls.slice(i, Math.min(i + BATCH_SIZE, remainingUrls.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remainingUrls.length / BATCH_SIZE);

    console.log(`\nProcessing Batch ${batchNum}/${totalBatches} (${batch.length} Pokemon)`);

    const promises = batch.map(url => scrapePokemon(url));
    const results = await Promise.all(promises);

    for (const pokemon of results) {
      if (pokemon) {
        const fileName = `./pokemon_data/${pokemon.name.toLowerCase()}.json`;
        await fs.writeFile(fileName, JSON.stringify(pokemon, null, 2));
        console.log(`✓ ${pokemon.name} saved`);
        completed.push(pokemon.name.toLowerCase());
      }
    }

    // Save progress
    await fs.writeFile(completedFile, JSON.stringify(completed, null, 2));

    if (i + BATCH_SIZE < remainingUrls.length) {
      console.log(`Waiting ${DELAY}ms to respect rate limits...`);
      await new Promise(resolve => setTimeout(resolve, DELAY));
    }
  }

  console.log('\n✅ Scraping Complete!');
}

main();
