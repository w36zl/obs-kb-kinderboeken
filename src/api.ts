import { XMLParser } from "fast-xml-parser";
import { KBBookMetadata } from "./types";
import { Notice } from "obsidian";

const KB_SRU_BASE_URL = "http://jsru.kb.nl/sru";
const KB_COLLECTION = "GGC";
const REQUEST_TIMEOUT = 30000; // 30 seconds

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

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Accept": "application/xml, text/xml, */*",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();

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
      if (error.name === "AbortError") {
        console.error("[KB Plugin] Request timeout");
        new Notice("Request timed out. The KB API might be slow or unavailable.");
      } else {
        console.error("[KB Plugin] API error:", error);
        new Notice(`API error: ${error.message}`);
      }
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
      if (!recordData) return null;

      // Navigate to Dublin Core metadata
      const dc = recordData["srw_dc:dc"] || recordData["dc"];
      if (!dc) return null;

      const metadata: KBBookMetadata = {
        title: this.extractField(dc, "dc:title") || "Unknown Title",
        authors: this.extractMultipleFields(dc, "dc:creator"),
        isbn: this.extractISBN(dc),
        publisher: this.extractField(dc, "dc:publisher"),
        publishYear: this.extractYear(dc),
        language: this.extractField(dc, "dc:language"),
        description: this.extractField(dc, "dc:description"),
        subjects: this.extractMultipleFields(dc, "dc:subject"),
        identifier: this.extractField(dc, "dc:identifier"),
      };

      return metadata;
    } catch (error) {
      console.error("Error parsing record:", error);
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
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error downloading cover:", error);
      return null;
    }
  }
}
