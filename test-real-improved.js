const axios = require('axios');

async function testImprovedQuery() {
  console.log('\n=== Testing Improved Query ===\n');

  // The improved query
  const query = 'dc.creator all "Vegara" AND dc.title all "Little People, BIG DREAMS" AND dc.publisher all "vier windstreken"';
  const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&maximumRecords=10`;
  
  console.log('Query:', query);
  console.log('');

  try {
    const response = await axios.get(url);
    const count = response.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('✓ Results found:', count);
    
    if (parseInt(count) > 0) {
      // Show first few titles
      const titles = response.data.match(/<dc:title>([^<]+)<\/dc:title>/g);
      console.log('\nFirst results:');
      titles.slice(0, 5).forEach((t, i) => {
        const title = t.match(/<dc:title>([^<]+)<\/dc:title>/)[1];
        console.log(`  ${i+1}. ${title}`);
      });
    }
  } catch (err) {
    console.log('✗ Error:', err.message);
  }
  
  // Compare to original failing query
  console.log('\n\n=== Comparing to Original Query ===\n');
  const originalQuery = 'dc.creator all "Maria Isabel Sánchez Vegara" AND (dc.relation all "Little People, BIG DREAMS" OR dc.title all "Little People, BIG DREAMS") AND dc.publisher all "De vier windstreken"';
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

testImprovedQuery();
