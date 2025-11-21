const axios = require('axios');

async function test() {
  // First get a PPN from KB
  console.log("Step 1: Finding a book by Annie M.G. Schmidt to get PPN...\n");
  
  const searchUrl = "https://jsru.kb.nl/sru/sru?operation=searchRetrieve&x-collection=GGC&query=creator=%22schmidt,%20annie%22&maximumRecords=1";
  const searchResp = await axios.get(searchUrl);
  
  // Extract PPN from response
  const ppnMatch = searchResp.data.match(/PPN:(\d+)/);
  if (!ppnMatch) {
    console.log("No PPN found!");
    return;
  }
  
  const ppn = ppnMatch[1];
  console.log("✓ Found PPN:", ppn);
  
  // Fetch linked data
  console.log("\nStep 2: Fetching linked data from data.bibliotheken.nl...\n");
  const linkedDataUrl = `https://data.bibliotheken.nl/doc/nbt/${ppn}.json`;
  console.log("URL:", linkedDataUrl);
  
  try {
    const response = await axios.get(linkedDataUrl);
    const data = response.data;
    
    console.log("\n✓ Linked data fetched!");
    
    const graph = Array.isArray(data["@graph"]) ? data["@graph"] : [];
    console.log(`Found ${graph.length} graph entries`);
    
    // Find creators
    const creators = graph.filter(item => item["@type"] === "schema:Person");
    console.log(`\n=== Found ${creators.length} Creator(s) ===`);
    
    for (const creator of creators) {
      console.log("\nCreator:", creator["schema:name"]);
      console.log("ID:", creator["@id"]);
      
      if (creator["owl:sameAs"]) {
        const sameAs = Array.isArray(creator["owl:sameAs"]) ? creator["owl:sameAs"] : [creator["owl:sameAs"]];
        console.log("\nSame As links:");
        sameAs.forEach(link => {
          const uri = typeof link === 'string' ? link : link["@id"];
          console.log("  -", uri);
          if (uri && uri.includes('wikidata.org')) {
            console.log("    ✓✓✓ WIKIDATA FOUND! ✓✓✓");
            const match = uri.match(/wikidata\.org\/(entity|wiki)\/(Q\d+)/);
            if (match) {
              console.log("    Wikidata ID:", match[2]);
            }
          }
        });
      }
    }
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
    }
  }
}

test().catch(console.error);
