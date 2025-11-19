import { App, Modal, Notice, Setting } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { CoverDownloadService, BookNoteCreatorService } from "./services";

export class BookSearchModal extends Modal {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  coverDownloadService: CoverDownloadService;
  bookNoteCreatorService: BookNoteCreatorService;
  results: KBBookMetadata[] = [];
  selectedBook: KBBookMetadata | null = null;
  initialQuery: string;

  constructor(app: App, plugin: KBKinderboekenPlugin, initialQuery = "") {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment
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

    this.initialQuery = initialQuery;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-kinderboeken-modal");

    contentEl.createEl("h2", { text: "Search KB Kinderboeken" });

    // Search type selector
    const searchTypeContainer = contentEl.createDiv("kb-search-type");
    let searchType: "general" | "isbn" = "general";

    new Setting(searchTypeContainer)
      .setName("Search by")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("general", "Title/Author")
          .addOption("isbn", "ISBN")
          .setValue("general")
          .onChange((value) => {
            searchType = value as "general" | "isbn";
            searchInput.setPlaceholder(
              searchType === "isbn"
                ? "Enter ISBN (e.g., 9780123456789)"
                : "Enter book title or author name"
            );
          })
      );

    // Search input
    const searchContainer = contentEl.createDiv("kb-search-container");
    let searchInput: any;

