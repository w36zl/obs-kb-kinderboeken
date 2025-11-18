// Simple test to check cover availability for a Dutch book
const https = require('https');

const testISBN = '9789025779245'; // A known Dutch children's book ISBN

console.log('Testing cover sources for ISBN:', testISBN);
console.log('');

// Test Open Library
const openLibUrl = `https://covers.openlibrary.org/b/isbn/${testISBN}-L.jpg`;
console.log('1. Open Library:', openLibUrl);
https.get(openLibUrl, (res) => {
  const size = parseInt(res.headers['content-length'] || '0');
  console.log(`   Status: ${res.statusCode}, Size: ${size} bytes`);
  if (size < 1000) console.log('   ⚠️  Too small - likely placeholder');
  else console.log('   ✅ Valid cover!');
  console.log('');
  
  // Test Bol.com product page
  console.log('2. Checking Bol.com...');
  const bolUrl = `https://www.bol.com/nl/nl/p/${testISBN}/`;
  https.get(bolUrl, (bolRes) => {
    console.log(`   Status: ${bolRes.statusCode}`);
    let data = '';
    bolRes.on('data', chunk => data += chunk);
    bolRes.on('end', () => {
      const imgMatch = data.match(/https:\/\/media\.s-bol\.com\/[^"]+\.jpg/);
      if (imgMatch) {
        console.log(`   ✅ Found cover: ${imgMatch[0]}`);
      } else {
        console.log('   ❌ No cover found on page');
      }
    });
  });
});
