const https = require('https');

async function testRebelseCovers() {
  const query = encodeURIComponent('rebelse meisjes');
  const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${query}&maximumRecords=3&x-fields=ISBN`;
  
  console.log('Testing Rebelse Meisjes series cover images...\n');
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Extract titles and ISBNs
      const titleMatches = [...data.matchAll(/<dc:title>([^<]+)<\/dc:title>/g)];
      const isbnMatches = [...data.matchAll(/<dc:identifier>urn:isbn:([0-9]{13})<\/dc:identifier>/g)];
      
      console.log(`Found ${titleMatches.length} books\n`);
      
      for (let i = 0; i < Math.min(3, titleMatches.length); i++) {
        const title = titleMatches[i][1];
        const isbn = isbnMatches[i] ? isbnMatches[i][1] : 'No ISBN';
        
        console.log(`Book ${i+1}: ${title}`);
        console.log(`  ISBN: ${isbn}`);
        
        if (isbn !== 'No ISBN') {
          const openLibUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          console.log(`  Open Library URL: ${openLibUrl}`);
          
          // Test if cover exists
          https.get(openLibUrl, (coverRes) => {
            console.log(`  Open Library Status: ${coverRes.statusCode} (${coverRes.headers['content-length']} bytes)`);
            if (coverRes.statusCode === 200 && parseInt(coverRes.headers['content-length']) < 1000) {
              console.log(`  ⚠️  Image too small - likely placeholder`);
            } else if (coverRes.statusCode === 200) {
              console.log(`  ✅ Cover available!`);
            } else {
              console.log(`  ❌ Cover not available`);
            }
          });
        }
        console.log('');
      }
    });
  });
}

testRebelseCovers();
