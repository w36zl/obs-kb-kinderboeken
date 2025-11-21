const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function test() {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const url = "https://jsru.kb.nl/sru/sru?operation=searchRetrieve&x-collection=GGC&query=creator=%22schmidt,%20annie%22&maximumRecords=1&recordSchema=dcx";
  
  console.log("Fetching with DCX schema...\n");
  const response = await axios.get(url);
  
  const result = parser.parse(response.data);
  const record = result['srw:searchRetrieveResponse']?.['srw:records']?.['srw:record'];
  
  if (!record) {
    console.log("No record found!");
    return;
  }
  
  const recordData = record['srw:recordData'];
  console.log("=== Record Data Keys ===");
  console.log(Object.keys(recordData));
  
  const dcxData = recordData['dcx:recordData'];
  if (dcxData) {
    console.log("\n=== DCX Data Found! ===");
    console.log("Title:", dcxData['dc:title']);
    console.log("\n=== Creator Field ===");
    const creators = dcxData['dcterms:creator'];
    if (creators) {
      const creatorArray = Array.isArray(creators) ? creators : [creators];
      creatorArray.forEach((creator, i) => {
        console.log(`\nCreator ${i+1}:`, creator['#text']);
        console.log("Resource ID:", creator['@_dcx:resourceIdentifier']);
      });
    }
  }
}

test().catch(console.error);
