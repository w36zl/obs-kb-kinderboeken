const https = require('https');

// Test actual Nijntje book ISBNs from KB
const testISBNs = [
  '9789056477448', // Nijntje in de dierentuin
  '9789056479534', // Nijntje op vakantie
  '9789056479541', // Nijntje in het ziekenhuis
];

console.log('Testing cover sources for Nijntje books...\n');

async function testCover(isbn, title) {
  console.log(`\n📖 ${title} (ISBN: ${isbn})`);
  
  // Test Open Library
  const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  console.log(`  Testing Open Library: ${olUrl}`);
  
  await new Promise((resolve) => {
    https.get(olUrl, (res) => {
      const size = parseInt(res.headers['content-length'] || '0');
      console.log(`    Status: ${res.statusCode}, Size: ${size} bytes`);
      if (size < 1000) {
        console.log(`    ❌ Too small - placeholder`);
      } else {
        console.log(`    ✅ Valid cover!`);
      }
      resolve();
    });
  });
  
  // Test Bol.com via search
  const searchUrl = `https://www.bol.com/nl/nl/s/?searchtext=${isbn}`;
  console.log(`  Testing Bol.com search: ${searchUrl}`);
  
  await new Promise((resolve) => {
    https.get(searchUrl, (res) => {
      console.log(`    Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const productMatch = data.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
          if (productMatch) {
            console.log(`    ✅ Product found: ${productMatch[1]}`);
          } else {
            console.log(`    ❌ No product found`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

async function runTests() {
  for (let i = 0; i < testISBNs.length; i++) {
    await testCover(testISBNs[i], `Nijntje Book ${i + 1}`);
  }
}

runTests();
