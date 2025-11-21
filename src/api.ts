import { XMLParser } from "fast-xml-parser";
import { KBBookMetadata, KBLinkedDataResource } from "./types";
import { Notice, requestUrl } from "obsidian";
import { vocabulary, VocabularyMatch } from "./vocab";
import { WikidataApiClient } from "./services/WikidataApiClient";

interface SearchQueryPayload {
  query: string;
  sortKeys?: string;
}

interface QueryAnalysis {
  normalized: string;
  raw: string;
  rawTokens: string[];
  tokens: string[];
  creators: VocabularyMatch[];
  publishers: VocabularyMatch[];
  series: VocabularyMatch[];
  subjects: VocabularyMatch[];
}

const KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
const KB_COLLECTION = "GGC";

export class KBApiClient {
  private parser: XMLParser;
  private prioritizeChildrensBooks: boolean = false;
  private useFuzzySearch: boolean = true;
  private searchCache: Map<string, { results: KBBookMetadata[], timestamp: number }> = new Map();
  private expansionCache: Map<string, string[]> = new Map();
  private linkedDataCache: Map<string, KBBookMetadata["linkedData"]> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private enableLinkedDataEnrichment: boolean = true;
  private enableWikidataEnrichment: boolean = true;
  private wikidataClient: WikidataApiClient;

