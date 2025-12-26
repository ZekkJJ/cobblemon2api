// Test script para verificar el endpoint de gacha
const fetch = require('node-fetch');

const API_URL = 'https://api.playadoradarp.xyz/port/25617';
const DISCORD_ID = '478742167557505034'; // Tu Discord ID

async function testGachaPull() {
  console.log('Testing gacha pull endpoint...');
  console.log('API URL:', API_URL);
  console.log('Discord ID:', DISCORD_ID);
  
  try {
    // Test single pull
    console.log('\n--- Testing Single Pull ---');
    const pullRes = await fetch(`${API_URL}/api/pokemon-gacha/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: DISCORD_ID,
        bannerId: 'standard',
      }),
    });
    
    const pullData = await pullRes.json();
    console.log('Status:', pullRes.status);
    console.log('Response:', JSON.stringify(pullData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGachaPull();
