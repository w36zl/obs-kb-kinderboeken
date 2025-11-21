const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function test() {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const url = "https://jsru.kb.nl/sru/sru?operation=searchRetrieve&x-collection=GGC&query=creator=%22schmidt,%20annie%22&maximumRecords=1&recordSchema=dcx";
  
  console.log("Fetching:", url);
  const response = await axios.get(url);
  
  console.log("\n=== Raw Response (first 500 chars) ===");
  console.log(response.data.substring(0, 500));
  
  const result = parser.parse(response.data);
  console.log("\n=== Parsed Structure ===");
  console.log(JSON.stringify(result, null, 2).substring(0, 1000));
}

test().catch(console.error);
