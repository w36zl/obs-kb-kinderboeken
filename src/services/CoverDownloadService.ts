import { App, Notice } from "obsidian";
import type { KBBookMetadata, KBPluginSettings } from "../types";
import type { KBApiClient } from "../api";
import type { TemplateEngine } from "../template/TemplateEngine";

/**
 * Service responsible for downloading and managing book cover images.
 * Implements multi-source fallback strategy and deduplication.
 */
export class CoverDownloadService {
  constructor(
    private app: App,
    private apiClient: KBApiClient,
    private templateEngine: TemplateEngine,
    private settings: KBPluginSettings
  ) {}

  /**
   * Download and save cover image to vault with multi-source fallback.
   * Returns the local file path or fallback URL/null.
   *
   * @param metadata - Book metadata containing ISBN(s) and cover URL
   * @param options - Download options
   * @returns Local file path if successful, fallback URL, or null
   */
  async downloadAndSaveCover(
    metadata: KBBookMetadata,
    options: {
      showNotice?: boolean;
      showSource?: boolean;
    } = {}
  ): Promise<string | null> {
    const { showNotice = false, showSource = true } = options;

    // Early return if no cover information available
    if (!metadata.coverUrl && (!metadata.allIsbns || metadata.allIsbns.length === 0)) {
      console.log("[KB Plugin] No cover URL or ISBNs available");
      return this.getFallbackUrl();
    }

    try {
      const folder = this.settings.attachmentFolder;

      // Generate filename from pattern
      const fileName = this.templateEngine.renderFilename(
        this.settings.coverFilenamePattern,
        metadata
      );
      const filePath = `${folder}/${fileName}.jpg`;

      // Check for existing cover if deduplication is enabled
      if (this.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }

      // Attempt to download cover with fallback strategy
      const result = await this.downloadCoverWithFallback(metadata);

      if (!result) {
        console.log("[KB Plugin] No cover found from any source");
        if (showNotice) {
          new Notice("Could not find cover image", 3000);
        }
        return this.getFallbackUrl();
      }

      // Ensure folder exists
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      // Save cover image
      await this.app.vault.adapter.writeBinary(filePath, result.data);

      console.log(`[KB Plugin] Cover image saved to ${filePath} (from ${result.source})`);

      // Show user-friendly notice with source
      if (showNotice && showSource && result.source) {
        new Notice(`Cover downloaded from ${result.source}`, 3000);
      }

      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (showNotice) {
        new Notice(`Could not save cover image: ${errorMessage}`);
      }
      return this.getFallbackUrl();
    }
  }

  /**
   * Download cover with multi-source fallback strategy.
   * Tries: Open Library → Google Books → Amazon → Bol.com
   *
   * @param metadata - Book metadata with ISBNs
   * @returns Cover data and source, or null if all sources fail
   */
  private async downloadCoverWithFallback(
    metadata: KBBookMetadata
  ): Promise<{ data: ArrayBuffer; source: string; isbn: string } | null> {
    // Prepare ISBNs to try
    const isbnsToTry = this.getIsbnsToTry(metadata);

    if (isbnsToTry.length === 0) {
      return null;
    }

    // Try each source in order
    const sources = [
      { name: "Open Library", method: this.tryOpenLibrary.bind(this) },
      { name: "Google Books", method: this.tryGoogleBooks.bind(this) },
      { name: "Amazon", method: this.tryAmazon.bind(this) },
      { name: "Bol.com", method: this.tryBolCom.bind(this) },
    ];

    for (const source of sources) {
      console.log(`[KB Plugin] Trying ${source.name}...`);
      const result = await source.method(isbnsToTry);

      if (result) {
        console.log(`[KB Plugin] ✅ Cover found from ${source.name} (ISBN: ${result.isbn}, ${result.data.byteLength} bytes)`);
        return { ...result, source: source.name };
      }
    }

    return null;
  }

