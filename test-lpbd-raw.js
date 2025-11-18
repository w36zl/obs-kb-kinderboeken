const axios = require('axios');

async function checkRawData() {
  console.log('\n=== Checking Raw XML Data ===\n');

  let query = 'dc.creator all "Vegara" AND dc.publisher all "windstreken"';
  let url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&maximumRecords=1&x-fields=ISBN`;

  try {
    const response = await axios.get(url);
    const xml = response.data;
    
    // Extract first record
    const recordMatch = xml.match(/<srw:record>([\s\S]*?)<\/srw:record>/);
    if (recordMatch) {
      const record = recordMatch[1];
      
      // Extract fields
      const title = record.match(/<dc:title>([^<]+)<\/dc:title>/)?.[1];
      const creators = record.match(/<dc:creator>([^<]+)<\/dc:creator>/g);
      const publisher = record.match(/<dc:publisher>([^<]+)<\/dc:publisher>/)?.[1];
      const relations = record.match(/<dc:relation>([^<]+)<\/dc:relation>/g);
      
      console.log('Title:', title);
      console.log('\nCreators:');
      if (creators) {
        creators.forEach(c => {
          const value = c.match(/<dc:creator>([^<]+)<\/dc:creator>/)[1];
          console.log('  -', value);
        });
      }
      console.log('\nPublisher:', publisher);
      console.log('\nRelations:');
      if (relations) {
        relations.forEach(r => {
          const value = r.match(/<dc:relation>([^<]+)<\/dc:relation>/)[1];
          console.log('  -', value);
        });
      } else {
        console.log('  (none)');
      }
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkRawData();
