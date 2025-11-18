const https = require('https');

// Test Little People Big Dreams series with Google Books API
const testBooks = [
  { isbn: '9789048834815', title: 'Anne Frank (Dutch)' },
  { isbn: '9789048834846', title: 'Rosa Parks (Dutch)' },
  { isbn: '9789048834853', title: 'Frida Kahlo (Dutch)' },
  { isbn: '9789048848263', title: 'Marie Curie (Dutch)' },
  { isbn: '9781786030047', title: 'Maya Angelou (English)' },
  { isbn: '9781786030191', title: 'Frida Kahlo (English)' },
  { isbn: '9781786030856', title: 'Marie Curie (English)' },
  { isbn: '9781786031808', title: 'Ada Lovelace (English)' },
];

console.log('🧪 Testing Google Books API with Little People Big Dreams\n');
console.log('=' .repeat(70) + '\n');

let completed = 0;
let foundCovers = 0;

testBooks.forEach(({ isbn, title }, index) => {
  setTimeout(() => {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    
    console.log(`📚 ${title}`);
    console.log(`   ISBN: ${isbn}`);
    
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.totalItems > 0 && result.items[0].volumeInfo.imageLinks) {
            const imageLinks = result.items[0].volumeInfo.imageLinks;
            const coverUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
            
            foundCovers++;
            console.log(`   ✅ COVER FOUND!`);
            console.log(`   URL: ${coverUrl}`);
            console.log(`   Sizes available: ${Object.keys(imageLinks).join(', ')}`);
          } else {
            console.log(`   ❌ No cover found`);
          }
          console.log('');
          
          completed++;
          if (completed === testBooks.length) {
            console.log('=' .repeat(70));
            console.log(`\n📊 Google Books Results: ${foundCovers}/${testBooks.length} covers found\n`);
            console.log(`   Success rate: ${Math.round(foundCovers/testBooks.length * 100)}%\n`);
            
            if (foundCovers > 0) {
              console.log('✅ Google Books HAS covers for Little People Big Dreams!');
            } else {
              console.log('⚠️  Google Books doesn\'t have these specific ISBNs.');
            }
          }
        } catch (e) {
          console.log(`   ❌ Error parsing: ${e.message}\n`);
          completed++;
        }
      });
    }).on('error', err => {
      console.log(`   ❌ API Error: ${err.message}\n`);
      completed++;
    });
  }, index * 1200); // Slower to avoid rate limits
});
