const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Test script to scrape book covers from Bol.com
 * Usage: node test-bol-scraper.js [isbn1] [isbn2] ...
 */

class BolScraper {
    constructor() {
        this.baseUrl = 'https://www.bol.com';
        this.searchUrl = `${this.baseUrl}/nl/nl/s/`;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
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

    async getCoverImage(productUrl) {
        try {
            console.log(`🖼️  Fetching cover from: ${productUrl}`);

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

            // Extract cover image URL (look for media.s-bol.com URLs)
            const imageMatches = response.data.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);

            if (!imageMatches || imageMatches.length === 0) {
                console.log(`❌ No cover image found on product page`);
                return null;
            }

            // Get the largest image (usually the first one is the main cover)
            const coverUrl = imageMatches[0];
            console.log(`✅ Found cover: ${coverUrl}`);
            return coverUrl;

        } catch (error) {
            console.error(`❌ Failed to fetch cover from ${productUrl}:`, error.message);
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
                    console.log(`✅ Saved: ${outputPath}`);
                    resolve(outputPath);
                });
                writer.on('error', reject);
            });

        } catch (error) {
            console.error(`❌ Failed to download ${filename}:`, error.message);
            return null;
        }
    }

    async scrapeBookCover(isbn) {
        try {
            // Create covers directory if it doesn't exist
            const coversDir = path.join(__dirname, 'covers');
            if (!fs.existsSync(coversDir)) {
                fs.mkdirSync(coversDir);
            }

            // Step 1: Search for the book
            const productUrl = await this.searchBook(isbn);
            if (!productUrl) {
                return null;
            }

            // Step 2: Get cover image URL
            const coverUrl = await this.getCoverImage(productUrl);
            if (!coverUrl) {
                return null;
            }

            // Step 3: Download the image
            const filename = `${isbn.replace(/[^0-9]/g, '')}.jpg`;
            const savedPath = await this.downloadImage(coverUrl, filename);

            // Add delay to be respectful
            await this.delay(2000);

            return {
                isbn,
                productUrl,
                coverUrl,
                savedPath
            };

        } catch (error) {
            console.error(`❌ Failed to scrape ISBN ${isbn}:`, error.message);
            return null;
        }
    }

    async scrapeMultipleBooks(isbns) {
        const results = [];

        console.log(`🚀 Starting to scrape ${isbns.length} books from Bol.com\n`);

        for (let i = 0; i < isbns.length; i++) {
            const isbn = isbns[i];
            console.log(`\n[${i + 1}/${isbns.length}] Processing ISBN: ${isbn}`);

            const result = await this.scrapeBookCover(isbn);
            if (result) {
                results.push(result);
                console.log(`✅ Success: ${isbn}`);
            } else {
                console.log(`❌ Failed: ${isbn}`);
            }

            // Progress indicator
            if (i < isbns.length - 1) {
                console.log(`⏳ Waiting 2 seconds before next request...`);
                await this.delay(2000);
            }
        }

        console.log(`\n🎉 Scraping complete!`);
        console.log(`📊 Results: ${results.length}/${isbns.length} successful`);

        return results;
    }
}

// Test with some sample ISBNs
async function main() {
    const scraper = new BolScraper();

    // Test ISBNs from our previous investigation
    const testIsbns = [
        '9789025779412', // Het grote feest - we know this works
        '9789047701234', // Test with another ISBN
        '9789025861234'  // Another test
    ];

    // Allow command line arguments
    const isbns = process.argv.slice(2).length > 0 ? process.argv.slice(2) : testIsbns;

    const results = await scraper.scrapeMultipleBooks(isbns);

    // Print summary
    console.log('\n📋 Summary:');
    results.forEach(result => {
        console.log(`- ${result.isbn}: ✅ Saved to ${path.relative(__dirname, result.savedPath)}`);
    });

    if (results.length === 0) {
        console.log('❌ No covers were successfully scraped');
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BolScraper;