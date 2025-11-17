import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";

interface AdvancedSearchCriteria {
  title: string;
  author: string;
  isbn: string;
  subject: string;
  publisher: string;
  yearFrom: string;
  yearTo: string;
  language: string;
  series: string;
  matchMode: "all" | "any";
  includeChildrensBooks: boolean;
  onlyChildrensBooks: boolean;
}

export class AdvancedSearchModal extends Modal {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  criteria: AdvancedSearchCriteria;
  results: KBBookMetadata[] = [];

  constructor(app: App, plugin: KBKinderboekenPlugin) {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
    this.criteria = this.getDefaultCriteria();
  }

  private getDefaultCriteria(): AdvancedSearchCriteria {
    return {
      title: "",
      author: "",
      isbn: "",
      subject: "",
      publisher: "",
      yearFrom: "",
      yearTo: "",
      language: "",
      series: "",
      matchMode: "all",
      includeChildrensBooks: false,
      onlyChildrensBooks: false,
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-advanced-search-modal");

    contentEl.createEl("h2", { text: "Advanced Book Search" });
    contentEl.createEl("p", {
      text: "Fill in any combination of fields to build a complex search query",
      cls: "kb-advanced-hint",
    });

    const formContainer = contentEl.createDiv("kb-advanced-form");

    // Title field
    new Setting(formContainer)
      .setName("Title")
      .setDesc("Search in book titles")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Gruffalo, Little People Big Dreams")
          .setValue(this.criteria.title)
          .onChange((value) => {
            this.criteria.title = value;
          })
      );

    // Author field
    new Setting(formContainer)
      .setName("Author")
      .setDesc("Search by author name")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Julia Donaldson, Roald Dahl")
          .setValue(this.criteria.author)
          .onChange((value) => {
            this.criteria.author = value;
          })
      );

    // ISBN field
    new Setting(formContainer)
      .setName("ISBN")
      .setDesc("Search by ISBN (exact match)")
      .addText((text) =>
        text
          .setPlaceholder("e.g., 9789047704539")
          .setValue(this.criteria.isbn)
          .onChange((value) => {
            this.criteria.isbn = value;
          })
      );

