require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'admin');
  
  const users = await db.collection('users').find({}).toArray();
  
  console.log('Total usuarios:', users.length);
  
  for (const user of users) {
    const name = user.minecraftUsername || 'Unknown';
    const partyLen = user.party?.length || 0;
    
    // Contar pokemon en PC (estructura de boxes)
    let pcPokemonCount = 0;
    let pcPokemonList = [];
    
    if (user.pcStorage && Array.isArray(user.pcStorage)) {
      for (const box of user.pcStorage) {
        if (box && box.pokemon && Array.isArray(box.pokemon)) {
          for (const poke of box.pokemon) {
            if (poke && poke.species) {
              pcPokemonCount++;
              pcPokemonList.push(`${poke.species} (Box ${box.boxNumber})`);
            }
          }
        }
      }
    }
    
    if (partyLen > 0 || pcPokemonCount > 0) {
      console.log(`\n${name}:`);
      console.log(`  party: ${partyLen}, PC pokemon: ${pcPokemonCount}`);
      
      // Mostrar especies en party
      if (user.party && user.party.length > 0) {
        const species = user.party.map(p => p?.species || 'null').join(', ');
        console.log(`  party pokemon: ${species}`);
      }
      
      // Mostrar especies en PC
      if (pcPokemonList.length > 0) {
        console.log(`  pc pokemon: ${pcPokemonList.slice(0, 15).join(', ')}`);
        if (pcPokemonList.length > 15) {
          console.log(`  ... y ${pcPokemonList.length - 15} más`);
        }
      }
    }
  }
  
  await client.close();
}
main();
