const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function checkAuthorField() {
  console.log('\n=== Checking Author Field Format ===\n');

  // Get one LPBD book
  let query = 'dc.creator all "Vegara" AND dc.publisher all "windstreken"';
  let url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&maximumRecords=3&x-fields=ISBN`;

  try {
    const response = await axios.get(url);
    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(response.data);

    const records = result['srw:searchRetrieveResponse']['srw:records']['srw:record'];
    const recordArray = Array.isArray(records) ? records : [records];

    recordArray.forEach((record, i) => {
      console.log(`\n--- Book ${i + 1} ---`);
      const dc = record['srw:recordData']['srw:dc'];
      
      console.log('Title:', dc['dc:title']);
      
      // Check creator format
      const creators = Array.isArray(dc['dc:creator']) ? dc['dc:creator'] : [dc['dc:creator']];
      console.log('Creators:');
      creators.forEach(c => console.log('  -', c));
      
      console.log('Publisher:', dc['dc:publisher']);
      
      // Check relation
      if (dc['dc:relation']) {
        const relations = Array.isArray(dc['dc:relation']) ? dc['dc:relation'] : [dc['dc:relation']];
        console.log('Relations:');
        relations.forEach(r => console.log('  -', r));
      } else {
        console.log('Relations: NONE');
      }
    });
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkAuthorField();
