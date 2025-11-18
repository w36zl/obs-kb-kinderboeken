const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Fast ISBN discovery script for book series on Bol.com
 * Processes products in batches and saves progress incrementally
 * Usage: node fetch-series-isbns-fast.js "Series Name" [maxPages] [batchSize]
 */

class FastSeriesISBNFetcher {
    constructor() {
        this.baseUrl = 'https://www.bol.com';
        this.searchUrl = `${this.baseUrl}/nl/nl/s/`;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.isbns = new Set();
        this.processedUrls = new Set();
        this.results = [];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async searchSeriesPage(seriesName, page = 1) {
        try {
            console.log(`🔍 Searching page ${page} for "${seriesName}"`);

            const searchParams = new URLSearchParams({
                searchtext: `"${seriesName}"`,
                page: page.toString()
            });

            const response = await axios.get(`${this.searchUrl}?${searchParams}`, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                timeout: 15000
            });

            // Extract all product URLs from search results
            const productUrls = [];
            const urlMatches = response.data.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/g);

            if (urlMatches) {
                for (const match of urlMatches) {
                    const url = match.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/)[1];
                    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
                    if (!this.processedUrls.has(fullUrl)) {
                        productUrls.push(fullUrl);
                        this.processedUrls.add(fullUrl);
                    }
                }
            }

            console.log(`📚 Found ${productUrls.length} products on page ${page}`);
            return productUrls;

        } catch (error) {
            console.error(`❌ Failed to search page ${page}:`, error.message);
            return [];
        }
    }

    async extractISBNsFromProductPages(productUrls) {
        const batchResults = [];

        for (let i = 0; i < productUrls.length; i++) {
            const productUrl = productUrls[i];

            try {
                console.log(`📖 [${i + 1}/${productUrls.length}] Extracting ISBN from: ${productUrl.split('/').slice(-2, -1)[0]}`);

                const response = await axios.get(productUrl, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    timeout: 10000
                });

                // Extract title
                const titleMatch = response.data.match(/<h1[^>]*>([^<]+)<\/h1>/);
                const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';

                // Extract ISBN (look for 13-digit ISBN starting with 978 or 979)
                const isbnMatch = response.data.match(/97[89]\d{10}/);
                const isbn = isbnMatch ? isbnMatch[0] : null;

                if (isbn && !this.isbns.has(isbn)) {
                    this.isbns.add(isbn);
                    const result = { isbn, title, productUrl };
                    this.results.push(result);
                    batchResults.push(result);
                    console.log(`✅ Found ISBN: ${isbn} - ${title}`);
                } else if (isbn) {
                    console.log(`⏭️  Duplicate ISBN: ${isbn}`);
                } else {
                    console.log(`❌ No ISBN found for: ${title}`);
                }

            } catch (error) {
                console.error(`❌ Failed to extract ISBN from ${productUrl.split('/').slice(-2, -1)[0]}:`, error.message);
            }

            // Respectful delay between requests
            if (i < productUrls.length - 1) {
                await this.delay(1000); // 1 second between requests
            }
        }

        return batchResults;
    }

    async fetchSeriesISBNs(seriesName, maxPages = 3, batchSize = 10) {
        console.log(`🚀 Starting to fetch ISBNs for series: "${seriesName}"`);
        console.log(`📄 Will check up to ${maxPages} pages, processing in batches of ${batchSize}\n`);

        for (let page = 1; page <= maxPages; page++) {
            console.log(`\n=== Page ${page}/${maxPages} ===`);

            // Get product URLs from this page
            const productUrls = await this.searchSeriesPage(seriesName, page);

            if (productUrls.length === 0) {
                console.log(`📄 No more products found on page ${page}, stopping search`);
                break;
            }

            // Process URLs in batches
            for (let i = 0; i < productUrls.length; i += batchSize) {
                const batch = productUrls.slice(i, i + batchSize);
                console.log(`\n--- Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productUrls.length/batchSize)} (${batch.length} products) ---`);

                await this.extractISBNsFromProductPages(batch);

                // Save progress after each batch
                this.saveProgress(seriesName);

                // Delay between batches
                if (i + batchSize < productUrls.length) {
                    console.log(`⏳ Waiting 2 seconds before next batch...`);
                    await this.delay(2000);
                }
            }

            // Delay between pages
            if (page < maxPages) {
                console.log(`⏳ Waiting 3 seconds before next page...`);
                await this.delay(3000);
            }
        }

        return Array.from(this.isbns);
    }

    saveProgress(seriesName) {
        const safeName = seriesName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const progressFile = path.join(__dirname, `${safeName}_progress.json`);

        const progress = {
            series: seriesName,
            timestamp: new Date().toISOString(),
            isbnsFound: Array.from(this.isbns).sort(),
            totalISBNs: this.isbns.size,
            totalProcessed: this.processedUrls.size,
            results: this.results
        };

        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
        console.log(`💾 Progress saved: ${this.isbns.size} ISBNs found so far`);
    }

    generateReport(seriesName) {
        const isbns = Array.from(this.isbns).sort();

        const report = {
            series: seriesName,
            timestamp: new Date().toISOString(),
            summary: {
                totalISBNs: isbns.length,
                totalProductsProcessed: this.processedUrls.size
            },
            isbns: isbns,
            results: this.results
        };

        return report;
    }

    saveReport(seriesName, filename = null) {
        if (!filename) {
            const safeName = seriesName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            filename = `${safeName}_isbns.json`;
        }

        const report = this.generateReport(seriesName);
        const reportPath = path.join(__dirname, filename);

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Report saved to: ${reportPath}`);

        return reportPath;
    }

    printSummary(seriesName) {
        const report = this.generateReport(seriesName);
        const isbns = report.isbns;

        console.log('\n🎉 ISBN Discovery Complete!');
        console.log('📊 Summary:');
        console.log(`   - Series: "${seriesName}"`);
        console.log(`   - Total ISBNs found: ${isbns.length}`);
        console.log(`   - Total products processed: ${report.summary.totalProductsProcessed}`);

        if (isbns.length > 0) {
            console.log('\n📚 ISBNs found:');
            isbns.forEach((isbn, index) => {
                console.log(`   ${index + 1}. ${isbn}`);
            });

            // Also save as simple text file
            const textFilename = `${seriesName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_isbns.txt`;
            const textPath = path.join(__dirname, textFilename);
            fs.writeFileSync(textPath, isbns.join('\n'));
            console.log(`\n📄 ISBN list saved to: ${textPath}`);
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node fetch-series-isbns-fast.js "Series Name" [maxPages] [batchSize]');
        console.log('  Examples:');
        console.log('    node fetch-series-isbns-fast.js "Little People Big Dreams"');
        console.log('    node fetch-series-isbns-fast.js "Little People Big Dreams" 5 5');
        return;
    }

    const seriesName = args[0];
    const maxPages = args[1] ? parseInt(args[1]) : 3;
    const batchSize = args[2] ? parseInt(args[2]) : 10;

    const fetcher = new FastSeriesISBNFetcher();

    try {
        const isbns = await fetcher.fetchSeriesISBNs(seriesName, maxPages, batchSize);

        // Generate and save final report
        fetcher.saveReport(seriesName);
        fetcher.printSummary(seriesName);

        console.log('\n✅ All ISBNs discovered and saved!');
        console.log(`📊 Total unique ISBNs: ${isbns.length}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = FastSeriesISBNFetcher;