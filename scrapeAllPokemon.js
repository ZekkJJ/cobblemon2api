const fs = require('fs').promises;
const path = require('path');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || 'fc-4b3408b0ebf24a498e7ac66f5f41eb24';
const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000;

async function extractPokemonData(urls) {
  const response = await fetch('https://api.firecrawl.dev/v1/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      urls: urls,
      prompt: 'Extract all Pokemon data including: name, pokedex number (from URL or page), types, abilities (include hidden abilities), EV yield, dropped items with sprites URLs chances and quantities, base stats (HP Attack Defence SpAtk SpDef Speed), all spawn locations with bucket level preset biomes and requirements, evolution information if available, and riding information if it can be ridden.',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          pokedex_number: { type: 'string' },
          types: { type: 'array', items: { type: 'string' } },
          abilities: { type: 'array', items: { type: 'string' } },
          sprite_url: { type: 'string' },
          base_stats: {
            type: 'object',
            properties: {
              hp: { type: 'number' },
              attack: { type: 'number' },
              defence: { type: 'number' },
              sp_atk: { type: 'number' },
              sp_def: { type: 'number' },
              speed: { type: 'number' }
            }
          },
          ev_yield: { type: 'string' },
          dropped_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sprite_url: { type: 'string' },
                chance: { type: 'string' },
                quantity: { type: 'string' }
              }
            }
          },
          spawn_locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bucket: { type: 'string' },
                level: { type: 'string' },
                preset: { type: 'string' },
                biomes_yes: { type: 'array', items: { type: 'string' } },
                biomes_no: { type: 'array', items: { type: 'string' } },
                other_requirements: { type: 'object' }
              }
            }
          },
          can_ride: {
            type: 'object',
            properties: {
              rideable: { type: 'boolean' },
              seats: { type: 'number' }
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function scrapePokemon() {
  try {
    const urlsData = await fs.readFile('./pokemon_urls.json', 'utf8');
    const allUrls = JSON.parse(urlsData);
    
    console.log(`Total Pokemon to scrape: ${allUrls.length}`);
    
    await fs.mkdir('./pokemon_data', { recursive: true });
    
    for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
      const batch = allUrls.slice(i, Math.min(i + BATCH_SIZE, allUrls.length));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allUrls.length / BATCH_SIZE);
      
      console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} Pokemon)`);
      
      try {
        const result = await extractPokemonData(batch);
        
        if (result.success && result.data) {
          const pokemonName = result.data.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown';
          const fileName = `./pokemon_data/${pokemonName}.json`;
          
          await fs.writeFile(fileName, JSON.stringify(result.data, null, 2));
          console.log(`✓ Saved: ${pokemonName}`);
        }
        
        if (i + BATCH_SIZE < allUrls.length) {
          console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        console.error(`Error processing batch ${batchNum}:`, error.message);
        console.log('URLs in batch:', batch);
      }
    }
    
    console.log('\n✅ Scraping complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

scrapePokemon();
