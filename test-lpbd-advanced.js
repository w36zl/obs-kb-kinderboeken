const axios = require('axios');

async function testLPBDSearch() {
  console.log('\n=== Testing Little People Big Dreams Advanced Search ===\n');

  // Test 1: Just series
  console.log('1. Testing SERIES ONLY:');
  let query1 = 'dc.relation all "Little People, BIG DREAMS"';
  let url1 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query1)}&maximumRecords=5`;
  console.log('Query:', query1);
  
  try {
    const response1 = await axios.get(url1);
    const count1 = response1.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count1);
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Test 2: Series in title
  console.log('\n2. Testing SERIES IN TITLE:');
  let query2 = 'dc.title all "Little People"';
  let url2 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query2)}&maximumRecords=5`;
  console.log('Query:', query2);
  
  try {
    const response2 = await axios.get(url2);
    const count2 = response2.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count2);
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Test 3: Author only
  console.log('\n3. Testing AUTHOR ONLY:');
  let query3 = 'dc.creator all "Maria Isabel Sánchez Vegara"';
  let url3 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query3)}&maximumRecords=5`;
  console.log('Query:', query3);
  
  try {
    const response3 = await axios.get(url3);
    const count3 = response3.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count3);
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Test 4: Publisher only
  console.log('\n4. Testing PUBLISHER ONLY:');
  let query4 = 'dc.publisher all "vier windstreken"';
  let url4 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query4)}&maximumRecords=5`;
  console.log('Query:', query4);
  
  try {
    const response4 = await axios.get(url4);
    const count4 = response4.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count4);
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Test 5: Author AND Publisher (relaxed)
  console.log('\n5. Testing AUTHOR AND PUBLISHER:');
  let query5 = 'dc.creator all "Vegara" AND dc.publisher all "windstreken"';
  let url5 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query5)}&maximumRecords=5`;
  console.log('Query:', query5);
  
  try {
    const response5 = await axios.get(url5);
    const count5 = response5.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count5);
    
    // Show first result
    if (count5 > 0) {
      const titleMatch = response5.data.match(/<dc:title>([^<]+)<\/dc:title>/);
      const publisherMatch = response5.data.match(/<dc:publisher>([^<]+)<\/dc:publisher>/);
      const relationMatch = response5.data.match(/<dc:relation>([^<]+)<\/dc:relation>/);
      console.log('\nFirst result:');
      console.log('  Title:', titleMatch?.[1] || 'N/A');
      console.log('  Publisher:', publisherMatch?.[1] || 'N/A');
      console.log('  Relation:', relationMatch?.[1] || 'N/A');
    }
  } catch (err) {
    console.log('Error:', err.message);
  }

  // Test 6: Full query with relaxed matching
  console.log('\n6. Testing FULL QUERY (relaxed):');
  let query6 = 'dc.creator all "Vegara" AND dc.title all "Little People"';
  let url6 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query6)}&maximumRecords=5`;
  console.log('Query:', query6);
  
  try {
    const response6 = await axios.get(url6);
    const count6 = response6.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('Results:', count6);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

testLPBDSearch();