  constructor(
    prioritizeChildrensBooks: boolean = false,
    useFuzzySearch: boolean = true,
    enableLinkedDataEnrichment: boolean = true,
    enableWikidataEnrichment: boolean = true
  ) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true,
    });
    this.prioritizeChildrensBooks = prioritizeChildrensBooks;
    this.useFuzzySearch = useFuzzySearch;
    this.enableLinkedDataEnrichment = enableLinkedDataEnrichment;
    this.enableWikidataEnrichment = enableWikidataEnrichment;
    this.wikidataClient = new WikidataApiClient();
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
   * Toggle linked data enrichment
   */
  setLinkedDataEnrichment(enabled: boolean): void {
    this.enableLinkedDataEnrichment = enabled;
  }

  /**
   * Search for books by title or author with improved query construction
   */
  async searchBooks(query: string, maxResults = 10, startRecord = 1): Promise<KBBookMetadata[]> {
    try {
      // Check cache first (only for offset 1)
      const cacheKey = `${query}:${maxResults}:${startRecord}:${this.prioritizeChildrensBooks}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        console.log("[KB Plugin] Returning cached results for:", query);
        return cached.results;
      }

      console.log("[KB Plugin] Searching for:", query, `(records ${startRecord}-${startRecord + maxResults - 1})`, this.prioritizeChildrensBooks ? "(prioritizing children's books)" : "");

      // Improved query construction
      const searchPayload = this.buildSearchQuery(query);

      const encodedQuery = encodeURIComponent(searchPayload.query);
      const sortSegment = searchPayload.sortKeys ? `&sortKeys=${encodeURIComponent(searchPayload.sortKeys)}` : "";
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&startRecord=${startRecord}&maximumRecords=${maxResults}&x-fields=ISBN${sortSegment}`;

      const results = await this.performSearch(url);

      // If prioritizing children's books and we got few results, also try a general search
      if (this.prioritizeChildrensBooks && results.length < 3) {
        console.log("[KB Plugin] Few children's book results, also trying general search...");
        const generalPayload = this.buildSearchQuery(query, false);
        const generalSortSegment = generalPayload.sortKeys ? `&sortKeys=${encodeURIComponent(generalPayload.sortKeys)}` : "";
        const generalUrl = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodeURIComponent(generalPayload.query)}&maximumRecords=${maxResults - results.length}&x-fields=ISBN${generalSortSegment}`;
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
  private buildSearchQuery(query: string, useChildrensFilter: boolean = this.prioritizeChildrensBooks): SearchQueryPayload {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { query: '""' };
    }

    // If the query already looks like CQL (contains field operators), pass it through
    if (this.isCqlQuery(trimmedQuery)) {
      console.log("[KB Plugin] Detected CQL query, using as-is:", trimmedQuery);
      return { query: trimmedQuery };
    }

    const analysis = this.analyzeQuery(trimmedQuery);
    const structuredClauses: string[] = [];

    const fieldClauses = this.extractFieldClauses(trimmedQuery);
    structuredClauses.push(...fieldClauses.clauses);
    let sortKeys = fieldClauses.sortKeys;

    if (!fieldClauses.handledIsbn) {
      const isbnClause = this.detectIsbnClause(trimmedQuery);
      if (isbnClause) {
        structuredClauses.push(isbnClause);
      }
    }

    if (analysis.creators.length > 0) {
      analysis.creators.forEach((match) => {
        structuredClauses.push(`dc.creator all "${this.escapeCql(match.canonical)}"`);
      });
    } else {
      const explicitAuthorClause = this.detectExplicitAuthorClause(trimmedQuery);
      if (explicitAuthorClause) {
        structuredClauses.push(explicitAuthorClause);
      }
    }

    if (analysis.subjects.length > 0) {
      analysis.subjects.forEach((match) => {
        structuredClauses.push(`dc.subject all "${this.escapeCql(match.canonical)}"`);
      });
    }

    structuredClauses.push(...this.detectSeriesClauses(trimmedQuery, analysis));
    structuredClauses.push(...this.expandPartialQuery(trimmedQuery, analysis));
    structuredClauses.push(...this.buildCombinedClauses(trimmedQuery, analysis));

    // Always keep a broad fallback query to avoid over-filtering
    structuredClauses.push(`cql.serverChoice all "${this.escapeCql(trimmedQuery)}"`);

    const uniqueClauses = this.dedupeClauses(structuredClauses);
    let baseQuery = uniqueClauses.length === 1
      ? uniqueClauses[0]
      : uniqueClauses.map((clause) => `(${clause})`).join(" OR ");

    if (!sortKeys) {
      const yearMatch = trimmedQuery.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        sortKeys = "year,,1";
      }
    }

    if (useChildrensFilter) {
      baseQuery = `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }

    return { query: baseQuery, sortKeys };
  }

  private analyzeQuery(rawQuery: string): QueryAnalysis {
    const rawTokens = rawQuery.split(/\s+/).filter((token) => token.length > 0);
    const normalized = rawQuery.toLowerCase();
    const tokens = normalized.split(/\s+/).filter((token) => token.length > 0);

    return {
      normalized,
      raw: rawQuery,
      rawTokens,
      tokens,
      creators: vocabulary.matchCreators(normalized),
      publishers: vocabulary.matchPublishers(normalized),
      series: vocabulary.matchSeries(normalized),
      subjects: vocabulary.matchSubjects(normalized),
    };
  }

  private extractFieldClauses(query: string): { clauses: string[]; remainder: string; sortKeys?: string; handledIsbn: boolean } {
    const clauses: string[] = [];
    let remainder = query;
    let sortKeys: string | undefined;
    let handledIsbn = false;

    const regex = /(author|creator|titel|title|subject|onderwerp|publisher|uitgever|serie|series|reeks|isbn|ppn|sort):("[^"]+"|\S+)/gi;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(query)) !== null) {
      const field = match[1].toLowerCase();
      const value = this.stripQuotes(match[2]);
      const escapedValue = this.escapeCql(value);
      remainder = remainder.replace(match[0], " ");

      switch (field) {
        case "author":
        case "creator":
          clauses.push(`dc.creator all "${escapedValue}"`);
          break;
        case "titel":
        case "title":
          clauses.push(`dc.title all "${escapedValue}"`);
          break;
        case "subject":
        case "onderwerp":
          clauses.push(`dc.subject all "${escapedValue}"`);
          break;
        case "publisher":
        case "uitgever":
          clauses.push(`dc.publisher all "${escapedValue}"`);
          break;
        case "serie":
        case "series":
        case "reeks":
          clauses.push(`dc.title all "${escapedValue}" OR dc.relation all "${escapedValue}"`);
          break;
        case "isbn":
          clauses.push(`(bath.isbn="${escapedValue}" OR dc.identifier all "${escapedValue}")`);
          handledIsbn = true;
          break;
        case "ppn":
          clauses.push(`dc.identifier all "PPN ${escapedValue}" OR dc.identifier all "${escapedValue}"`);
          break;
        case "sort":
          sortKeys = this.mapSortValue(value);
          break;
      }
    }

    return { clauses, remainder: remainder.replace(/\s+/g, " ").trim(), sortKeys, handledIsbn };
  }

  private detectIsbnClause(query: string): string | undefined {
    const match = query.replace(/[^0-9Xx]/g, " ").match(/(97[89]\d{10}|\b\d{9}[\dXx]\b)/);
    if (!match) {
      return undefined;
    }

    const isbn = match[0].toUpperCase();
    return `(bath.isbn="${isbn}" OR dc.identifier all "${isbn}")`;
  }

  private detectExplicitAuthorClause(query: string): string | undefined {
    const match = query.match(/^([^,]+),\s*(.+)$/);
    if (!match) {
      return undefined;
    }

    const normalizedName = `${match[1].trim()}, ${match[2].trim()}`;
    const escaped = this.escapeCql(normalizedName);
    if (this.useFuzzySearch) {
      return `(dc.creator="${escaped}" OR dc.creator all "${escaped}")`;
    }
    return `dc.creator="${escaped}"`;
  }

  private detectSeriesClauses(query: string, analysis: QueryAnalysis): string[] {
    const clauses: string[] = [];

    analysis.series.forEach((match) => {
      clauses.push(`dc.relation all "${this.escapeCql(match.canonical)}"`);
    });

    if (/\b(serie|reeks|verzameling)\b/i.test(query)) {
      const seriesName = query.replace(/\b(serie|reeks|verzameling)\b/gi, " ").replace(/"/g, " ").trim();
      if (seriesName) {
        clauses.push(`dc.title all "${this.escapeCql(seriesName)}" OR dc.relation all "${this.escapeCql(seriesName)}"`);
      }
    }

    return clauses;
  }

  private expandPartialQuery(query: string, analysis: QueryAnalysis): string[] {
    if (!this.useFuzzySearch) {
      return [];
    }

    const cacheKey = analysis.normalized;
    if (this.expansionCache.has(cacheKey)) {
      return this.expansionCache.get(cacheKey)!;
    }

    const clauses: string[] = [];
    const matches = [...analysis.publishers, ...analysis.creators, ...analysis.series];
    if (matches.length === 0) {
      this.expansionCache.set(cacheKey, clauses);
      return clauses;
    }

    const cleaned = this.removeAliasesFromQuery(analysis.normalized, matches);
    const keywords = cleaned.split(/\s+/).filter((token) => token.length > 2 && !vocabulary.isStopWord(token));
    const keywordPhrase = keywords.join(" ").trim();

    if (analysis.publishers.length > 0 && analysis.creators.length > 0) {
      analysis.publishers.forEach((publisher) => {
        analysis.creators.forEach((creator) => {
          clauses.push(`(dc.publisher all "${this.escapeCql(publisher.canonical)}" AND dc.creator all "${this.escapeCql(creator.canonical)}")`);
        });
      });
    }

    if (analysis.publishers.length > 0 && keywordPhrase) {
      analysis.publishers.forEach((publisher) => {
        clauses.push(`(dc.publisher all "${this.escapeCql(publisher.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }

    if (analysis.creators.length > 0 && keywordPhrase) {
      analysis.creators.forEach((creator) => {
        clauses.push(`(dc.creator all "${this.escapeCql(creator.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }

    if (analysis.series.length > 0 && keywordPhrase) {
      analysis.series.forEach((series) => {
        clauses.push(`(dc.relation all "${this.escapeCql(series.canonical)}" AND dc.title all "${this.escapeCql(keywordPhrase)}")`);
      });
    }

    this.expansionCache.set(cacheKey, clauses);
    return clauses;
  }

  private buildCombinedClauses(query: string, analysis: QueryAnalysis): string[] {
    const clauses: string[] = [];
    const lowered = query.toLowerCase();
    const byMatch = lowered.match(/(.+?)\s+(door|by)\s+(.+)/i);
    if (byMatch) {
      const titlePart = byMatch[1].trim();
      const authorPart = byMatch[3].trim();
      clauses.push(`(dc.title all "${this.escapeCql(titlePart)}" AND dc.creator all "${this.escapeCql(authorPart)}")`);
    }

    const dashMatch = query.match(/(.+?)\s*[–-]\s*(.+)/);
    if (dashMatch) {
      const first = dashMatch[1].trim();
      const second = dashMatch[2].trim();
      clauses.push(`(dc.title all "${this.escapeCql(first)}" AND cql.serverChoice all "${this.escapeCql(second)}")`);
    }

    if (analysis.creators.length > 0) {
      const cleaned = this.removeAliasesFromOriginal(query, analysis.creators).replace(/[,:;]+/g, " ").trim();
      if (cleaned && cleaned !== query) {
        analysis.creators.forEach((creator) => {
          clauses.push(`(dc.title all "${this.escapeCql(cleaned)}" AND dc.creator all "${this.escapeCql(creator.canonical)}")`);
        });
      }
    }

    return clauses;
  }

  private removeAliasesFromQuery(query: string, matches: VocabularyMatch[]): string {
    let cleaned = query;
    matches.forEach((match) => {
      const regex = new RegExp(`\\b${this.escapeRegex(match.alias)}\\b`, "gi");
      cleaned = cleaned.replace(regex, " ");
    });
    return cleaned.replace(/\s+/g, " ").trim();
  }

  private removeAliasesFromOriginal(query: string, matches: VocabularyMatch[]): string {
    let cleaned = query;
    matches.forEach((match) => {
      const regex = new RegExp(`\\b${this.escapeRegex(match.alias)}\\b`, "gi");
      cleaned = cleaned.replace(regex, " ");
    });
    return cleaned.replace(/\s+/g, " ").trim();
  }

  private mapSortValue(value: string): string | undefined {
    const normalized = value.toLowerCase();
    if (["recent", "desc", "newest", "latest"].includes(normalized)) {
      return "year,,1";
    }
    if (["oldest", "asc"].includes(normalized)) {
      return "year,,0";
    }
    if (["title", "titel"].includes(normalized)) {
      return "title,,1";
    }
    return undefined;
  }

  private dedupeClauses(clauses: string[]): string[] {
    return Array.from(new Set(clauses.filter((clause) => clause && clause.trim().length > 0)));
  }

  private escapeCql(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  private stripQuotes(value: string): string {
    return value.replace(/^"/, "").replace(/"$/, "");
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Check if a query string is already in CQL format
   */
  private isCqlQuery(query: string): boolean {
    // Look for CQL field operators like dc.subject, dc.creator, bath.isbn, etc.
    return /\b(dc\.|dcterms\.|bath\.|cql\.)\w+\s*(=|all|any|exact)\s*/.test(query);
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

      const books = this.parseSearchResults(parsed);

      if (books.length > 0 && this.enableLinkedDataEnrichment) {
        await this.enrichLinkedData(books);
      }

      if (books.length > 0 && this.enableWikidataEnrichment) {
        await this.enrichWikidataProfiles(books);
      }

      return books;
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
      
      const identifiers = this.extractMultipleFields(dc, "dc:identifier");
      const recordIdentifier = this.extractField(dc, "dcx:recordIdentifier");
      const { ppn, ppnUri } = this.extractPpnDetails(identifiers, recordIdentifier);

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
        identifier: identifiers[0],
        ppn,
        ppnUri,
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

  private extractPpnDetails(identifiers: string[], recordIdentifier?: string): { ppn?: string; ppnUri?: string } {
    // First check dcx:recordIdentifier which commonly contains the PPN
    if (recordIdentifier && typeof recordIdentifier === "string") {
      const ppnMatch = recordIdentifier.match(/PPN[?=]PPN=(\d{8,10})/i);
      if (ppnMatch) {
        const ppn = ppnMatch[1];
        console.log("[KB Plugin] Found PPN in dcx:recordIdentifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }
    }
    
    // Then check dc:identifier fields
    for (const id of identifiers) {
      if (typeof id !== "string") {
        continue;
      }

      const directMatch = id.match(/PPN\s*([0-9]{8,10})/i);
      if (directMatch) {
        const ppn = directMatch[1];
        console.log("[KB Plugin] Found PPN in dc:identifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }

      const uriMatch = id.match(/nbt\/(\d{8,10})/i);
      if (uriMatch) {
        const ppn = uriMatch[1];
        console.log("[KB Plugin] Found PPN URI in dc:identifier:", ppn);
        return { ppn, ppnUri: `https://data.bibliotheken.nl/doc/nbt/${ppn}` };
      }
    }

    console.log("[KB Plugin] No PPN found in identifiers or recordIdentifier");
    return {};
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

  private async enrichLinkedData(records: KBBookMetadata[]): Promise<void> {
    await Promise.all(records.map((record) => this.fetchLinkedData(record)));
  }

  /**
   * Enrich author profiles with Wikidata information
   */
  private async enrichWikidataProfiles(records: KBBookMetadata[]): Promise<void> {
    await Promise.all(records.map((record) => this.fetchWikidataProfiles(record)));
  }

  /**
   * Extract Wikidata ID from a Wikidata URI
   */
  private extractWikidataId(uri: string): string | null {
    // Match patterns like:
    // - http://www.wikidata.org/entity/Q123
    // - https://www.wikidata.org/wiki/Q123
    const match = uri.match(/wikidata\.org\/(entity|wiki)\/(Q\d+)/);
    return match ? match[2] : null;
  }

  /**
   * Fetch Wikidata profiles for all creators in a book record
   */
  private async fetchWikidataProfiles(record: KBBookMetadata): Promise<void> {
    if (!record.linkedData?.creators || record.linkedData.creators.length === 0) {
      return;
    }

    console.log("[KB Plugin] Enriching Wikidata profiles for:", record.title);

    // Process all creators in parallel
    await Promise.all(
      record.linkedData.creators.map(async (creator) => {
        if (!creator.sameAs || creator.sameAs.length === 0) {
          return;
        }

        // Find Wikidata URI in sameAs links
        const wikidataUri = creator.sameAs.find((uri) => uri.includes("wikidata.org"));
        if (!wikidataUri) {
          return;
        }

        const wikidataId = this.extractWikidataId(wikidataUri);
        if (!wikidataId) {
          console.log("[KB Plugin] Could not extract Wikidata ID from:", wikidataUri);
          return;
        }

        try {
          console.log("[KB Plugin] Fetching Wikidata profile for:", creator.label, wikidataId);

          // Get entity data directly using the Wikidata ID
          const entityData = await this.wikidataClient.getEntityData(wikidataId);

          if (!entityData?.entities?.[wikidataId]) {
            console.log("[KB Plugin] No Wikidata entity data for:", wikidataId);
            return;
          }

          const entity = entityData.entities[wikidataId];
          const claims = entity.claims || {};

          // Build author profile
          const wikidataProfile = {
            id: wikidataId,
            name: entity.labels?.nl?.value || entity.labels?.en?.value || creator.label || "",
            description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value,
            birthDate: this.extractWikidataDate(claims.P569),
            deathDate: this.extractWikidataDate(claims.P570),
            imageUrl: this.extractWikidataImage(claims.P18),
            wikipediaUrl: this.extractWikipediaUrl(entity.sitelinks),
            occupation: this.extractOccupations(claims.P106),
            notableWorks: this.extractNotableWorks(claims.P800),
          };

          // Remove undefined fields
          Object.keys(wikidataProfile).forEach((key) => {
            if (wikidataProfile[key as keyof typeof wikidataProfile] === undefined) {
              delete wikidataProfile[key as keyof typeof wikidataProfile];
            }
          });

          creator.wikidataProfile = wikidataProfile;
          console.log("[KB Plugin] Wikidata profile enriched for:", creator.label, wikidataProfile);
        } catch (error) {
          console.error("[KB Plugin] Error fetching Wikidata profile:", error);
        }
      })
    );
  }

  /**
   * Extract date from Wikidata claims
   */
  private extractWikidataDate(claims: any[]): string | undefined {
    if (!claims || claims.length === 0) {
      return undefined;
    }

    const dateValue = claims[0]?.mainsnak?.datavalue?.value?.time;
    if (!dateValue || !dateValue.startsWith('+')) {
      return undefined;
    }

    // Extract just the date part (YYYY-MM-DD)
    const dateMatch = dateValue.match(/\+(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : undefined;
  }

  /**
   * Extract image URL from Wikidata claims
   */
  private extractWikidataImage(claims: any[]): string | undefined {
    if (!claims || claims.length === 0) {
      return undefined;
    }

    const imageFile = claims[0]?.mainsnak?.datavalue?.value;
    if (!imageFile) {
      return undefined;
    }

    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
  }

  /**
   * Extract Wikipedia URL from Wikidata sitelinks
   */
  private extractWikipediaUrl(sitelinks: any): string | undefined {
    if (!sitelinks) {
      return undefined;
    }

    const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
    if (!nlWiki) {
      return undefined;
    }

    const site = sitelinks.nlwiki ? "nl.wikipedia.org" : "en.wikipedia.org";
    return `https://${site}/wiki/${encodeURIComponent(nlWiki.title)}`;
  }

  /**
   * Extract occupations from Wikidata claims
   */
  private extractOccupations(claims: any[]): string[] | undefined {
    if (!claims || claims.length === 0) {
      return undefined;
    }

    const occupationMap: { [key: string]: string } = {
      'Q36180': 'schrijver',
      'Q482980': 'auteur',
      'Q49757': 'dichter',
      'Q28389': 'scenarioschrijver',
      'Q6625963': 'romanschrijver',
      'Q4853732': 'kinderboekenschrijver',
      'Q333634': 'vertaler',
      'Q12144794': 'illustrator',
      'Q644687': 'illustrator',
      'Q1028181': 'schilder',
    };

    const occupations = claims
      .map((claim: any) => {
        const qid = claim?.mainsnak?.datavalue?.value?.id;
        return qid ? occupationMap[qid] || qid : null;
      })
      .filter((occ: string | null) => occ !== null);

    return occupations.length > 0 ? occupations : undefined;
  }

  /**
   * Extract notable works from Wikidata claims
   */
  private extractNotableWorks(claims: any[]): string[] | undefined {
    if (!claims || claims.length === 0) {
      return undefined;
    }

    const works = claims
      .map((claim: any) => claim?.mainsnak?.datavalue?.value?.id)
      .filter((id: string) => id);

    return works.length > 0 ? works : undefined;
  }

  private async fetchLinkedData(record: KBBookMetadata): Promise<void> {
    if (!record.ppn) {
      console.log("[KB Plugin] No PPN for:", record.title);
      return;
    }

    if (record.linkedData) {
      console.log("[KB Plugin] Linked data already exists for:", record.title);
      return;
    }

    if (this.linkedDataCache.has(record.ppn)) {
      record.linkedData = this.linkedDataCache.get(record.ppn);
      console.log("[KB Plugin] Using cached linked data for:", record.title);
      return;
    }

    const url = `https://data.bibliotheken.nl/doc/nbt/${record.ppn}.json`;
    console.log("[KB Plugin] Fetching linked data from:", url);

    try {
      const response = await requestUrl({ url, method: "GET", throw: false });
      console.log("[KB Plugin] Linked data response status:", response.status);
      
      if (response.status !== 200 || !response.text) {
        console.log("[KB Plugin] No linked data available for:", record.title);
        return;
      }

      const payload = JSON.parse(response.text);
      const linkedData = this.parseLinkedDataPayload(payload);
      if (linkedData) {
        linkedData.uri = linkedData.uri || record.ppnUri;
        this.linkedDataCache.set(record.ppn, linkedData);
        record.linkedData = linkedData;
        console.log("[KB Plugin] Linked data enriched for:", record.title, linkedData);
      } else {
        console.log("[KB Plugin] Failed to parse linked data for:", record.title);
      }
    } catch (error) {
      console.error("[KB Plugin] Linked data enrichment failed:", error);
    }
  }

  private parseLinkedDataPayload(payload: any): KBBookMetadata["linkedData"] | undefined {
    if (!payload) {
      return undefined;
    }

    const graph = Array.isArray(payload["@graph"]) ? payload["@graph"] : [];
    if (graph.length === 0) {
      return undefined;
    }

    const index = new Map<string, any>();
    graph.forEach((node: any) => {
      if (node?.["@id"]) {
        index.set(node["@id"], node);
      }
    });

    const primaryNode = graph.find((node: any) => typeof node?.["@id"] === "string" && node["@id"].includes("/nbt/")) || graph[0];
    if (!primaryNode) {
      return undefined;
    }

    return {
      uri: primaryNode["@id"],
      creators: this.extractLinkedResources(primaryNode, index, ["schema:creator", "creator", "dc:creator"]),
      subjects: this.extractLinkedResources(primaryNode, index, ["schema:about", "subject", "dc:subject"]),
      series: this.extractLinkedResources(primaryNode, index, ["schema:isPartOf", "isPartOf", "dcterms:isPartOf"]),
    };
  }

  private extractLinkedResources(node: any, index: Map<string, any>, keys: string[]): KBLinkedDataResource[] {
    const resources: KBLinkedDataResource[] = [];
    keys.forEach((key) => {
      const value = node?.[key];
      if (!value) {
        return;
      }

      const values = Array.isArray(value) ? value : [value];
      values.forEach((entry) => {
        const resource = this.toLinkedDataResource(entry, index);
        if (resource) {
          resources.push(resource);
        }
      });
    });

    return this.dedupeLinkedResources(resources);
  }

  private toLinkedDataResource(entry: any, index: Map<string, any>): KBLinkedDataResource | undefined {
    if (typeof entry === "string") {
      return this.buildLinkedDataResource(entry, index.get(entry));
    }

    if (entry?.["@id"]) {
      const node = index.get(entry["@id"]) || entry;
      return this.buildLinkedDataResource(entry["@id"], node);
    }

    if (entry?.value) {
      return this.buildLinkedDataResource(entry.value, entry);
    }

    return undefined;
  }

  private buildLinkedDataResource(uri: string, node?: any): KBLinkedDataResource {
    const labelValue = node?.["skos:prefLabel"] || node?.["rdfs:label"] || node?.["schema:name"] || node?.label;
    const label = Array.isArray(labelValue) ? labelValue[0] : labelValue;
    const type = node?.["@type"];
    
    const resource: KBLinkedDataResource = { uri };
    
    // Basic info
    if (typeof label === "string") {
      resource.label = label;
    }
    if (type) {
      resource.type = type;
    }
    
    // Enhanced data extraction
    if (node) {
      // Description
      const descValue = node?.["schema:description"] || node?.["rdfs:comment"] || node?.description;
      if (typeof descValue === "string") {
        resource.description = descValue;
      } else if (Array.isArray(descValue) && typeof descValue[0] === "string") {
        resource.description = descValue[0];
      }
      
      // Image
      const imageValue = node?.["schema:image"] || node?.["foaf:depiction"] || node?.image;
      if (typeof imageValue === "string") {
        resource.image = imageValue;
      } else if (imageValue?.["@id"]) {
        resource.image = imageValue["@id"];
      }
      
      // Birth/Death dates for persons
      const birthValue = node?.["schema:birthDate"] || node?.birthDate;
      if (typeof birthValue === "string") {
        resource.birthDate = birthValue;
      }
      
      const deathValue = node?.["schema:deathDate"] || node?.deathDate;
      if (typeof deathValue === "string") {
        resource.deathDate = deathValue;
      }
      
      // External identifiers (sameAs)
      const sameAsValue = node?.["owl:sameAs"] || node?.["schema:sameAs"] || node?.sameAs;
      if (sameAsValue) {
        const sameAsArray = Array.isArray(sameAsValue) ? sameAsValue : [sameAsValue];
        resource.sameAs = sameAsArray
          .map((item: any) => (typeof item === "string" ? item : item?.["@id"]))
          .filter((item: any) => typeof item === "string");
      }
      
      // Subject hierarchies
      const broaderValue = node?.["skos:broader"] || node?.broader;
      if (broaderValue) {
        const broaderArray = Array.isArray(broaderValue) ? broaderValue : [broaderValue];
        resource.broader = broaderArray
          .map((item: any) => (typeof item === "string" ? item : item?.["@id"]))
          .filter((item: any) => typeof item === "string");
      }
      
      const narrowerValue = node?.["skos:narrower"] || node?.narrower;
      if (narrowerValue) {
        const narrowerArray = Array.isArray(narrowerValue) ? narrowerValue : [narrowerValue];
        resource.narrower = narrowerArray
          .map((item: any) => (typeof item === "string" ? item : item?.["@id"]))
          .filter((item: any) => typeof item === "string");
      }
      
      const relatedValue = node?.["skos:related"] || node?.related;
      if (relatedValue) {
        const relatedArray = Array.isArray(relatedValue) ? relatedValue : [relatedValue];
        resource.related = relatedArray
          .map((item: any) => (typeof item === "string" ? item : item?.["@id"]))
          .filter((item: any) => typeof item === "string");
      }
    }
    
    return resource;
  }

  private dedupeLinkedResources(resources: KBLinkedDataResource[]): KBLinkedDataResource[] {
    const seen = new Map<string, KBLinkedDataResource>();
    resources.forEach((resource) => {
      if (!seen.has(resource.uri)) {
        seen.set(resource.uri, resource);
      }
    });
    return Array.from(seen.values());
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
        const enriched = {
          ...metadata,
          series: metadata.series || bolMetadata.series,
          description: metadata.description || bolMetadata.description,
          pageCount: metadata.pageCount || bolMetadata.pageCount,
          coverUrl: bolMetadata.coverUrl || metadata.coverUrl,
        };
        
        // If no cover from Bol, try Open Library as fallback
        if (!enriched.coverUrl && metadata.isbn) {
          enriched.coverUrl = `https://covers.openlibrary.org/b/isbn/${metadata.isbn}-L.jpg`;
          console.log("[KB Plugin] Using Open Library fallback cover for:", metadata.title);
        }
        
        return enriched;
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching from Bol.com:", error);
    }

    // If Bol enrichment failed completely, try Open Library
    if (metadata.isbn) {
      metadata.coverUrl = `https://covers.openlibrary.org/b/isbn/${metadata.isbn}-L.jpg`;
      console.log("[KB Plugin] Bol enrichment failed, using Open Library for:", metadata.title);
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