    // Helper function to perform search
    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new Notice("Please enter a search query");
        return;
      }

      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching..." });

      if (searchType === "isbn") {
        await this.searchByISBN(query, resultsContainer);
      } else {
        await this.searchByQuery(query, resultsContainer);
      }
    };

    new Setting(searchContainer)
      .setName("Search")
      .addText((text) => {
        searchInput = text;
        text
          .setPlaceholder("Enter book title or author name")
          .setValue(this.initialQuery)
          .onChange(() => {
            // Debounce is handled by the search button
          });
        
        // Add Enter key listener
        text.inputEl.addEventListener("keydown", async (event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            await performSearch();
          }
        });
      })
      .addButton((button) =>
        button.setButtonText("Search").onClick(async () => {
          await performSearch();
        })
      );

    // Results container
    const resultsContainer = contentEl.createDiv("kb-results-container");
    resultsContainer.createEl("p", {
      text: "Enter a search query and click Search",
      cls: "kb-results-hint",
    });

    // Auto-focus the search input when modal opens
    setTimeout(() => {
      if (searchInput && searchInput.inputEl) {
        searchInput.inputEl.focus();
        searchInput.inputEl.select(); // Also select any existing text
      }
    }, 50);

    // If initial query provided, search immediately
    if (this.initialQuery) {
      setTimeout(() => {
        searchInput.inputEl.dispatchEvent(new Event("change"));
        this.searchByQuery(this.initialQuery, resultsContainer);
      }, 100);
    }
  }

  async searchByQuery(query: string, container: HTMLElement) {
    try {
      console.log("[KB Plugin] Modal: Searching by query:", query);
      this.results = await this.apiClient.searchBooks(query, 20);
      console.log("[KB Plugin] Modal: Found", this.results.length, "results");
      
      // Enrich results with Bol.com metadata if enabled
      if (this.plugin.settings.enrichFromBol && this.results.length > 0) {
        console.log("[KB Plugin] Modal: Enriching results from Bol.com...");
        const enrichedResults = await Promise.all(
          this.results.map(async (book) => {
            try {
              return await this.apiClient.enrichFromBol(book);
            } catch (error) {
              console.error("[KB Plugin] Error enriching book:", error);
              return book;
            }
          })
        );
        this.results = enrichedResults;
      }
      
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Modal: Search error:", error);
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-no-results"
      });
    }
  }

  async searchByISBN(isbn: string, container: HTMLElement) {
    try {
      console.log("[KB Plugin] Modal: Searching by ISBN:", isbn);
      const result = await this.apiClient.searchByISBN(isbn);
      this.results = result ? [result] : [];
      console.log("[KB Plugin] Modal: ISBN search result:", result ? "found" : "not found");
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Modal: ISBN search error:", error);
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-no-results"
      });
    }
  }

  displayResults(container: HTMLElement) {
    container.empty();

    if (this.results.length === 0) {
      container.createEl("p", { text: "No results found", cls: "kb-no-results" });
      return;
    }

    container.createEl("p", {
      text: `Found ${this.results.length} result(s)`,
      cls: "kb-results-count",
    });

    const resultsList = container.createDiv("kb-results-list");

    this.results.forEach((book) => {
      const bookEl = resultsList.createDiv("kb-book-result");

      // Always show cover container (with image or placeholder)
      const coverContainer = bookEl.createDiv("kb-book-cover");
      
      if (book.coverUrl) {
        // Try to load the cover image with fallback to other ISBNs
        this.loadCoverWithFallback(coverContainer, book);
      } else {
        // No cover URL available, show placeholder
        this.addCoverPlaceholder(coverContainer);
      }

      const bookInfo = bookEl.createDiv("kb-book-info");

      bookInfo.createEl("h3", { text: book.title });

      if (book.authors && book.authors.length > 0) {
        bookInfo.createEl("p", {
          text: `Author(s): ${book.authors.join(", ")}`,
          cls: "kb-book-authors",
        });
      }

      const details: string[] = [];
      if (book.isbn) details.push(`ISBN: ${book.isbn}`);
      if (book.publishYear) details.push(`Year: ${book.publishYear}`);
      if (book.publisher) details.push(`Publisher: ${book.publisher}`);

      if (details.length > 0) {
        bookInfo.createEl("p", {
          text: details.join(" | "),
          cls: "kb-book-details",
        });
      }

      if (book.description) {
        const desc = book.description.substring(0, 200);
        bookInfo.createEl("p", {
          text: desc + (book.description.length > 200 ? "..." : ""),
          cls: "kb-book-description",
        });
      }

      const selectBtn = bookEl.createEl("button", {
        text: "Insert",
        cls: "kb-select-button",
      });

      selectBtn.onclick = async () => {
        try {
          this.selectedBook = book;
          await this.insertBookMetadata();
          this.close();
        } catch (error) {
          console.error("[KB Plugin] Error inserting metadata:", error);
          new Notice("Failed to insert metadata. Check console for details.");
        }
      };
    });
  }

  async insertBookMetadata() {
    if (!this.selectedBook) {
      console.error("[KB Plugin] No book selected");
      return;
    }

    try {
      await this.bookNoteCreatorService.createBookNote(this.selectedBook, {
        openFile: true,
        runTemplater: true,
        showNotice: true,
        showCoverSource: true,
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      // Error is already handled and displayed by the service
    }
  }

  /**
   * Load cover with fallback to alternative ISBNs if primary fails
   */
  private async loadCoverWithFallback(container: HTMLElement, book: KBBookMetadata) {
    const isbnsToTry = book.allIsbns && book.allIsbns.length > 0 ? book.allIsbns : [book.isbn].filter(Boolean) as string[];
    
    if (isbnsToTry.length === 0) {
      this.addCoverPlaceholder(container);
      return;
    }

    let currentIndex = 0;
    let triedOpenLibrary = false;
    let triedGoogleBooks = false;
    const triedAmazon = false;

    const tryNextSource = async () => {
      // Try all ISBNs with Open Library first
      if (!triedOpenLibrary) {
        if (currentIndex >= isbnsToTry.length) {
          // All Open Library ISBNs failed, try Google Books
          triedOpenLibrary = true;
          currentIndex = 0;
          await tryNextSource();
          return;
        }

        const isbn = isbnsToTry[currentIndex];
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        
        const coverImg = container.createEl("img", {
          attr: {
            src: coverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });

        coverImg.onerror = () => {
          // This Open Library ISBN failed, try next one
          coverImg.remove();
          currentIndex++;
          tryNextSource();
        };
      } 
      // Try Google Books as second fallback
      else if (!triedGoogleBooks) {
        if (currentIndex >= isbnsToTry.length) {
          // All Google Books ISBNs failed, try Amazon
          triedGoogleBooks = true;
          currentIndex = 0;
          await tryNextSource();
          return;
        }

        const isbn = isbnsToTry[currentIndex];
        console.log(`[KB Plugin] Trying Google Books for ISBN: ${isbn}`);
        
        const googleCoverUrl = await this.apiClient.getGoogleBooksCover(isbn);
        
        if (googleCoverUrl) {
          const coverImg = container.createEl("img", {
            attr: {
              src: googleCoverUrl,
              alt: `Cover for ${book.title}`,
              loading: "lazy"
            }
          });

          coverImg.onerror = () => {
            // This Google Books ISBN failed, try next one
            coverImg.remove();
            currentIndex++;
            tryNextSource();
          };
        } else {
          // No Google Books cover, try next ISBN
          currentIndex++;
          await tryNextSource();
        }
      }
      // Try Amazon as third fallback
      else if (!triedAmazon) {
        if (currentIndex >= isbnsToTry.length) {
          // All sources failed, show placeholder
          this.addCoverPlaceholder(container);
          return;
        }

        const isbn = isbnsToTry[currentIndex];
        console.log(`[KB Plugin] Trying Amazon for ISBN: ${isbn}`);
        
        const amazonCoverUrl = this.apiClient.getAmazonCoverUrl(isbn, this.plugin.settings.amazonRegion);
        
        const coverImg = container.createEl("img", {
          attr: {
            src: amazonCoverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });

        coverImg.onerror = () => {
          // This Amazon ISBN failed, try next one
          coverImg.remove();
          currentIndex++;
          tryNextSource();
        };
      }
    };

    await tryNextSource();
  }

  /**
   * Add a placeholder icon for books without covers
   */
  private addCoverPlaceholder(container: HTMLElement) {
    container.addClass("kb-book-cover-placeholder");
    // Create a simple book icon using SVG
    const placeholder = container.createDiv("kb-cover-placeholder-icon");
    placeholder.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
    `;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
