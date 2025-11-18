const axios = require('axios');

async function testParts() {
  console.log('\n=== Testing Query Parts ===\n');

  // Test 1: Author + Title
  console.log('1. Author + Title:');
  let q1 = 'dc.creator all "Vegara" AND dc.title all "Little People"';
  let url1 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(q1)}&maximumRecords=5`;
  console.log('   Query:', q1);
  
  try {
    const r1 = await axios.get(url1);
    const c1 = r1.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('   Results:', c1);
    
    if (parseInt(c1) > 0) {
      const titles = r1.data.match(/<dc:title>([^<]+)<\/dc:title>/g);
      if (titles) {
        console.log('   First:', titles[0].match(/<dc:title>([^<]+)<\/dc:title>/)[1]);
      }
    }
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test 2: Just title with full series name
  console.log('\n2. Title (full series name):');
  let q2 = 'dc.title all "Little People, BIG DREAMS"';
  let url2 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(q2)}&maximumRecords=5`;
  console.log('   Query:', q2);
  
  try {
    const r2 = await axios.get(url2);
    const c2 = r2.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('   Results:', c2);
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test 3: Title with simpler matching
  console.log('\n3. Title (simpler):');
  let q3 = 'dc.title all "Little People BIG DREAMS"';
  let url3 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(q3)}&maximumRecords=5`;
  console.log('   Query:', q3);
  
  try {
    const r3 = await axios.get(url3);
    const c3 = r3.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('   Results:', c3);
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test 4: Just publisher + author
  console.log('\n4. Author + Publisher:');
  let q4 = 'dc.creator all "Vegara" AND dc.publisher all "windstreken"';
  let url4 = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(q4)}&maximumRecords=5`;
  console.log('   Query:', q4);
  
  try {
    const r4 = await axios.get(url4);
    const c4 = r4.data.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/)?.[1] || '0';
    console.log('   Results:', c4);
    
    if (parseInt(c4) > 0) {
      const titles = r4.data.match(/<dc:title>([^<]+)<\/dc:title>/g);
      if (titles) {
        console.log('\n   Titles found:');
        titles.slice(0, 5).forEach(t => {
          const title = t.match(/<dc:title>([^<]+)<\/dc:title>/)[1];
          console.log('     -', title);
        });
      }
    }
  } catch (err) {
    console.log('   Error:', err.message);
  }
}

testParts();
