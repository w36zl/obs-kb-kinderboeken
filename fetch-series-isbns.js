const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Script to fetch all ISBNs from a book series on Bol.com
 * Usage: node fetch-series-isbns.js "Series Name" [maxPages]
 */

class SeriesISBNFetcher {
    constructor() {
        this.baseUrl = 'https://www.bol.com';
        this.searchUrl = `${this.baseUrl}/nl/nl/s/`;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.isbns = new Set();
        this.processedUrls = new Set();
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

    async extractISBNFromProductPage(productUrl) {
        try {
            console.log(`📖 Extracting ISBN from: ${productUrl}`);

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

            if (isbn) {
                this.isbns.add(isbn);
                console.log(`✅ Found ISBN: ${isbn} - ${title}`);
                return { isbn, title, productUrl };
            } else {
                console.log(`❌ No ISBN found for: ${title}`);
                return null;
            }

        } catch (error) {
            console.error(`❌ Failed to extract ISBN from ${productUrl}:`, error.message);
            return null;
        }
    }

    async fetchSeriesISBNs(seriesName, maxPages = 5) {
        console.log(`🚀 Starting to fetch ISBNs for series: "${seriesName}"`);
        console.log(`📄 Will check up to ${maxPages} pages\n`);

        const allResults = [];

        for (let page = 1; page <= maxPages; page++) {
            console.log(`\n=== Page ${page}/${maxPages} ===`);

            // Get product URLs from this page
            const productUrls = await this.searchSeriesPage(seriesName, page);

            if (productUrls.length === 0) {
                console.log(`📄 No more products found on page ${page}, stopping search`);
                break;
            }

            // Process each product URL
            for (let i = 0; i < productUrls.length; i++) {
                const productUrl = productUrls[i];
                console.log(`\n[${i + 1}/${productUrls.length}] Processing product ${i + 1}/${productUrls.length}`);

                const result = await this.extractISBNFromProductPage(productUrl);
                if (result) {
                    allResults.push(result);
                }

                // Respectful delay between requests
                if (i < productUrls.length - 1) {
                    await this.delay(1500); // 1.5 seconds between product page requests
                }
            }

            // Delay between pages
            if (page < maxPages) {
                console.log(`⏳ Waiting 3 seconds before next page...`);
                await this.delay(3000);
            }
        }

        return allResults;
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
            details: Array.from(this.processedUrls).map(url => ({ url }))
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
        console.log('  node fetch-series-isbns.js "Series Name" [maxPages]');
        console.log('  Examples:');
        console.log('    node fetch-series-isbns.js "Little People Big Dreams"');
        console.log('    node fetch-series-isbns.js "Sam & Julia / Het Muizenhuis" 10');
        return;
    }

    const seriesName = args[0];
    const maxPages = args[1] ? parseInt(args[1]) : 5;

    const fetcher = new SeriesISBNFetcher();

    try {
        await fetcher.fetchSeriesISBNs(seriesName, maxPages);

        // Generate and save report
        fetcher.saveReport(seriesName);
        fetcher.printSummary(seriesName);

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SeriesISBNFetcher;