    // Series field
    new Setting(formContainer)
      .setName("Series")
      .setDesc("Search for books in a series")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Kikker, Muizenhuis")
          .setValue(this.criteria.series)
          .onChange((value) => {
            this.criteria.series = value;
          })
      );

    // Subject field
    new Setting(formContainer)
      .setName("Subject")
      .setDesc("Search by subject/topic")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Vriendschap, Dieren, Avontuur")
          .setValue(this.criteria.subject)
          .onChange((value) => {
            this.criteria.subject = value;
          })
      );

    // Publisher field
    new Setting(formContainer)
      .setName("Publisher")
      .setDesc("Search by publisher")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Lemniscaat, Gottmer")
          .setValue(this.criteria.publisher)
          .onChange((value) => {
            this.criteria.publisher = value;
          })
      );

    // Year range
    const yearContainer = formContainer.createDiv("kb-year-range");
    new Setting(yearContainer)
      .setName("Publication year")
      .setDesc("Filter by publication year range")
      .addText((text) =>
        text
          .setPlaceholder("From (e.g., 2000)")
          .setValue(this.criteria.yearFrom)
          .onChange((value) => {
            this.criteria.yearFrom = value;
          })
      )
      .addText((text) =>
        text
          .setPlaceholder("To (e.g., 2024)")
          .setValue(this.criteria.yearTo)
          .onChange((value) => {
            this.criteria.yearTo = value;
          })
      );

    // Language field
    new Setting(formContainer)
      .setName("Language")
      .setDesc("Filter by language")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("", "Any language")
          .addOption("Nederlands", "Nederlands")
          .addOption("Engels", "English")
          .addOption("Duits", "German")
          .addOption("Frans", "French")
          .setValue(this.criteria.language)
          .onChange((value) => {
            this.criteria.language = value;
          })
      );

    // Match mode
    new Setting(formContainer)
      .setName("Match mode")
      .setDesc("How to combine multiple criteria")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("all", "Match ALL criteria (AND)")
          .addOption("any", "Match ANY criteria (OR)")
          .setValue(this.criteria.matchMode)
          .onChange((value) => {
            this.criteria.matchMode = value as "all" | "any";
          })
      );

    // Children's books filters
    new Setting(formContainer)
      .setName("Children's books")
      .setDesc("Filter by children's literature subjects")
      .addToggle((toggle) =>
        toggle
          .setTooltip("Only show children's books")
          .setValue(this.criteria.onlyChildrensBooks)
          .onChange((value) => {
            this.criteria.onlyChildrensBooks = value;
            if (value) {
              this.criteria.includeChildrensBooks = false;
            }
          })
      );

    // Query preview
    const previewContainer = contentEl.createDiv("kb-query-preview");
    previewContainer.createEl("h3", { text: "Query Preview" });
    const previewEl = previewContainer.createEl("code", {
      cls: "kb-query-preview-text",
    });

    // Update preview function
    const updatePreview = () => {
      const query = this.buildQuery();
      previewEl.textContent = query || "(empty query)";
    };

    // Action buttons
    const buttonContainer = contentEl.createDiv("kb-advanced-buttons");

    // Clear button
    new Setting(buttonContainer).addButton((button) =>
      button
        .setButtonText("Clear")
        .setTooltip("Clear all fields")
        .onClick(() => {
          this.criteria = this.getDefaultCriteria();
          this.close();
          this.open(); // Reopen to reset form
        })
    );

    // Preview button
    new Setting(buttonContainer).addButton((button) =>
      button
        .setButtonText("Preview Query")
        .setTooltip("Show the generated CQL query")
        .onClick(() => {
          updatePreview();
        })
    );

    // Search button
    new Setting(buttonContainer).addButton((button) =>
      button
        .setButtonText("Search")
        .setCta()
        .setTooltip("Execute the advanced search")
        .onClick(async () => {
          await this.executeSearch();
        })
    );

    // Results container
    const resultsContainer = contentEl.createDiv("kb-advanced-results");

    // Auto-preview on open
    updatePreview();
  }

  /**
   * Build CQL query from criteria
   */
  private buildQuery(): string {
    const parts: string[] = [];

    // ISBN gets priority (most specific)
    if (this.criteria.isbn.trim()) {
      return `dc.identifier=${this.criteria.isbn.trim()}`;
    }

    // Title
    if (this.criteria.title.trim()) {
      parts.push(`dc.title all "${this.criteria.title.trim()}"`);
    }

    // Author
    if (this.criteria.author.trim()) {
      parts.push(`dc.creator all "${this.criteria.author.trim()}"`);
    }

    // Series
    if (this.criteria.series.trim()) {
      parts.push(
        `(dc.relation all "${this.criteria.series.trim()}" OR dc.title all "${this.criteria.series.trim()}")`
      );
    }

    // Subject
    if (this.criteria.subject.trim()) {
      parts.push(`dc.subject all "${this.criteria.subject.trim()}"`);
    }

    // Publisher
    if (this.criteria.publisher.trim()) {
      parts.push(`dc.publisher all "${this.criteria.publisher.trim()}"`);
    }

    // Year range
    if (this.criteria.yearFrom.trim() || this.criteria.yearTo.trim()) {
      const yearFrom = this.criteria.yearFrom.trim() || "1900";
      const yearTo = this.criteria.yearTo.trim() || "2100";
      parts.push(`dc.date>=${yearFrom} AND dc.date<=${yearTo}`);
    }

    // Language
    if (this.criteria.language.trim()) {
      parts.push(`dc.language="${this.criteria.language}"`);
    }

    // Combine parts
    if (parts.length === 0) {
      new Notice("Please enter at least one search criterion");
      return "";
    }

    const operator = this.criteria.matchMode === "all" ? " AND " : " OR ";
    let query = parts.length > 1 ? `(${parts.join(operator)})` : parts[0];

    // Add children's books filter
    if (this.criteria.onlyChildrensBooks) {
      query = `(${query}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
    }

    return query;
  }

  /**
   * Execute the advanced search
   */
  private async executeSearch() {
    const query = this.buildQuery();

    if (!query) {
      return;
    }

    try {
      console.log("[KB Plugin] Advanced search query:", query);

      const encodedQuery = encodeURIComponent(query);
      const url = `https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=${encodedQuery}&maximumRecords=20&x-fields=ISBN`;

      new Notice("Searching...");

      // Use the API client's performSearch method by creating a temporary instance
      const response = await (this.apiClient as any).performSearch(url);

      console.log("[KB Plugin] Advanced search results:", response.length);

      if (response.length === 0) {
        new Notice("No results found. Try adjusting your criteria.");
        return;
      }

      // Show results in a simple modal or reuse the BookSearchModal
      this.results = response;
      this.displayResults(response);
    } catch (error) {
      console.error("[KB Plugin] Advanced search error:", error);
      new Notice("Search failed. Please try again.");
    }
  }

  /**
   * Display search results
   */
  private displayResults(results: KBBookMetadata[]) {
    const { contentEl } = this;
    const resultsContainer = contentEl.querySelector(
      ".kb-advanced-results"
    ) as HTMLElement;

    if (!resultsContainer) return;

    resultsContainer.empty();
    resultsContainer.createEl("h3", { text: `Found ${results.length} result(s)` });

    const resultsList = resultsContainer.createDiv("kb-results-list");

    results.forEach((book) => {
      const bookEl = resultsList.createDiv("kb-book-result");

      // Title
      bookEl.createEl("h4", { text: book.title });

      // Author
      if (book.authors && book.authors.length > 0) {
        bookEl.createEl("p", {
          text: `By: ${book.authors.join(", ")}`,
          cls: "kb-book-authors",
        });
      }

      // Details
      const details: string[] = [];
      if (book.isbn) details.push(`ISBN: ${book.isbn}`);
      if (book.publishYear) details.push(`Year: ${book.publishYear}`);
      if (book.publisher) details.push(`Publisher: ${book.publisher}`);

      if (details.length > 0) {
        bookEl.createEl("p", {
          text: details.join(" | "),
          cls: "kb-book-details",
        });
      }

      // Series
      if (book.series) {
        bookEl.createEl("p", {
          text: `Series: ${book.series}`,
          cls: "kb-book-series",
        });
      }

      // Subjects
      if (book.subjects && book.subjects.length > 0) {
        bookEl.createEl("p", {
          text: `Subjects: ${book.subjects.slice(0, 3).join(", ")}`,
          cls: "kb-book-subjects",
        });
      }

      // Select button
      const selectBtn = bookEl.createEl("button", {
        text: "Select this book",
        cls: "kb-select-button",
      });

      selectBtn.onclick = async () => {
        try {
          await this.createBookNote(book);
          this.close();
        } catch (error) {
          console.error("[KB Plugin] Error creating book note:", error);
          new Notice("Failed to create book note. Check console for details.");
        }
      };
    });
  }

  /**
   * Create a book note from selected metadata
   */
  private async createBookNote(metadata: KBBookMetadata) {
    try {
      console.log("[KB Plugin] Creating note for:", metadata.title);

      // Download cover first if enabled (so we have local path for template)
      if (this.plugin.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.downloadAndAttachCover(metadata);
        if (coverPath) {
          metadata.localCoverImage = coverPath;
        }
      }

      // Render filename from pattern
      const filename = this.templateEngine.renderFilename(
        this.plugin.settings.filenamePattern,
        metadata
      );

      // Get the book notes folder path
      const folderPath = this.plugin.settings.bookNotesFolder;

      // Ensure the folder exists
      const folderExists = await this.app.vault.adapter.exists(folderPath);
      if (!folderExists) {
        console.log("[KB Plugin] Creating folder:", folderPath);
        await this.app.vault.createFolder(folderPath);
      }

      // Create the full file path
      const filePath = `${folderPath}/${filename}.md`;

      // Check if file already exists
      const fileExists = await this.app.vault.adapter.exists(filePath);

      // Get template content
      let templateContent: string;
      if (this.plugin.settings.useTemplate && this.plugin.settings.templatePath) {
        const customTemplate = await this.templateReader.readTemplate(
          this.plugin.settings.templatePath
        );
        templateContent = customTemplate || this.templateReader.getDefaultTemplate();
      } else {
        templateContent = this.templateReader.getDefaultTemplate();
      }

      // Render template with metadata
      const renderedContent = this.templateEngine.render(templateContent, metadata);

      let file: TFile | null = null;
      if (fileExists) {
        // File exists, replace it
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
          file = abstractFile;
        }
      } else {
        // Create new file
        console.log("[KB Plugin] Creating new note:", filePath);
        file = await this.app.vault.create(filePath, renderedContent);
      }

      // Open the note
      if (file) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);

        // Run Templater if it's installed
        await this.runTemplaterIfAvailable(file);
      }

      new Notice(`Book note created: ${filename}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new Notice(`Error creating book note: ${errorMessage}`);
    }
  }

  /**
   * Download and attach cover image
   */
  private async downloadAndAttachCover(metadata: KBBookMetadata): Promise<string | null> {
    if (!metadata.coverUrl) {
      return this.getCoverFallback();
    }

    try {
      const folder = this.plugin.settings.attachmentFolder;

      // Generate filename from pattern
      const fileName = this.templateEngine.renderFilename(
        this.plugin.settings.coverFilenamePattern,
        metadata
      );
      const filePath = `${folder}/${fileName}.jpg`;

      // Check for existing cover if deduplication is enabled
      if (this.plugin.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }

      // Try to download cover with fallback ISBNs
      const isbnsToTry = metadata.allIsbns && metadata.allIsbns.length > 0
        ? metadata.allIsbns
        : [metadata.isbn].filter(Boolean) as string[];

      let coverData: ArrayBuffer | null = null;
      let successfulIsbn: string | null = null;

      // First try Open Library for all ISBNs
      for (const isbn of isbnsToTry) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        console.log(`[KB Plugin] Trying Open Library: ${coverUrl}`);

        coverData = await this.apiClient.downloadCover(coverUrl);

        // Check if we got a real cover (not just a placeholder)
        if (coverData && coverData.byteLength > 1000) {
          console.log(`[KB Plugin] Found Open Library cover with ISBN: ${isbn} (${coverData.byteLength} bytes)`);
          successfulIsbn = isbn;
          break;
        } else {
          console.log(`[KB Plugin] No valid Open Library cover for ISBN: ${isbn}`);
        }
      }

      // If Open Library failed, try Google Books
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] Trying Google Books as fallback...");

        for (const isbn of isbnsToTry) {
          const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);

          if (googleCoverUrl) {
            console.log(`[KB Plugin] Found Google Books cover URL for ISBN: ${isbn}`);
            coverData = await this.apiClient.downloadCover(googleCoverUrl);

            if (coverData && coverData.byteLength > 1000) {
              console.log(`[KB Plugin] Successfully downloaded Google Books cover (${coverData.byteLength} bytes)`);
              successfulIsbn = isbn;
              break;
            }
          }
        }
      }

      // If Google Books failed, try Amazon
      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] Trying Amazon as fallback...");

        for (const isbn of isbnsToTry) {
          const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.plugin.settings.amazonRegion);
          console.log(`[KB Plugin] Trying Amazon cover URL for ISBN: ${isbn}`);

          coverData = await this.apiClient.downloadCover(amazonCoverUrl);

          if (coverData && coverData.byteLength > 1000) {
            console.log(`[KB Plugin] Successfully downloaded Amazon cover (${coverData.byteLength} bytes)`);
            successfulIsbn = isbn;
            break;
          }
        }
      }

      if (!coverData || !successfulIsbn) {
        console.log("[KB Plugin] No cover found from any source");
        return this.getCoverFallback();
      }

      // Ensure folder exists
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      // Save cover image
      await this.app.vault.adapter.writeBinary(filePath, coverData);

      console.log(`[KB Plugin] Cover image saved to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new Notice(`Could not save cover image: ${errorMessage}`);
      return this.getCoverFallback();
    }
  }

  /**
   * Get fallback cover path/URL
   */
  private getCoverFallback(): string | null {
    const fallback = this.plugin.settings.coverFallbackUrl;
    return fallback ? fallback : null;
  }

  /**
   * Run Templater plugin if it's installed in the vault
   */
  private async runTemplaterIfAvailable(file: TFile): Promise<void> {
    try {
      // Check if Templater plugin is installed and enabled
      const templaterPlugin = (this.app as any).plugins?.plugins?.["templater-obsidian"];

      if (templaterPlugin) {
        console.log("[KB Plugin] Templater plugin detected, running...");

        // Get Templater's API
        const templater = templaterPlugin.templater;

        if (templater && typeof templater.overwrite_file_templates === "function") {
          await templater.overwrite_file_templates(file);
          console.log("[KB Plugin] Templater processing complete");
        } else {
          console.log("[KB Plugin] Templater API not available");
        }
      } else {
        console.log("[KB Plugin] Templater plugin not installed");
      }
    } catch (error) {
      console.error("[KB Plugin] Error running Templater:", error);
      // Don't show error to user - Templater is optional
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
