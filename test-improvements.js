/**
 * Test script for KB Plugin improvements
 * Tests the enhanced querying and Bol.com integration with 20 diverse books
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// Test books covering different scenarios
const TEST_BOOKS = [
    // Popular children's books
    { query: "De Gruffalo", type: "title", expectedAuthor: "Julia Donaldson" },
    { query: "Het Muizenhuis", type: "title", expectedSeries: true },
    { query: "Kleine IJsbeer", type: "title", expectedAuthor: "Hans de Beer" },
    
    // Author searches
    { query: "Julia Donaldson", type: "author", expectMultiple: true },
    { query: "Annie M.G. Schmidt", type: "author", expectMultiple: true },
    { query: "Roald Dahl", type: "author", expectMultiple: true },
    
    // Series searches
    { query: "Little People Big Dreams", type: "series", expectMultiple: true },
    { query: "Sam & Julia serie", type: "series", expectMultiple: true },
    { query: "Kikker serie", type: "series", expectMultiple: true },
    
    // ISBN searches
    { isbn: "9789025779245", type: "isbn", expectedTitle: "Marie Curie" },
    { isbn: "9789047704539", type: "isbn", expectedTitle: "Gruffalo" },
    { isbn: "9789025779412", type: "isbn", expectedTitle: "Frida Kahlo" },
    
    // Mixed queries
    { query: "Prentenboek dieren", type: "subject", expectMultiple: true },
    { query: "Vriendschap verhalen", type: "subject", expectMultiple: true },
    
    // Recent popular titles
    { query: "Kikker is verliefd", type: "title", expectedAuthor: "Max Velthuijs" },
    { query: "Pluk van de Petteflet", type: "title", expectedAuthor: "Annie M.G. Schmidt" },
    { query: "Jip en Janneke", type: "title", expectedAuthor: "Annie M.G. Schmidt" },
    
    // Dutch classics
    { query: "Het kleine huis", type: "title", expectMultiple: false },
    { query: "Nijntje", type: "title", expectedAuthor: "Dick Bruna" },
    { query: "De regenboogvis", type: "title", expectedAuthor: "Marcus Pfister" },
];

class KBPluginTester {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseTagValue: false,
            trimValues: true,
        });
        this.results = [];
        this.errors = [];
        this.cache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000;
    }

    /**
     * Simulate the improved buildSearchQuery method
     */
    buildSearchQuery(query, useChildrensFilter = true) {
        const trimmedQuery = query.trim();

        // Detect if query looks like an author name
        const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z][a-z]+/.test(trimmedQuery) || 
                               /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmedQuery);

        // Detect if query is a series search
        const isLikelySeries = trimmedQuery.includes('"') || 
                               /serie|reeks|verzameling/i.test(trimmedQuery);

        let baseQuery;

        if (isLikelyAuthor) {
            baseQuery = `dc.creator="${trimmedQuery}" OR dc.creator all "${trimmedQuery}"`;
        } else if (isLikelySeries) {
            const cleanQuery = trimmedQuery.replace(/"/g, '');
            baseQuery = `dc.title="${cleanQuery}" OR dc.relation="${cleanQuery}" OR dc.title all "${cleanQuery}"`;
        } else {
            baseQuery = `(dc.title="${trimmedQuery}" OR dc.creator="${trimmedQuery}") OR (dc.title all "${trimmedQuery}" OR dc.creator all "${trimmedQuery}")`;
        }

        if (useChildrensFilter) {
            return `(${baseQuery} AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken"))`;
        }

        return baseQuery;
    }

    /**
     * Search KB API
     */
    async searchKB(query, maxResults = 10) {
        try {
            // Check cache
            const cacheKey = `${query}:${maxResults}`;
            const cached = this.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
                console.log(`  ✓ Cache hit for: ${query}`);
                return cached.results;
            }

            const searchQuery = this.buildSearchQuery(query);
            const encodedQuery = encodeURIComponent(searchQuery);
            const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=${maxResults}&x-fields=ISBN`;

            console.log(`  → Query: ${searchQuery.substring(0, 100)}...`);

            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/xml, text/xml, */*',
                    'User-Agent': 'KBPluginTest/1.0',
                },
                timeout: 10000
            });

            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}`);
            }

            const parsed = this.parser.parse(response.data);
            const results = this.parseSearchResults(parsed);

            // Cache results
            this.cache.set(cacheKey, { results, timestamp: Date.now() });

            return results;
        } catch (error) {
            console.error(`  ✗ KB API error:`, error.message);
            return [];
        }
    }

    /**
     * Search by ISBN
     */
    async searchByISBN(isbn) {
        try {
            const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
            const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=ISBN=${cleanISBN}&maximumRecords=1&x-fields=ISBN`;

            const response = await axios.get(url, {
                headers: {
                    'Accept': 'application/xml, text/xml, */*',
                    'User-Agent': 'KBPluginTest/1.0',
                },
                timeout: 10000
            });

            const parsed = this.parser.parse(response.data);
            const results = this.parseSearchResults(parsed);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`  ✗ ISBN search error:`, error.message);
            return null;
        }
    }

    /**
     * Parse KB API results
     */
    parseSearchResults(data) {
        try {
            const searchRetrieveResponse = data["srw:searchRetrieveResponse"];
            if (!searchRetrieveResponse) return [];

            const records = searchRetrieveResponse["srw:records"]?.["srw:record"];
            if (!records) return [];

            const recordArray = Array.isArray(records) ? records : [records];
            
            return recordArray.map(record => {
                const dc = record["srw:recordData"];
                if (!dc) return null;

                const title = this.extractField(dc, "dc:title") || "Unknown";
                const authors = this.extractMultipleFields(dc, "dc:creator");
                const isbn = this.extractISBN(dc);
                const series = this.extractSeries(dc);
                const subjects = this.extractMultipleFields(dc, "dc:subject");

                return { title, authors, isbn, series, subjects };
            }).filter(Boolean);
        } catch (error) {
            console.error("Parse error:", error.message);
            return [];
        }
    }

    extractField(dc, fieldName) {
        const field = dc[fieldName];
        if (!field) return undefined;
        if (Array.isArray(field)) {
            return field[0]?.["#text"] || field[0] || undefined;
        }
        return field["#text"] || field || undefined;
    }

    extractMultipleFields(dc, fieldName) {
        const field = dc[fieldName];
        if (!field) return [];
        if (Array.isArray(field)) {
            return field.map(f => f["#text"] || f).filter(v => v);
        }
        const value = field["#text"] || field;
        return value ? [value] : [];
    }

    extractISBN(dc) {
        const identifiers = this.extractMultipleFields(dc, "dc:identifier");
        for (const id of identifiers) {
            if (typeof id === "string" && id.match(/ISBN|isbn|978|979/)) {
                return id.replace(/ISBN:?\s*/i, "").trim();
            }
        }
        return undefined;
    }

    extractSeries(dc) {
        const relations = this.extractMultipleFields(dc, "dc:relation");
        for (const relation of relations) {
            if (/serie|reeks|deel|volume/i.test(relation)) {
                return relation.trim();
            }
        }

        const isPartOf = this.extractField(dc, "dcterms:isPartOf") || this.extractField(dc, "dc:isPartOf");
        if (isPartOf) return isPartOf.trim();

        const title = this.extractField(dc, "dc:title");
        if (title) {
            const seriesMatch = title.match(/\(([^)]+(?:serie|reeks|deel)[^)]*)\)/i);
            if (seriesMatch) return seriesMatch[1].trim();
        }

        return undefined;
    }

    /**
     * Get Bol.com metadata
     */
    async getBolMetadata(isbn) {
        try {
            console.log(`  → Checking Bol.com for ISBN: ${isbn}`);
            
            const searchParams = new URLSearchParams({ searchtext: isbn });
            const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 10000
            });

            if (response.status !== 200) return null;

            const productUrlMatch = response.data.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
            if (!productUrlMatch) {
                console.log(`  ✗ No Bol.com product found`);
                return null;
            }

            const productUrl = `https://www.bol.com${productUrlMatch[1]}`;
            
            const productResponse = await axios.get(productUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 10000
            });

            const html = productResponse.data;

            // Extract series
            const seriesMatch = html.match(/Serie:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i) ||
                                html.match(/Boekenreeks:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i);
            const series = seriesMatch ? seriesMatch[1].trim() : undefined;

            // Extract page count
            const pageMatch = html.match(/(\d+)\s*pagina's?/i);
            const pageCount = pageMatch ? pageMatch[1] : undefined;

            // Extract cover
            const imageMatches = html.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
            const coverUrl = imageMatches?.find(url => url.includes('550x550')) || imageMatches?.[0];

            if (series || pageCount || coverUrl) {
                console.log(`  ✓ Bol.com enrichment: series=${!!series}, pages=${!!pageCount}, cover=${!!coverUrl}`);
            }

            return { series, pageCount, coverUrl };
        } catch (error) {
            console.log(`  ✗ Bol.com error: ${error.message}`);
            return null;
        }
    }

    /**
     * Test a single book
     */
    async testBook(testCase, index) {
        console.log(`\n[${index + 1}/${TEST_BOOKS.length}] Testing: ${testCase.query || testCase.isbn}`);
        console.log(`  Type: ${testCase.type}`);

        const startTime = Date.now();
        
        try {
            let kbResults;
            
            if (testCase.isbn) {
                kbResults = await this.searchByISBN(testCase.isbn);
                kbResults = kbResults ? [kbResults] : [];
            } else {
                kbResults = await this.searchKB(testCase.query, 5);
            }

            const searchTime = Date.now() - startTime;

            if (kbResults.length === 0) {
                console.log(`  ✗ No results found`);
                this.errors.push({
                    test: testCase.query || testCase.isbn,
                    error: "No results found"
                });
                return;
            }

            console.log(`  ✓ Found ${kbResults.length} result(s) in ${searchTime}ms`);

            // Show first result
            const firstBook = kbResults[0];
            console.log(`  📖 "${firstBook.title}"`);
            if (firstBook.authors?.length > 0) {
                console.log(`     By: ${firstBook.authors.join(", ")}`);
            }
            if (firstBook.isbn) {
                console.log(`     ISBN: ${firstBook.isbn}`);
            }
            if (firstBook.series) {
                console.log(`     Series: ${firstBook.series}`);
            }

            // Test Bol.com enrichment if ISBN available
            let bolData = null;
            if (firstBook.isbn) {
                const bolStartTime = Date.now();
                bolData = await this.getBolMetadata(firstBook.isbn);
                const bolTime = Date.now() - bolStartTime;
                
                if (bolData) {
                    console.log(`  ✓ Bol.com enrichment completed in ${bolTime}ms`);
                    if (bolData.series && !firstBook.series) {
                        console.log(`     + Series: ${bolData.series}`);
                    }
                    if (bolData.pageCount) {
                        console.log(`     + Pages: ${bolData.pageCount}`);
                    }
                }
            }

            // Validate expectations
            if (testCase.expectedAuthor && firstBook.authors) {
                const authorMatch = firstBook.authors.some(a => 
                    a.toLowerCase().includes(testCase.expectedAuthor.toLowerCase())
                );
                if (authorMatch) {
                    console.log(`  ✓ Expected author found`);
                } else {
                    console.log(`  ⚠ Expected author "${testCase.expectedAuthor}" not found`);
                }
            }

            if (testCase.expectedSeries && !firstBook.series && !bolData?.series) {
                console.log(`  ⚠ Expected series info but none found`);
            }

            if (testCase.expectMultiple && kbResults.length === 1) {
                console.log(`  ⚠ Expected multiple results, got only 1`);
            }

            // Record success
            this.results.push({
                test: testCase.query || testCase.isbn,
                type: testCase.type,
                resultsCount: kbResults.length,
                searchTime,
                hasISBN: !!firstBook.isbn,
                hasSeries: !!(firstBook.series || bolData?.series),
                bolEnriched: !!bolData,
                success: true
            });

            // Small delay to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.log(`  ✗ Test failed: ${error.message}`);
            this.errors.push({
                test: testCase.query || testCase.isbn,
                error: error.message
            });
        }
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log("🧪 KB Plugin Enhancement Test Suite");
        console.log("=" .repeat(60));
        console.log(`Testing ${TEST_BOOKS.length} books with improved querying and Bol.com integration\n`);

        for (let i = 0; i < TEST_BOOKS.length; i++) {
            await this.testBook(TEST_BOOKS[i], i);
        }

        this.printSummary();
    }

    /**
     * Print test summary
     */
    printSummary() {
        console.log("\n" + "=".repeat(60));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(60));

        const successful = this.results.length;
        const failed = this.errors.length;
        const total = successful + failed;

        console.log(`\nTotal tests: ${total}`);
        console.log(`✓ Successful: ${successful} (${(successful/total*100).toFixed(1)}%)`);
        console.log(`✗ Failed: ${failed} (${(failed/total*100).toFixed(1)}%)`);

        if (this.results.length > 0) {
            const avgSearchTime = this.results.reduce((sum, r) => sum + r.searchTime, 0) / this.results.length;
            const withISBN = this.results.filter(r => r.hasISBN).length;
            const withSeries = this.results.filter(r => r.hasSeries).length;
            const bolEnriched = this.results.filter(r => r.bolEnriched).length;
            const cacheHits = Array.from(this.cache.values()).length;

            console.log(`\nPerformance:`);
            console.log(`  Average search time: ${avgSearchTime.toFixed(0)}ms`);
            console.log(`  Cache entries: ${cacheHits}`);

            console.log(`\nMetadata quality:`);
            console.log(`  Books with ISBN: ${withISBN}/${successful} (${(withISBN/successful*100).toFixed(1)}%)`);
            console.log(`  Books with series: ${withSeries}/${successful} (${(withSeries/successful*100).toFixed(1)}%)`);
            console.log(`  Bol.com enriched: ${bolEnriched}/${successful} (${(bolEnriched/successful*100).toFixed(1)}%)`);

            // Breakdown by type
            console.log(`\nResults by query type:`);
            const byType = {};
            this.results.forEach(r => {
                byType[r.type] = (byType[r.type] || 0) + 1;
            });
            Object.entries(byType).forEach(([type, count]) => {
                console.log(`  ${type}: ${count} tests`);
            });
        }

        if (this.errors.length > 0) {
            console.log(`\n❌ Failed tests:`);
            this.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }

        console.log("\n" + "=".repeat(60));
        console.log(successful === total ? "✅ ALL TESTS PASSED!" : `⚠️  ${failed} test(s) failed`);
        console.log("=".repeat(60));
    }
}

// Run tests
async function main() {
    const tester = new KBPluginTester();
    await tester.runTests();
}

main().catch(console.error);
