const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

async function testAnnieSchmidt() {
  console.log("=== Testing Wikidata Enrichment for Annie M.G. Schmidt ===\n");
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
  });

  // Step 1: Search KB for Annie M.G. Schmidt
  console.log("Step 1: Searching KB for 'Annie M.G. Schmidt'...");
  const KB_SRU_URL = "https://jsru.kb.nl/sru/sru";
  
  try {
    const searchResponse = await axios.get(KB_SRU_URL, {
      params: {
        operation: 'searchRetrieve',
        'x-collection': 'GGC',
        query: 'creator="schmidt, annie"',
        maximumRecords: 1,
        recordSchema: 'dcx'
      }
    });
    
    const searchResult = parser.parse(searchResponse.data);
    const records = searchResult['srw:searchRetrieveResponse']?.['srw:records']?.['srw:record'];
    
    if (!records) {
      console.log("❌ No records found!");
      return;
    }
    
    const record = Array.isArray(records) ? records[0] : records;
    const metadata = record['srw:recordData']?.['dcx:recordData'];
    
    console.log("✓ Book found:", metadata['dc:title']);
    console.log("");
    
    // Step 2: Check for linked data creators
    console.log("Step 2: Checking for linked data creators...");
    const creators = metadata['dcterms:creator'];
    
    if (!creators) {
      console.log("❌ No dcterms:creator found!");
      return;
    }
    
    const creatorArray = Array.isArray(creators) ? creators : [creators];
    console.log(`✓ Found ${creatorArray.length} creator(s)`);
    
    for (let i = 0; i < creatorArray.length; i++) {
      const creator = creatorArray[i];
      console.log(`\n--- Creator ${i + 1}: ${creator['#text'] || 'Unknown'} ---`);
      
      const resourceIdentifier = creator['@_dcx:resourceIdentifier'];
      if (!resourceIdentifier) {
        console.log("❌ No resourceIdentifier found");
        continue;
      }
      
      console.log("✓ Resource URI:", resourceIdentifier);
      
      // Step 3: Fetch linked data
      console.log("\nStep 3: Fetching linked data from data.bibliotheken.nl...");
      try {
        const ldResponse = await axios.get(resourceIdentifier, {
          headers: { 'Accept': 'application/rdf+xml' }
        });
        
        const ldData = parser.parse(ldResponse.data);
        const description = ldData['rdf:RDF']?.['rdf:Description'];
        
        if (!description) {
          console.log("❌ No RDF description found");
          continue;
        }
        
        console.log("✓ Linked data fetched successfully");
        
        // Check for sameAs links
        const sameAs = description['owl:sameAs'];
        if (!sameAs) {
          console.log("❌ No owl:sameAs links found");
          continue;
        }
        
        const sameAsArray = Array.isArray(sameAs) ? sameAs : [sameAs];
        console.log(`\n✓ Found ${sameAsArray.length} sameAs link(s):`);
        
        let wikidataUri = null;
        sameAsArray.forEach(link => {
          const uri = link['@_rdf:resource'];
          console.log("  -", uri);
          if (uri && uri.includes('wikidata.org')) {
            wikidataUri = uri;
            console.log("    ✓✓✓ WIKIDATA LINK FOUND! ✓✓✓");
          }
        });
        
        if (!wikidataUri) {
          console.log("\n❌ No Wikidata link found in sameAs");
          continue;
        }
        
        // Step 4: Extract Wikidata ID
        console.log("\nStep 4: Extracting Wikidata ID...");
        const match = wikidataUri.match(/wikidata\.org\/(entity|wiki)\/(Q\d+)/);
        if (!match) {
          console.log("❌ Could not extract Wikidata ID from:", wikidataUri);
          continue;
        }
        
        const wikidataId = match[2];
        console.log("✓ Wikidata ID:", wikidataId);
        
        // Step 5: Fetch Wikidata profile
        console.log("\nStep 5: Fetching Wikidata profile...");
        const wikidataUrl = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
        
        const wikidataResponse = await axios.get(wikidataUrl);
        const wikidataEntity = wikidataResponse.data.entities[wikidataId];
        
        if (!wikidataEntity) {
          console.log("❌ No entity data found");
          continue;
        }
        
        console.log("✓ Wikidata entity fetched successfully");
        
        // Extract profile data
        const profile = {
          id: wikidataId,
          name: wikidataEntity.labels?.nl?.value || wikidataEntity.labels?.en?.value,
          description: wikidataEntity.descriptions?.nl?.value || wikidataEntity.descriptions?.en?.value,
        };
        
        // Get birth date (P569)
        if (wikidataEntity.claims?.P569) {
          const birthDate = wikidataEntity.claims.P569[0].mainsnak.datavalue?.value?.time;
          if (birthDate) {
            profile.birthDate = birthDate.substring(1, 11); // Extract YYYY-MM-DD
          }
        }
        
        // Get death date (P570)
        if (wikidataEntity.claims?.P570) {
          const deathDate = wikidataEntity.claims.P570[0].mainsnak.datavalue?.value?.time;
          if (deathDate) {
            profile.deathDate = deathDate.substring(1, 11);
          }
        }
        
        // Get image (P18)
        if (wikidataEntity.claims?.P18) {
          const imageFile = wikidataEntity.claims.P18[0].mainsnak.datavalue?.value;
          if (imageFile) {
            profile.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
          }
        }
        
        // Get Wikipedia URL
        if (wikidataEntity.sitelinks?.nlwiki?.url) {
          profile.wikipediaUrl = wikidataEntity.sitelinks.nlwiki.url;
        }
        
        // Get occupation (P106)
        if (wikidataEntity.claims?.P106) {
          const occupations = wikidataEntity.claims.P106.map(claim => {
            const occupationId = claim.mainsnak.datavalue?.value?.id;
            return occupationId;
          });
          profile.occupation = occupations;
        }
        
        console.log("\n=== WIKIDATA PROFILE ===");
        console.log(JSON.stringify(profile, null, 2));
        console.log("========================\n");
        
        console.log("✅ SUCCESS! Wikidata enrichment working!");
        
      } catch (error) {
        console.log("❌ Error fetching data:", error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAnnieSchmidt();
