const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Bol.com Book Cover Scraper
 * Can scrape individual ISBNs or entire book series
 *
 * Usage:
 * - Individual ISBNs: node bol-series-scraper.js isbn1 isbn2 isbn3
 * - From file: node bol-series-scraper.js --file isbns.txt
 * - Series: node bol-series-scraper.js --series "Sam & Julia / Het Muizenhuis"
 */

class BolSeriesScraper {
    constructor() {
        this.baseUrl = 'https://www.bol.com';
        this.searchUrl = `${this.baseUrl}/nl/nl/s/`;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.results = [];
        this.errors = [];
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async searchBook(isbn) {
        try {
            console.log(`🔍 Searching for ISBN: ${isbn}`);

            const searchParams = new URLSearchParams({
                searchtext: isbn
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
                timeout: 10000
            });

            // Extract product URL from search results - look for /p/ pattern
            const productUrlMatch = response.data.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
            if (!productUrlMatch) {
                console.log(`❌ No product found for ISBN: ${isbn}`);
                return null;
            }

            const productUrl = productUrlMatch[1];
            const fullProductUrl = productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`;

            console.log(`📖 Found product: ${fullProductUrl}`);
            return fullProductUrl;

        } catch (error) {
            console.error(`❌ Search failed for ISBN ${isbn}:`, error.message);
            return null;
        }
    }

    async searchSeries(seriesName, maxBooks = 20) {
        try {
            console.log(`🔍 Searching for series: "${seriesName}"`);

            const searchParams = new URLSearchParams({
                searchtext: `"${seriesName}"`,
                page: '1'
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
                    if (!productUrls.includes(fullUrl)) {
                        productUrls.push(fullUrl);
                    }
                }
            }

            console.log(`📚 Found ${productUrls.length} books in series "${seriesName}"`);
            return productUrls.slice(0, maxBooks); // Limit results

        } catch (error) {
            console.error(`❌ Series search failed for "${seriesName}":`, error.message);
            return [];
        }
    }

    async getBookInfo(productUrl) {
        try {
            console.log(`📖 Fetching book info from: ${productUrl}`);

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

            // Extract ISBN
            const isbnMatch = response.data.match(/978\d{10}/);
            const isbn = isbnMatch ? isbnMatch[0] : null;

            // Extract cover image URL
            const imageMatches = response.data.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
            const coverUrl = imageMatches ? imageMatches[0] : null;

            return {
                title,
                isbn,
                coverUrl,
                productUrl
            };

        } catch (error) {
            console.error(`❌ Failed to fetch book info from ${productUrl}:`, error.message);
            return null;
        }
    }

    async downloadImage(imageUrl, filename) {
        try {
            console.log(`⬇️  Downloading: ${filename}`);

            const response = await axios.get(imageUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                },
                timeout: 15000
            });

            const outputPath = path.join(__dirname, 'covers', filename);
            const writer = fs.createWriteStream(outputPath);

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ Saved: ${path.relative(__dirname, outputPath)}`);
                    resolve(outputPath);
                });
                writer.on('error', reject);
            });

        } catch (error) {
            console.error(`❌ Failed to download ${filename}:`, error.message);
            return null;
        }
    }

    async scrapeBook(isbn) {
        try {
            // Step 1: Search for the book
            const productUrl = await this.searchBook(isbn);
            if (!productUrl) {
                this.errors.push({ isbn, error: 'No product found' });
                return null;
            }

            // Step 2: Get book information
            const bookInfo = await this.getBookInfo(productUrl);
            if (!bookInfo || !bookInfo.coverUrl) {
                this.errors.push({ isbn, error: 'No cover image found' });
                return null;
            }

            // Step 3: Download the image
            const filename = bookInfo.isbn ? `${bookInfo.isbn}.jpg` : `${isbn.replace(/[^0-9]/g, '')}.jpg`;
            const savedPath = await this.downloadImage(bookInfo.coverUrl, filename);

            const result = {
                isbn,
                title: bookInfo.title,
                foundIsbn: bookInfo.isbn,
                productUrl,
                coverUrl: bookInfo.coverUrl,
                savedPath,
                success: !!savedPath
            };

            this.results.push(result);
            return result;

        } catch (error) {
            console.error(`❌ Failed to scrape ISBN ${isbn}:`, error.message);
            this.errors.push({ isbn, error: error.message });
            return null;
        }
    }

    async scrapeSeries(seriesName, maxBooks = 20) {
        try {
            // Step 1: Search for all books in the series
            const productUrls = await this.searchSeries(seriesName, maxBooks);
            if (productUrls.length === 0) {
                console.log(`❌ No books found in series "${seriesName}"`);
                return [];
            }

            const seriesResults = [];

            // Step 2: Process each book in the series
            for (let i = 0; i < productUrls.length; i++) {
                const productUrl = productUrls[i];
                console.log(`\n[${i + 1}/${productUrls.length}] Processing book from series "${seriesName}"`);

                try {
                    const bookInfo = await this.getBookInfo(productUrl);
                    if (bookInfo && bookInfo.coverUrl) {
                        const filename = bookInfo.isbn ? `${bookInfo.isbn}.jpg` : `series_${i + 1}.jpg`;
                        const savedPath = await this.downloadImage(bookInfo.coverUrl, filename);

                        const result = {
                            series: seriesName,
                            index: i + 1,
                            title: bookInfo.title,
                            isbn: bookInfo.isbn,
                            productUrl,
                            coverUrl: bookInfo.coverUrl,
                            savedPath,
                            success: !!savedPath
                        };

                        seriesResults.push(result);
                        this.results.push(result);

                        console.log(`✅ Success: ${bookInfo.title}`);
                    } else {
                        console.log(`❌ No cover found for book ${i + 1}`);
                        this.errors.push({ series: seriesName, index: i + 1, error: 'No cover image found' });
                    }
                } catch (error) {
                    console.error(`❌ Failed to process book ${i + 1}:`, error.message);
                    this.errors.push({ series: seriesName, index: i + 1, error: error.message });
                }

                // Respectful delay between requests
                if (i < productUrls.length - 1) {
                    console.log(`⏳ Waiting 3 seconds before next book...`);
                    await this.delay(3000);
                }
            }

            return seriesResults;

        } catch (error) {
            console.error(`❌ Failed to scrape series "${seriesName}":`, error.message);
            return [];
        }
    }

    async scrapeMultipleIsbns(isbns) {
        console.log(`🚀 Starting to scrape ${isbns.length} individual ISBNs from Bol.com\n`);

        for (let i = 0; i < isbns.length; i++) {
            const isbn = isbns[i];
            console.log(`\n[${i + 1}/${isbns.length}] Processing ISBN: ${isbn}`);

            await this.scrapeBook(isbn);

            // Progress indicator
            if (i < isbns.length - 1) {
                console.log(`⏳ Waiting 2 seconds before next request...`);
                await this.delay(2000);
            }
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalProcessed: this.results.length + this.errors.length,
                successful: this.results.length,
                failed: this.errors.length,
                successRate: this.results.length / (this.results.length + this.errors.length) * 100
            },
            results: this.results,
            errors: this.errors
        };

        return report;
    }

    saveReport(filename = 'scrape-report.json') {
        const report = this.generateReport();
        const reportPath = path.join(__dirname, filename);

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Report saved to: ${reportPath}`);

        return reportPath;
    }

    printSummary() {
        const report = this.generateReport();

        console.log('\n🎉 Scraping Complete!');
        console.log('📊 Summary:');
        console.log(`   - Total processed: ${report.summary.totalProcessed}`);
        console.log(`   - Successful: ${report.summary.successful}`);
        console.log(`   - Failed: ${report.summary.failed}`);
        console.log(`   - Success rate: ${report.summary.successRate.toFixed(1)}%`);

        if (report.results.length > 0) {
            console.log('\n✅ Successful downloads:');
            report.results.forEach(result => {
                const identifier = result.isbn || result.series || result.title;
                console.log(`   - ${identifier}: ${path.relative(__dirname, result.savedPath)}`);
            });
        }

        if (report.errors.length > 0) {
            console.log('\n❌ Errors:');
            report.errors.forEach(error => {
                const identifier = error.isbn || `${error.series} #${error.index}`;
                console.log(`   - ${identifier}: ${error.error}`);
            });
        }
    }
}

