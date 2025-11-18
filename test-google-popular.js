const https = require('https');

// Test with popular Dutch and English children's books
const testBooks = [
  { isbn: '9780439708180', title: 'Harry Potter 1 (English)' },
  { isbn: '9789076174068', title: 'Harry Potter 1 (Dutch)' },
  { isbn: '9789025735722', title: 'De Gruffalo (Dutch)' },
  { isbn: '9780140569520', title: 'The Gruffalo (English)' },
  { isbn: '9780241346914', title: 'Diary of a Wimpy Kid' },
  { isbn: '9789026142130', title: 'Het Dagboek van een Muts (Dutch)' },
  { isbn: '9780545010221', title: 'Hunger Games' },
  { isbn: '9780439139595', title: 'Harry Potter 4' },
];

console.log('🧪 Testing Google Books with Popular Children\'s Books\n');

let completed = 0;
let foundCovers = 0;

testBooks.forEach(({ isbn, title }, index) => {
  setTimeout(() => {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.totalItems > 0 && result.items[0].volumeInfo.imageLinks) {
            foundCovers++;
            console.log(`✅ ${title}`);
          } else {
            console.log(`❌ ${title}`);
          }
          
          completed++;
          if (completed === testBooks.length) {
            console.log(`\n📊 Google Books Coverage: ${foundCovers}/${testBooks.length} (${Math.round(foundCovers/testBooks.length * 100)}%)\n`);
          }
        } catch (e) {
          completed++;
        }
      });
    }).on('error', () => {
      completed++;
    });
  }, index * 1200);
});
