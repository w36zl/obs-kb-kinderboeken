import { XMLParser } from "fast-xml-parser";
import { KBBookMetadata } from "./types";
import { Notice, requestUrl } from "obsidian";

const KB_SRU_BASE_URL = "https://jsru.kb.nl/sru/sru";
const KB_COLLECTION = "GGC";

export class KBApiClient {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: false,
      trimValues: true,
    });
  }

  /**
   * Search for books by title or author
   */
  async searchBooks(query: string, maxResults = 10): Promise<KBBookMetadata[]> {
    try {
      console.log("[KB Plugin] Searching for:", query);
      const encodedQuery = encodeURIComponent(`"${query}"`);
      const url = `${KB_SRU_BASE_URL}?x-collection=${KB_COLLECTION}&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=${maxResults}&x-fields=ISBN`;

      return await this.performSearch(url);
    } catch (error) {
      console.error("[KB Plugin] Search error:", error);
      new Notice("Search failed. Please check your internet connection.");
      return [];
    }
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
        identifier: this.extractField(dc, "dc:identifier"),
        coverUrl: primaryIsbn ? `https://covers.openlibrary.org/b/isbn/${primaryIsbn}-L.jpg` : undefined,
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
}