// Main execution
async function main() {
    const scraper = new BolSeriesScraper();

    // Create covers directory if it doesn't exist
    const coversDir = path.join(__dirname, 'covers');
    if (!fs.existsSync(coversDir)) {
        fs.mkdirSync(coversDir);
    }

    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  Individual ISBNs: node bol-series-scraper.js isbn1 isbn2 isbn3');
        console.log('  From file: node bol-series-scraper.js --file isbns.txt');
        console.log('  Series: node bol-series-scraper.js --series "Sam & Julia / Het Muizenhuis"');
        return;
    }

    try {
        if (args[0] === '--file' && args[1]) {
            // Read ISBNs from file
            const filename = args[1];
            if (!fs.existsSync(filename)) {
                console.error(`❌ File not found: ${filename}`);
                return;
            }

            const fileContent = fs.readFileSync(filename, 'utf8');
            const isbns = fileContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
            await scraper.scrapeMultipleIsbns(isbns);

        } else if (args[0] === '--series' && args[1]) {
            // Scrape entire series
            const seriesName = args.slice(1).join(' ');
            await scraper.scrapeSeries(seriesName);

        } else {
            // Individual ISBNs
            await scraper.scrapeMultipleIsbns(args);
        }

        // Generate and save report
        scraper.saveReport();
        scraper.printSummary();

    } catch (error) {
        console.error('❌ Fatal error:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BolSeriesScraper;