  /**
   * Try downloading from Open Library for all ISBNs
   */
  private async tryOpenLibrary(isbns: string[]): Promise<{ data: ArrayBuffer; isbn: string } | null> {
    for (const isbn of isbns) {
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
      const coverData = await this.apiClient.downloadCover(coverUrl);

      if (this.isValidCover(coverData)) {
        return { data: coverData, isbn };
      }
    }
    return null;
  }

  /**
   * Try downloading from Google Books for all ISBNs
   */
  private async tryGoogleBooks(isbns: string[]): Promise<{ data: ArrayBuffer; isbn: string } | null> {
    for (const isbn of isbns) {
      const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);

      if (googleCoverUrl) {
        const coverData = await this.apiClient.downloadCover(googleCoverUrl);

        if (this.isValidCover(coverData)) {
          return { data: coverData, isbn };
        }
      }
    }
    return null;
  }

  /**
   * Try downloading from Amazon for all ISBNs
   */
  private async tryAmazon(isbns: string[]): Promise<{ data: ArrayBuffer; isbn: string } | null> {
    for (const isbn of isbns) {
      const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.settings.amazonRegion);
      const coverData = await this.apiClient.downloadCover(amazonCoverUrl);

      if (this.isValidCover(coverData)) {
        return { data: coverData, isbn };
      }
    }
    return null;
  }

  /**
   * Try downloading from Bol.com for all ISBNs
   */
  private async tryBolCom(isbns: string[]): Promise<{ data: ArrayBuffer; isbn: string } | null> {
    for (const isbn of isbns) {
      const bolCoverUrl = await this.apiClient.getBolCoverUrl(isbn);

      if (bolCoverUrl) {
        const coverData = await this.apiClient.downloadCover(bolCoverUrl);

        if (this.isValidCover(coverData)) {
          return { data: coverData, isbn };
        }
      }
    }
    return null;
  }

  /**
   * Get list of ISBNs to try for cover download
   */
  private getIsbnsToTry(metadata: KBBookMetadata): string[] {
    const isbns = metadata.allIsbns && metadata.allIsbns.length > 0
      ? metadata.allIsbns
      : [metadata.isbn].filter(Boolean) as string[];

    return isbns;
  }

  /**
   * Check if cover data is valid (not a placeholder/error image)
   */
  private isValidCover(coverData: ArrayBuffer | null): coverData is ArrayBuffer {
    return coverData !== null && coverData.byteLength > 1000;
  }

  /**
   * Get fallback cover URL from settings
   */
  private getFallbackUrl(): string | null {
    return this.settings.coverFallbackUrl || null;
  }

  /**
   * Try to get a cover URL for display purposes (doesn't download).
   * Uses the same fallback strategy but returns URL instead of downloading.
   *
   * @param metadata - Book metadata with ISBNs
   * @returns Cover URL or null
   */
  async getCoverUrlWithFallback(metadata: KBBookMetadata): Promise<string | null> {
    // If we already have a cover URL, return it
    if (metadata.coverUrl) {
      return metadata.coverUrl;
    }

    const isbnsToTry = this.getIsbnsToTry(metadata);

    if (isbnsToTry.length === 0) {
      return this.getFallbackUrl();
    }

    // Try Open Library first (most reliable)
    for (const isbn of isbnsToTry) {
      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

      // Quick HEAD request to check if cover exists
      const coverData = await this.apiClient.downloadCover(coverUrl);
      if (this.isValidCover(coverData)) {
        return coverUrl;
      }
    }

    // Try Google Books
    for (const isbn of isbnsToTry) {
      const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
      if (googleCoverUrl) {
        return googleCoverUrl;
      }
    }

    // Try Amazon
    if (isbnsToTry.length > 0) {
      const amazonUrl = this.apiClient.getAmazonCoverUrl(isbnsToTry[0], this.settings.amazonRegion);
      return amazonUrl;
    }

    return this.getFallbackUrl();
  }
}
