// Simulate what the plugin does when searching
const https = require('https');

async function testSearch() {
  // Search KB for "Little People Big Dreams"
  const query = 'Little People Big Dreams';
  const encodedQuery = encodeURIComponent(query);
  const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodedQuery}&startRecord=1&maximumRecords=3&x-fields=ISBN`;
  
  console.log('Testing actual KB search flow...\n');
  console.log('Query:', query);
  console.log('URL:', url);
  console.log('');
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Extract ISBNs and titles
      const records = data.split('<srw:record>').slice(1, 4);
      
      console.log(`Found ${records.length} books:\n`);
      
      records.forEach((record, i) => {
        const titleMatch = record.match(/<dc:title>([^<]+)<\/dc:title>/);
        const isbnMatch = record.match(/<dc:identifier>urn:isbn:([0-9]{13})<\/dc:identifier>/);
        
        if (titleMatch && isbnMatch) {
          const title = titleMatch[1];
          const isbn = isbnMatch[1];
          const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          
          console.log(`${i + 1}. ${title}`);
          console.log(`   ISBN: ${isbn}`);
          console.log(`   Open Library URL: ${olUrl}`);
          
          // Test if cover loads
          https.get(olUrl, (coverRes) => {
            const size = parseInt(coverRes.headers['content-length'] || '0');
            if (coverRes.statusCode === 200 && size > 1000) {
              console.log(`   ✅ Cover available (${size} bytes)`);
            } else {
              console.log(`   ❌ No cover (${coverRes.statusCode}, ${size} bytes)`);
            }
          }).on('error', () => {
            console.log(`   ❌ Cover request failed`);
          });
          
          console.log('');
        }
      });
    });
  });
}

testSearch();
