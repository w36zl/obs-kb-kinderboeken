/**
 * Quick API test - tests 5 diverse books to verify improvements
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
const KB_COLLECTION = "GGC";

class QuickTester {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseTagValue: false,
            trimValues: true,
        });
    }

    buildSearchQuery(query, useChildrensFilter = true) {
        const trimmedQuery = query.trim();
        const titleWords = /\b(de|het|een|van|voor|kleine|grote)\b/i;
        const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z]/.test(trimmedQuery) ||
                               (/^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmedQuery) && 
                                !titleWords.test(trimmedQuery) && 
                                trimmedQuery.split(' ').length >= 2);
        const isLikelySeries = trimmedQuery.includes('"') || /serie|reeks|verzameling/i.test(trimmedQuery);

        let baseQuery;
        if (isLikelyAuthor) {
            baseQuery = `dc.creator="${trimmedQuery}" OR dc.creator all "${trimmedQuery}"`;
        } else if (isLikelySeries) {
            const cleanQuery = trimmedQuery.replace(/"/g, '');
            baseQuery = `dc.title="${cleanQuery}" OR dc.relation="${cleanQuery}" OR dc.title all "${cleanQuery}"`;
        } else {
            baseQuery = `dc.title="${trimmedQuery}" OR dc.title all "${trimmedQuery}"`;
        }

        if (useChildrensFilter) {
            return `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
        }
        return baseQuery;
    }

    async searchKB(query) {
        const searchQuery = this.buildSearchQuery(query);
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=3&x-fields=ISBN`;

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'KBPluginTest/1.0' },
            timeout: 10000
        });

        const parsed = this.parser.parse(response.data);
        const searchRetrieveResponse = parsed["srw:searchRetrieveResponse"];
        if (!searchRetrieveResponse) return [];

        const records = searchRetrieveResponse["srw:records"]?.["srw:record"];
        if (!records) return [];

        const recordArray = Array.isArray(records) ? records : [records];
        
        return recordArray.map(record => {
            const dc = record["srw:recordData"];
            if (!dc) return null;

            const getField = (fieldName) => {
                const field = dc[fieldName];
                if (!field) return undefined;
                if (Array.isArray(field)) return field[0]?.["#text"] || field[0];
                return field["#text"] || field;
            };

            const getMultiple = (fieldName) => {
                const field = dc[fieldName];
                if (!field) return [];
                if (Array.isArray(field)) return field.map(f => f["#text"] || f).filter(v => v);
                const value = field["#text"] || field;
                return value ? [value] : [];
            };

            return {
                title: getField("dc:title") || "Unknown",
                authors: getMultiple("dc:creator"),
                isbn: getMultiple("dc:identifier").find(id => /978\d{10}/.test(id))?.replace(/ISBN:?\s*/i, ''),
            };
        }).filter(Boolean);
    }

    async test(query, description) {
        console.log(`\n📚 Testing: ${description}`);
        console.log(`   Query: "${query}"`);
        
        try {
            const start = Date.now();
            const results = await this.searchKB(query);
            const time = Date.now() - start;

            if (results.length > 0) {
                console.log(`   ✓ Found ${results.length} results in ${time}ms`);
                console.log(`   → "${results[0].title}"`);
                if (results[0].authors.length > 0) {
                    console.log(`     By: ${results[0].authors.join(", ")}`);
                }
                if (results[0].isbn) {
                    console.log(`     ISBN: ${results[0].isbn}`);
                }
                return true;
            } else {
                console.log(`   ✗ No results found`);
                return false;
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
            return false;
        }
    }
}

async function main() {
    console.log("🧪 Quick API Test - 5 Representative Books\n");
    console.log("=" .repeat(60));

    const tester = new QuickTester();
    const tests = [
        { query: "Gruffalo", desc: "Popular title search" },
        { query: "Julia Donaldson", desc: "Author name search" },
        { query: "9789047704539", desc: "ISBN direct lookup" },
        { query: "Nijntje", desc: "Dutch classic" },
        { query: "Kikker is verliefd", desc: "Full title with articles" },
    ];

    let passed = 0;
    for (const test of tests) {
        if (await tester.test(test.query, test.desc)) {
            passed++;
        }
        await new Promise(r => setTimeout(r, 500)); // Small delay
    }

    console.log("\n" + "=".repeat(60));
    console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
    console.log(passed === tests.length ? "✅ ALL TESTS PASSED!" : `⚠️  ${tests.length - passed} test(s) failed`);
    console.log();
}

main().catch(console.error);
