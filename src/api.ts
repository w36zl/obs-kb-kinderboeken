import { XMLParser } from "fast-xml-parser";
import { KBBookMetadata } from "./types";
import { Notice, requestUrl } from "obsidian";

const KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
const KB_COLLECTION = "GGC";

export class KBApiClient {
  private parser: XMLParser;
  private prioritizeChildrensBooks: boolean = false;
  private useFuzzySearch: boolean = true;
  private searchCache: Map<string, { results: KBBookMetadata[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(prioritizeChildrensBooks: boolean = false, useFuzzySearch: boolean = true) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true,
    });
    this.prioritizeChildrensBooks = prioritizeChildrensBooks;
    this.useFuzzySearch = useFuzzySearch;
  }

  /**
   * Update children's book search preference
   */
  setPrioritizeChildrensBooks(enabled: boolean): void {
    this.prioritizeChildrensBooks = enabled;
  }

  /**
   * Update fuzzy search preference
   */
  setUseFuzzySearch(enabled: boolean): void {
    this.useFuzzySearch = enabled;
  }

  /**
   * Search for books by title or author with improved query construction
   */
  async searchBooks(query: string, maxResults = 10): Promise<KBBookMetadata[]> {
    try {
      // Check cache first
      const cacheKey = `${query}:${maxResults}:${this.prioritizeChildrensBooks}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        console.log("[KB Plugin] Returning cached results for:", query);
        return cached.results;
      }

      console.log("[KB Plugin] Searching for:", query, this.prioritizeChildrensBooks ? "(prioritizing children's books)" : "");

      // Improved query construction
      let searchQuery = this.buildSearchQuery(query);

      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=${maxResults}&x-fields=ISBN`;

      const results = await this.performSearch(url);

      // If prioritizing children's books and we got few results, also try a general search
      if (this.prioritizeChildrensBooks && results.length < 3) {
        console.log("[KB Plugin] Few children's book results, also trying general search...");
        const generalQuery = this.buildSearchQuery(query, false);
        const generalUrl = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(generalQuery)}&maximumRecords=${maxResults - results.length}&x-fields=ISBN`;
        const generalResults = await this.performSearch(generalUrl);

        // Filter out duplicates and add general results
        const existingISBNs = new Set(results.map(r => r.isbn));
        const additionalResults = generalResults.filter(r => !existingISBNs.has(r.isbn));

        results.push(...additionalResults.slice(0, maxResults - results.length));
      }

      // Cache the results
      this.searchCache.set(cacheKey, { results, timestamp: Date.now() });

      return results;
    } catch (error) {
      console.error("[KB Plugin] Search error:", error);
      new Notice("Search failed. Please check your internet connection.");
      return [];
    }
  }

  /**
   * Build intelligent search query with proper operators
   */
  private buildSearchQuery(query: string, useChildrensFilter: boolean = this.prioritizeChildrensBooks): string {
    const trimmedQuery = query.trim();

    // Detect if query looks like an author name 
    // ONLY match "Lastname, Firstname" format (explicit author format)
    // Everything else uses GENERAL search for maximum compatibility
    // This avoids false positives like "Harry Potter" being treated as an author
    const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z]/.test(trimmedQuery); // "Lastname, Firstname" format only

    // Detect if query is a series search (contains quotes or common series indicators)
    const isLikelySeries = trimmedQuery.includes('"') || 
                           /\b(serie|reeks|verzameling)\b/i.test(trimmedQuery);

    let baseQuery: string;

    if (isLikelyAuthor) {
      // Search specifically in creator field for better author matching
      if (this.useFuzzySearch) {
        baseQuery = `dc.creator="${trimmedQuery}" OR dc.creator all "${trimmedQuery}"`;
      } else {
        baseQuery = `dc.creator="${trimmedQuery}"`;
      }
    } else if (isLikelySeries) {
      // Extract the series name by removing series keywords
      const seriesName = trimmedQuery.replace(/\b(serie|reeks|verzameling)\b/gi, '').replace(/"/g, '').trim();
      
      // Search for books with the series name in title OR relation field
      // This finds books like "Kikker is verliefd" when searching "kikker serie"
      baseQuery = `dc.title all "${seriesName}" OR dc.relation all "${seriesName}"`;
    } else {
      // Check if query looks like abbreviated/partial keywords (no exact phrases)
      // Example: "vier wind ros park" → expand to search for each part
      const expandedQuery = this.expandPartialQuery(trimmedQuery);
      
      if (expandedQuery !== trimmedQuery) {
        // Query was expanded, use the expanded version
        baseQuery = expandedQuery;
      } else {
        // General search - search broadly across all fields (title, creator, etc.)
        // Always use simple quoted query for best results (searches everywhere in KB)
        // This is what worked best in v1.4.1 and earlier
        baseQuery = `"${trimmedQuery}"`;
      }
    }

    // Add children's book filter if enabled
    if (useChildrensFilter) {
      // Prioritize youth literature but be more flexible
      return `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }

    return baseQuery;
  }

  /**
   * Expand partial/abbreviated queries into multiple search terms
   * Example: "vier wind ros park" → searches for "vier windstreken" AND "rosa parks"
   */
  private expandPartialQuery(query: string): string {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // If only 1 word, don't expand
    if (words.length <= 1) {
      return query;
    }

    // Detect common Dutch publisher abbreviations and expand them
    const publisherExpansions: Record<string, string> = {
      'vier wind': 'vier windstreken',
      'wind': 'windstreken',
      'fontein': 'fontein',
      'lemnis': 'lemniscaat',
      'gottmer': 'gottmer',
      'querido': 'querido',
      'ploegsma': 'ploegsma',
    };

    // Detect potential name abbreviations
    const nameExpansions: Record<string, string> = {
      'ros park': 'rosa parks',
      'rosa park': 'rosa parks',
      'mari curie': 'marie curie',
      'ann frank': 'anne frank',
      'mal yousaf': 'malala yousafzai',
    };

    // Try to find publisher + name patterns
    const queryLower = query.toLowerCase();
    
    // Check for publisher abbreviations
    let publisherTerm = '';
    for (const [abbrev, full] of Object.entries(publisherExpansions)) {
      if (queryLower.includes(abbrev)) {
        publisherTerm = full;
        break;
      }
    }

    // Check for name abbreviations
    let nameTerm = '';
    for (const [abbrev, full] of Object.entries(nameExpansions)) {
      if (queryLower.includes(abbrev)) {
        nameTerm = full;
        break;
      }
    }

    // If we found both publisher and name, create combined query
    if (publisherTerm && nameTerm) {
      console.log(`[KB Plugin] Expanded query: "${query}" → publisher:"${publisherTerm}" + name:"${nameTerm}"`);
      return `dc.publisher all "${publisherTerm}" AND dc.title all "${nameTerm}"`;
    }

    // If only publisher found, search publisher + original remaining words
    if (publisherTerm) {
      const remainingWords = words.filter(w => 
        !publisherTerm.toLowerCase().includes(w) && w.length > 2
      ).join(' ');
      
      if (remainingWords) {
        console.log(`[KB Plugin] Expanded query: "${query}" → publisher:"${publisherTerm}" + keywords:"${remainingWords}"`);
        return `dc.publisher all "${publisherTerm}" AND "${remainingWords}"`;
      }
    }

    // If only name found, search for the expanded name
    if (nameTerm) {
      console.log(`[KB Plugin] Expanded query: "${query}" → name:"${nameTerm}"`);
      return `"${nameTerm}"`;
    }

    // No expansion needed, return original
    return query;
  }

  /**
   * Search for a book by ISBN
   */
  async searchByISBN(isbn: string): Promise<KBBookMetadata | null> {
    try {
      console.log("[KB Plugin] Searching by ISBN:", isbn);
      const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
      if (!cleanISBN) {
        new Notice("Invalid ISBN format");
        return null;
      }

      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=ISBN=${cleanISBN}&maximumRecords=1&x-fields=ISBN`;

      const results = await this.performSearch(url);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("[KB Plugin] ISBN search error:", error);
      new Notice("ISBN search failed. Please try again.");
      return null;
    }
  }

  private async performSearch(url: string): Promise<KBBookMetadata[]> {
    try {
      console.log("[KB Plugin] API URL:", url);

      // Use Obsidian's requestUrl instead of fetch to bypass CORS
      const response = await requestUrl({
        url: url,
        method: "GET",
        headers: {
          "Accept": "application/xml, text/xml, */*",
          "User-Agent": "ObsidianKBPlugin/0.1.3",
        },
        throw: false, // Don't throw on non-200 status
      });

      console.log("[KB Plugin] Response status:", response.status);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = response.text;

      if (!xmlText || xmlText.trim().length === 0) {
        console.error("[KB Plugin] Empty response from API");
        new Notice("Received empty response from KB API");
        return [];
      }

      console.log("[KB Plugin] Response length:", xmlText.length);

      const parsed = this.parser.parse(xmlText);

      if (!parsed) {
        console.error("[KB Plugin] Failed to parse XML");
        return [];
      }

      return this.parseSearchResults(parsed);
    } catch (error) {
      console.error("[KB Plugin] API error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new Notice(`API error: ${errorMessage}`);
      return [];
    }
  }

  private parseSearchResults(data: any): KBBookMetadata[] {
    const records = this.extractRecords(data);
    if (!records || records.length === 0) {
      return [];
    }

    return records.map((record: any) => this.parseRecord(record)).filter((book: KBBookMetadata | null) => book !== null) as KBBookMetadata[];
  }

  private extractRecords(data: any): any[] {
    try {
      const searchRetrieveResponse = data["srw:searchRetrieveResponse"];
      if (!searchRetrieveResponse) return [];

      const records = searchRetrieveResponse["srw:records"]?.["srw:record"];
      if (!records) return [];

      return Array.isArray(records) ? records : [records];
    } catch (error) {
      console.error("Error extracting records:", error);
      return [];
    }
  }

  private parseRecord(record: any): KBBookMetadata | null {
    try {
      const recordData = record["srw:recordData"];
      if (!recordData) {
        console.error("[KB Plugin] No recordData found in record");
        return null;
      }

      // Dublin Core fields are directly under recordData
      const dc = recordData;

      console.log("[KB Plugin] Parsing record with title:", this.extractField(dc, "dc:title"));

      const allIsbns = this.extractAllISBNs(dc);
      const primaryIsbn = allIsbns.length > 0 ? allIsbns[0] : undefined;
      
      // Extract series information from relation field or title
      const series = this.extractSeries(dc);
      
      const metadata: KBBookMetadata = {
        title: this.extractField(dc, "dc:title") || "Unknown Title",
        authors: this.extractMultipleFields(dc, "dc:creator"),
        isbn: primaryIsbn,
        allIsbns: allIsbns,
        publisher: this.extractField(dc, "dc:publisher"),
        publishYear: this.extractYear(dc),
        language: this.extractField(dc, "dc:language"),
        description: this.extractField(dc, "dc:description") || this.extractField(dc, "dcterms:abstract"),
        subjects: this.extractMultipleFields(dc, "dc:subject"),
        series: series,
        identifier: this.extractField(dc, "dc:identifier"),
        coverUrl: undefined, // Cover will be populated by Bol.com enrichment if enabled
      };

      return metadata;
    } catch (error) {
      console.error("[KB Plugin] Error parsing record:", error);
      return null;
    }
  }

  private extractField(dc: any, fieldName: string): string | undefined {
    const field = dc[fieldName];
    if (!field) return undefined;

    if (Array.isArray(field)) {
      return field[0]?.["#text"] || field[0] || undefined;
    }

    return field["#text"] || field || undefined;
  }

  private extractMultipleFields(dc: any, fieldName: string): string[] {
    const field = dc[fieldName];
    if (!field) return [];

    if (Array.isArray(field)) {
      return field.map((f: any) => f["#text"] || f).filter((v: any) => v);
    }

    const value = field["#text"] || field;
    return value ? [value] : [];
  }

  private extractISBN(dc: any): string | undefined {
    const identifiers = this.extractMultipleFields(dc, "dc:identifier");

    // Look for ISBN in identifiers
    for (const id of identifiers) {
      if (typeof id === "string" && id.match(/ISBN|isbn|978|979/)) {
        const cleaned = id.replace(/ISBN:?\s*/i, "").trim();
        return cleaned;
      }
    }

    return undefined;
  }

  /**
   * Extract all ISBNs from the record (for cover fallback)
   */
  private extractAllISBNs(dc: any): string[] {
    const identifiers = this.extractMultipleFields(dc, "dc:identifier");
    const isbns: string[] = [];

    // Look for all ISBNs in identifiers
    for (const id of identifiers) {
      if (typeof id === "string" && id.match(/ISBN|isbn|978|979/)) {
        const cleaned = id.replace(/ISBN:?\s*/i, "").trim();
        if (cleaned && !isbns.includes(cleaned)) {
          isbns.push(cleaned);
        }
      }
    }

    return isbns;
  }

  /**
   * Extract series information from relation field or title
   */
  private extractSeries(dc: any): string | undefined {
    // First try the dc:relation field which often contains series info
    const relations = this.extractMultipleFields(dc, "dc:relation");
    for (const relation of relations) {
      // Series often contain keywords like "serie", "reeks", or pattern with numbers
      if (/serie|reeks|deel|volume/i.test(relation)) {
        return relation.trim();
      }
    }

    // Also check in dc:isPartOf field
    const isPartOf = this.extractField(dc, "dcterms:isPartOf") || this.extractField(dc, "dc:isPartOf");
    if (isPartOf) {
      return isPartOf.trim();
    }

    // Try to extract from title (e.g., "Book Title (Series Name Book 1)")
    const title = this.extractField(dc, "dc:title");
    if (title) {
      const seriesMatch = title.match(/\(([^)]+(?:serie|reeks|deel)[^)]*)\)/i);
      if (seriesMatch) {
        return seriesMatch[1].trim();
      }
    }

    return undefined;
  }

  private extractYear(dc: any): string | undefined {
    const dateField = this.extractField(dc, "dc:date") || this.extractField(dc, "dcterms:issued");
    if (!dateField) return undefined;

    // Extract 4-digit year
    const match = dateField.match(/\d{4}/);
    return match ? match[0] : undefined;
  }

  /**
   * Download a cover image from a URL
   */
  async downloadCover(url: string): Promise<ArrayBuffer | null> {
    try {
      console.log("[KB Plugin] Downloading cover from:", url);

      // Use Obsidian's requestUrl for cover downloads too
      const response = await requestUrl({
        url: url,
        method: "GET",
        throw: false,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.arrayBuffer;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      return null;
    }
  }

  /**
   * Get cover URL from Google Books API
   */
  async getGoogleBooksCover(isbn: string): Promise<string | null> {
    try {
      console.log("[KB Plugin] Checking Google Books for ISBN:", isbn);
      
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
      const response = await requestUrl({
        url: url,
        method: "GET",
        throw: false,
      });

      if (response.status !== 200) {
        return null;
      }

      const data = response.json;
      
      if (data.totalItems > 0 && data.items[0].volumeInfo.imageLinks) {
        const imageLinks = data.items[0].volumeInfo.imageLinks;
        // Prefer larger images
        const coverUrl = imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail;
        
        if (coverUrl) {
          // Convert to https and larger size
          const httpsUrl = coverUrl.replace('http:', 'https:');
          console.log("[KB Plugin] Found Google Books cover:", httpsUrl);
          return httpsUrl;
        }
      }

      return null;
    } catch (error) {
      console.error("[KB Plugin] Error fetching Google Books cover:", error);
      return null;
    }
  }

  /**
   * Get cover URL from Amazon (simple image URL approach)
   * Note: For full PA-API, credentials would be required
   */
  getAmazonCoverUrl(isbn: string, region: string = "nl"): string {
    // Amazon's image server URL pattern (works without API key for basic access)
    // This is a simplified approach - full PA-API requires authentication
    const cleanIsbn = isbn.replace(/-/g, "");

    // Amazon image server URLs by region
    const imageServers: { [key: string]: string } = {
      "nl": "m.media-amazon.com", // Netherlands
      "de": "m.media-amazon.com", // Germany
      "uk": "m.media-amazon.com", // UK
      "us": "m.media-amazon.com", // US
      "fr": "m.media-amazon.com", // France
    };

    const server = imageServers[region] || imageServers["nl"];

    // Amazon image URL format
    return `https://${server}/images/P/${cleanIsbn}.jpg`;
  }

  /**
   * Enrich metadata from Bol.com (if available)
   * Fetches additional metadata like series, better descriptions, etc.
   */
  async enrichFromBol(metadata: KBBookMetadata): Promise<KBBookMetadata> {
    if (!metadata.isbn) {
      return metadata;
    }

    try {
      const bolMetadata = await this.getBolMetadata(metadata.isbn);
      if (bolMetadata) {
        // Enrich with Bol.com data (prefer existing KB data)
        return {
          ...metadata,
          series: metadata.series || bolMetadata.series,
          description: metadata.description || bolMetadata.description,
          pageCount: metadata.pageCount || bolMetadata.pageCount,
          coverUrl: bolMetadata.coverUrl || metadata.coverUrl,
        };
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching from Bol.com:", error);
    }

    return metadata;
  }

  /**
   * Get metadata from Bol.com product page
   */
  async getBolMetadata(isbn: string): Promise<Partial<KBBookMetadata> | null> {
    try {
      console.log("[KB Plugin] Fetching Bol.com metadata for ISBN:", isbn);

      const searchParams = new URLSearchParams({
        searchtext: isbn
      });

      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await requestUrl({
        url: searchUrl,
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
        },
        throw: false,
      });

      if (response.status !== 200) {
        return null;
      }

      // Extract product URL from search results
      const productUrlMatch = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
      if (!productUrlMatch) {
        return null;
      }

      const productUrl = `https://www.bol.com${productUrlMatch[1]}`;
      console.log("[KB Plugin] Found Bol.com product URL:", productUrl);

      // Fetch the product page
      const productResponse = await requestUrl({
        url: productUrl,
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        throw: false,
      });

      if (productResponse.status !== 200) {
        return null;
      }

      const html = productResponse.text;

      // Extract cover URL
      const imageMatches = html.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
      const coverUrl = imageMatches?.find(url => url.includes('550x550')) || imageMatches?.[0];

      // Extract series information
      let series: string | undefined;
      const seriesMatch = html.match(/Serie:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i) ||
                          html.match(/Boekenreeks:\s*<\/dt>\s*<dd[^>]*>([^<]+)</i) ||
                          html.match(/"bookSeries":"([^"]+)"/);
      if (seriesMatch) {
        series = seriesMatch[1].trim();
      }

      // Extract page count
      let pageCount: string | undefined;
      const pageMatch = html.match(/(\d+)\s*pagina's?/i) || 
                        html.match(/Aantal pagina's:\s*<\/dt>\s*<dd[^>]*>(\d+)</i);
      if (pageMatch) {
        pageCount = pageMatch[1];
      }

      // Extract description
      let description: string | undefined;
      const descMatch = html.match(/<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([^<]+)</i) ||
                        html.match(/"description":"([^"]+)"/);
      if (descMatch) {
        description = descMatch[1].trim().replace(/\\n/g, ' ').substring(0, 500);
      }

      return {
        coverUrl,
        series,
        pageCount,
        description,
      };
    } catch (error) {
      console.error("[KB Plugin] Error fetching Bol.com metadata:", error);
      return null;
    }
  }

  /**
   * Get cover URL from Bol.com (Dutch bookstore)
   * Scrapes the product page to find the cover image URL
   */
  async getBolCoverUrl(isbn: string): Promise<string | null> {
    try {
      console.log("[KB Plugin] Checking Bol.com for ISBN:", isbn);

      const searchParams = new URLSearchParams({
        searchtext: isbn
      });

      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await requestUrl({
        url: searchUrl,
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        throw: false,
      });

      if (response.status !== 200) {
        return null;
      }

      // Extract product URL from search results - look for /p/ pattern
      const productUrlMatch = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
      if (!productUrlMatch) {
        return null;
      }

      const productUrl = `https://www.bol.com${productUrlMatch[1]}`;
      console.log("[KB Plugin] Found Bol.com product URL:", productUrl);

      // Fetch the product page
      const productResponse = await requestUrl({
        url: productUrl,
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        throw: false,
      });

      if (productResponse.status !== 200) {
        return null;
      }

      // Look for the cover image URL - Bol.com uses media.s-bol.com for images
      // Extract all image URLs and find the best one
      const imageMatches = productResponse.text.match(/https:\/\/media\.s-bol\.com\/[^"]*\.jpg[^"]*/g);
      if (imageMatches && imageMatches.length > 0) {
        // Prefer images that contain '550x550' (high quality covers)
        const highQualityMatch = imageMatches.find(url => url.includes('550x550'));
        const coverUrl = highQualityMatch || imageMatches[0];
        console.log("[KB Plugin] Found Bol.com cover:", coverUrl);
        return coverUrl;
      }

      return null;
    } catch (error) {
      console.error("[KB Plugin] Error fetching Bol.com cover:", error);
      return null;
    }
  }

  /**
   * Search for books in a series on Bol.com
   * Returns ISBNs of books found in the series
   */
  async searchBolSeries(seriesName: string, maxBooks: number = 20): Promise<string[]> {
    try {
      console.log("[KB Plugin] Searching Bol.com for series:", seriesName);

      const searchParams = new URLSearchParams({
        searchtext: `"${seriesName}"`
      });

      const searchUrl = `https://www.bol.com/nl/nl/s/?${searchParams}`;
      const response = await requestUrl({
        url: searchUrl,
        method: "GET",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl,en-US;q=0.7,en;q=0.3',
        },
        throw: false,
      });

      if (response.status !== 200) {
        return [];
      }

      // Extract all product URLs from search results
      const productUrls: string[] = [];
      const urlMatches = response.text.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/g);

      if (urlMatches) {
        const uniqueUrls = new Set<string>();
        for (const match of urlMatches) {
          const urlMatch = match.match(/href="([^"]*\/p\/[^"]*\/[^"]*)"/);
          if (urlMatch) {
            const url = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.bol.com${urlMatch[1]}`;
            uniqueUrls.add(url);
          }
        }
        productUrls.push(...Array.from(uniqueUrls).slice(0, maxBooks));
      }

      console.log(`[KB Plugin] Found ${productUrls.length} products for series "${seriesName}"`);

      // Extract ISBNs from each product page
      const isbns: string[] = [];
      for (const productUrl of productUrls) {
        try {
          const productResponse = await requestUrl({
            url: productUrl,
            method: "GET",
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            throw: false,
          });

          if (productResponse.status === 200) {
            const isbnMatch = productResponse.text.match(/978\d{10}/);
            if (isbnMatch && !isbns.includes(isbnMatch[0])) {
              isbns.push(isbnMatch[0]);
              console.log(`[KB Plugin] Found ISBN: ${isbnMatch[0]}`);
            }
          }

          // Be respectful with requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[KB Plugin] Error fetching product ${productUrl}:`, error);
        }
      }

      console.log(`[KB Plugin] Extracted ${isbns.length} ISBNs from series "${seriesName}"`);
      return isbns;
    } catch (error) {
      console.error("[KB Plugin] Error searching Bol.com series:", error);
      return [];
    }
  }

  /**
   * Detect and improve cover quality by checking image size
   */
  async detectCoverQuality(url: string): Promise<number> {
    try {
      const response = await requestUrl({
        url: url,
        method: "HEAD",
        throw: false,
      });

      if (response.status === 200) {
        const contentLength = response.headers['content-length'];
        if (contentLength) {
          const sizeKB = parseInt(contentLength) / 1024;
          console.log(`[KB Plugin] Cover size: ${sizeKB.toFixed(2)} KB`);
          
          // Higher quality covers are typically > 50KB
          // Bol.com 550x550 covers are usually 80-150KB
          // Google Books large covers are usually 60-120KB
          // Open Library large covers vary 20-80KB
          if (sizeKB > 80) return 5; // Excellent quality
          if (sizeKB > 50) return 4; // Good quality
          if (sizeKB > 20) return 3; // Medium quality
          if (sizeKB > 5) return 2; // Low quality
          return 1; // Very low quality (likely placeholder)
        }
      }
      return 0; // Unable to determine
    } catch (error) {
      console.error("[KB Plugin] Error detecting cover quality:", error);
      return 0;
    }
  }
}

