import { App, Modal, Notice, Setting } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { CoverDownloadService, BookNoteCreatorService } from "./services";

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
  coverDownloadService: CoverDownloadService;
  bookNoteCreatorService: BookNoteCreatorService;
  criteria: AdvancedSearchCriteria;
  results: KBBookMetadata[] = [];

  constructor(app: App, plugin: KBKinderboekenPlugin) {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment,
      plugin.settings.enableWikidataEnrichment
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);

    // Initialize services
    this.coverDownloadService = new CoverDownloadService(
      app,
      this.apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );

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
      .setDesc("Search by author name (tip: searches by last name for best results)")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Donaldson, Vegara")
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
      .setDesc("Search for series name (Note: works best with OR mode or alone)")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Little People, Kikker, Muizenhuis")
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
      .setDesc("Search by publisher name")
      .addText((text) =>
        text
          .setPlaceholder("e.g., Vier Windstreken, Lemniscaat")
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
    contentEl.createDiv("kb-advanced-results");

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

    // Author - handle both "First Last" and "Last, First" formats
    if (this.criteria.author.trim()) {
      const authorInput = this.criteria.author.trim();
      
      // If input is NOT in "Last, First" format, try to extract last name for better matching
      if (!authorInput.includes(',')) {
        // Extract potential last name (last word)
        const words = authorInput.split(/\s+/);
        const lastName = words[words.length - 1];
        
        // Search using last name (more likely to match KB format)
        parts.push(`dc.creator all "${lastName}"`);
      } else {
        // Already in "Last, First" format - use as-is
        parts.push(`dc.creator all "${authorInput}"`);
      }
    }

    // Series - NOTE: Series names often DON'T appear in individual book titles
    // So we only use series as a filter when it's the ONLY or PRIMARY criterion
    // Skip series in AND mode when other criteria are present
    if (this.criteria.series.trim()) {
      const hasOtherCriteria = this.criteria.title || this.criteria.author || this.criteria.subject || this.criteria.publisher;
      
      // Only add series to query if:
      // 1. It's the only criterion, OR
      // 2. We're in OR mode (any match), OR  
      // 3. No other criteria specified
      if (!hasOtherCriteria || this.criteria.matchMode === "any") {
        parts.push(`dc.title all "${this.criteria.series.trim()}"`);
      }
      // In AND mode with other criteria, skip series to avoid 0 results
    }

    // Subject
    if (this.criteria.subject.trim()) {
      parts.push(`dc.subject all "${this.criteria.subject.trim()}"`);
    }

    // Publisher - extract main publisher name (remove location prefix)
    if (this.criteria.publisher.trim()) {
      let publisherQuery = this.criteria.publisher.trim();
      
      // Remove common location prefixes like "[Rijswijk] : "
      publisherQuery = publisherQuery.replace(/^\[.*?\]\s*:\s*/, '');
      
      // Remove "De/Het" articles for better matching
      publisherQuery = publisherQuery.replace(/^(De|Het)\s+/i, '');
      
      parts.push(`dc.publisher all "${publisherQuery}"`);
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
      await this.bookNoteCreatorService.createBookNote(metadata, {
        openFile: true,
        runTemplater: true,
        showNotice: true,
        showCoverSource: false,
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      // Error is already handled and displayed by the service
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
