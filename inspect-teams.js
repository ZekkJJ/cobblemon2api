/**
 * Script para inspeccionar datos de equipos en MongoDB
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function inspect() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE || 'admin');

  console.log('\n=== INSPECCIÓN DE DATOS DE EQUIPOS ===\n');

  // Total users
  const totalUsers = await db.collection('users').countDocuments();
  console.log(`Total usuarios: ${totalUsers}`);

  // Users with minecraftUsername
  const withUsername = await db.collection('users').countDocuments({ 
    minecraftUsername: { $exists: true, $ne: '' } 
  });
  console.log(`Con minecraftUsername: ${withUsername}`);

  // Verified users
  const verified = await db.collection('users').countDocuments({ verified: true });
  console.log(`Verificados: ${verified}`);

  // Users with pokemonParty
  const withParty = await db.collection('users').countDocuments({ 
    pokemonParty: { $exists: true, $ne: [] } 
  });
  console.log(`Con pokemonParty: ${withParty}`);

  // Users with party >= 3
  const withParty3Plus = await db.collection('users').find({
    pokemonParty: { $exists: true }
  }).toArray();
  
  const teamsOf3Plus = withParty3Plus.filter(u => {
    const party = u.pokemonParty || [];
    const validPokemon = party.filter(p => p && typeof p.level === 'number' && p.level > 0);
    return validPokemon.length >= 3;
  });
  console.log(`Con party >= 3 Pokémon válidos: ${teamsOf3Plus.length}`);

  // Show sample users with party
  console.log('\n=== MUESTRA DE USUARIOS CON PARTY ===\n');
  const sampleUsers = await db.collection('users').find({
    pokemonParty: { $exists: true, $ne: [] }
  }).limit(10).toArray();

  for (const user of sampleUsers) {
    const party = user.pokemonParty || [];
    const validPokemon = party.filter(p => p && typeof p.level === 'number' && p.level > 0);
    console.log(`- ${user.minecraftUsername || 'Sin nombre'} (verified: ${user.verified})`);
    console.log(`  Party total: ${party.length}, Válidos: ${validPokemon.length}`);
    if (validPokemon.length > 0) {
      console.log(`  Pokémon: ${validPokemon.map(p => `${p.species || 'Unknown'} Lv.${p.level}`).join(', ')}`);
    }
  }

  // Check level cap
  console.log('\n=== LEVEL CAP CONFIG ===\n');
  const levelCapConfig = await db.collection('level_caps').findOne({});
  if (levelCapConfig) {
    console.log('Level cap config encontrado');
    const activeTimeRules = (levelCapConfig.timeBasedRules || []).filter(r => r.active);
    const activeStaticRules = (levelCapConfig.staticRules || []).filter(r => r.active);
    console.log(`Time rules activas: ${activeTimeRules.length}`);
    console.log(`Static rules activas: ${activeStaticRules.length}`);
    
    // Calculate current cap
    let currentCap = 100;
    const now = new Date();
    for (const rule of activeTimeRules) {
      if (rule.targetCap === 'ownership' || rule.targetCap === 'both') {
        if (new Date(rule.startDate) <= now && (!rule.endDate || new Date(rule.endDate) >= now)) {
          const daysPassed = Math.floor((now.getTime() - new Date(rule.startDate).getTime()) / (1000 * 60 * 60 * 24));
          let cap = rule.startCap || 100;
          if (rule.progression?.type === 'daily') cap += daysPassed * (rule.progression.dailyIncrease || 0);
          if (rule.maxCap) cap = Math.min(cap, rule.maxCap);
          currentCap = Math.min(currentCap, cap);
          console.log(`  Rule "${rule.name}": cap = ${cap}`);
        }
      }
    }
    for (const rule of activeStaticRules) {
      if (rule.ownershipCap != null) {
        currentCap = Math.min(currentCap, rule.ownershipCap);
        console.log(`  Static rule "${rule.name}": ownershipCap = ${rule.ownershipCap}`);
      }
    }
    console.log(`\nLevel cap actual calculado: ${currentCap}`);
  } else {
    console.log('No hay config de level cap');
  }

  await client.close();
  console.log('\n=== FIN ===\n');
}

inspect().catch(console.error);
