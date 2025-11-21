/**
 * Test script to verify Wikidata enrichment is working
 * Run with: node test-wikidata-fetch.js
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function testWikidataFetch() {
  console.log("Testing Wikidata enrichment for Annie M.G. Schmidt...\n");
  
  // First, get KB data with linked data
  const KB_SRU_URL = "https://jsru.kb.nl/sru/sru";
  const query = 'creator="schmidt, annie"';
  const params = {
    operation: 'searchRetrieve',
    'x-collection': 'GGC',
    query: query,
    maximumRecords: 1,
    recordSchema: 'dcx'
  };
  
  try {
    const response = await axios.get(KB_SRU_URL, { params });
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const result = parser.parse(response.data);
    const records = result['srw:searchRetrieveResponse']?.['srw:records']?.['srw:record'];
    
    if (!records || records.length === 0) {
      console.log("No records found!");
      return;
    }
    
    const record = Array.isArray(records) ? records[0] : records;
    const metadata = record['srw:recordData']?.['dcx:recordData'];
    
    console.log("Book found:", metadata['dc:title']);
    console.log("\nChecking for linked data creators...");
    
    const creators = metadata['dcterms:creator'];
    if (!creators) {
      console.log("No creators with linked data found");
      return;
    }
    
    const creatorArray = Array.isArray(creators) ? creators : [creators];
    console.log(`Found ${creatorArray.length} creator(s)\n`);
    
    for (const creator of creatorArray) {
      const resourceIdentifier = creator['@_dcx:resourceIdentifier'];
      if (!resourceIdentifier) continue;
      
      console.log("Creator URI:", resourceIdentifier);
      
      // Fetch linked data
      try {
        const ldResponse = await axios.get(resourceIdentifier, {
          headers: { 'Accept': 'application/rdf+xml' }
        });
        
        const ldData = parser.parse(ldResponse.data);
        console.log("Linked data fetched successfully");
        
        // Check for sameAs links
        const description = ldData['rdf:RDF']?.['rdf:Description'];
        if (description) {
          const sameAs = description['owl:sameAs'];
          if (sameAs) {
            const sameAsArray = Array.isArray(sameAs) ? sameAs : [sameAs];
            console.log("\nSameAs links found:");
            sameAsArray.forEach(link => {
              const uri = link['@_rdf:resource'];
              console.log("  -", uri);
              if (uri && uri.includes('wikidata.org')) {
                console.log("    ✓ WIKIDATA LINK FOUND!");
                const match = uri.match(/wikidata\.org\/(entity|wiki)\/(Q\d+)/);
                if (match) {
                  console.log("    Wikidata ID:", match[2]);
                }
              }
            });
          }
        }
      } catch (error) {
        console.log("Error fetching linked data:", error.message);
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testWikidataFetch();
