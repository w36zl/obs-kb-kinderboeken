const axios = require('axios');

async function testExpansion() {
  console.log('\n=== Testing Real Query Expansion ===\n');

  // Test the expanded query
  const query = 'dc.publisher all "vier windstreken" AND dc.title all "rosa parks"';
  const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&maximumRecords=10`;
  
  console.log('Input: "vier wind ros park"');
  console.log('Expanded Query:', query);
  console.log('');

  try {
    const response = await axios.get(url);
    const count = response.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('✓ Results found:', count);
    
    if (parseInt(count) > 0) {
      const titles = response.data.match(/<dc:title>([^<]+)<\/dc:title>/g);
      console.log('\nBook titles:');
      titles.slice(0, 5).forEach((t, i) => {
        const title = t.match(/<dc:title>([^<]+)<\/dc:title>/)[1];
        console.log(`  ${i+1}. ${title}`);
      });
      
      // Check publisher
      const publishers = response.data.match(/<dc:publisher>([^<]+)<\/dc:publisher>/g);
      if (publishers && publishers[0]) {
        const publisher = publishers[0].match(/<dc:publisher>([^<]+)<\/dc:publisher>/)[1];
        console.log('\nPublisher:', publisher);
      }
    }
  } catch (err) {
    console.log('✗ Error:', err.message);
  }

  // Compare to non-expanded query
  console.log('\n\n=== Comparing to Non-Expanded Query ===\n');
  const originalQuery = '"vier wind ros park"';
  const url2 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(originalQuery)}&maximumRecords=10`;
  
  console.log('Query:', originalQuery);
  console.log('');

  try {
    const response2 = await axios.get(url2);
    const count2 = response2.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results found:', count2);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testExpansion();
