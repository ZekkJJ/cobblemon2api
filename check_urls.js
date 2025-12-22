const fs = require('fs');
const urls = JSON.parse(fs.readFileSync('./pokemon_urls.json', 'utf8'));
console.log('Total URLs:', urls.length);
console.log('\nFirst 10:');
urls.slice(0, 10).forEach((url, i) => console.log(`${i+1}. ${url}`));
