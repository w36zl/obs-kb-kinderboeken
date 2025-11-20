import { ItemView, WorkspaceLeaf, Notice, Setting } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { BookDetailModal } from "./book-detail-modal";
import { CoverDownloadService, BookNoteCreatorService } from "./services";

export const VIEW_TYPE_KB_BROWSE = "kb-browse-view";

interface NavigationState {
  query: string;
  results: KBBookMetadata[];
  startRecord: number;
  hasMoreResults: boolean;
  scrollPosition: number;
}

export class KBBrowseView extends ItemView {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  coverDownloadService: CoverDownloadService;
  bookNoteCreatorService: BookNoteCreatorService;
  results: KBBookMetadata[] = [];
  createdBooks: Set<string> = new Set();
  currentQuery: string = "";
  currentStartRecord: number = 1;
  hasMoreResults: boolean = true;
  isLoading: boolean = false;
  navigationHistory: NavigationState[] = [];
  resultsContainerEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: KBKinderboekenPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);

    // Initialize services
    this.coverDownloadService = new CoverDownloadService(
      this.app,
      this.apiClient,
      this.templateEngine,
      plugin.settings
    );
    this.bookNoteCreatorService = new BookNoteCreatorService(
      this.app,
      this.templateEngine,
      this.templateReader,
      this.coverDownloadService,
      plugin.settings
    );
  }

  getViewType() {
    return VIEW_TYPE_KB_BROWSE;
  }

  getDisplayText() {
    return "Browse Books";
  }

  getIcon() {
    return "book-open";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("kb-browse-view");

    // Header
    const header = container.createDiv("kb-browse-header");
    const headerTitle = header.createDiv("kb-browse-header-title");
    
    // Back button (initially hidden)
    const backBtn = headerTitle.createEl("button", {
      text: "← Back",
      cls: "kb-browse-back-btn",
    });
    backBtn.style.display = "none";
    backBtn.onclick = () => this.navigateBack();
    
    headerTitle.createEl("h2", { text: "Browse & Explore Books" });

    // Search container
    const searchContainer = container.createDiv("kb-browse-search");
    let searchInput: any;

    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new Notice("Please enter a search query");
        return;
      }

      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching...", cls: "kb-searching" });

      await this.searchAndDisplay(query, resultsContainer);
    };

    new Setting(searchContainer)
      .setName("Search")
      .addText((text) => {
        searchInput = text;
        text
          .setPlaceholder("Search for books...")
          .onChange(() => {});

        text.inputEl.addEventListener("keydown", async (event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            await performSearch();
          }
        });
      })
      .addButton((button) =>
        button
          .setButtonText("Search")
          .setCta()
          .onClick(async () => {
            await performSearch();
          })
      );

    // Results container
    const resultsContainer = container.createDiv("kb-browse-results");
    this.resultsContainerEl = resultsContainer;
    resultsContainer.createEl("p", {
      text: "Enter a search query to browse books",
      cls: "kb-browse-hint",
    });

    // Auto-focus search
    setTimeout(() => {
      if (searchInput && searchInput.inputEl) {
        searchInput.inputEl.focus();
      }
    }, 100);
  }

  async searchAndDisplay(query: string, container: HTMLElement, append: boolean = false) {
    try {
      if (!append) {
        // New search - reset state
        this.currentQuery = query;
        this.currentStartRecord = 1;
        this.results = [];
        this.hasMoreResults = true;
      }

      this.isLoading = true;
      console.log("[KB Plugin] Browse search:", query, "startRecord:", this.currentStartRecord);
      
      const batchSize = 50;
      const newResults = await this.apiClient.searchBooks(query, batchSize, this.currentStartRecord);
      console.log("[KB Plugin] Found", newResults.length, "new results");

      if (newResults.length < batchSize) {
        this.hasMoreResults = false;
      }

      if (this.plugin.settings.enrichFromBol && newResults.length > 0) {
        console.log("[KB Plugin] Enriching results from Bol.com...");
        const enrichedResults = await Promise.all(
          newResults.map(async (book) => {
            try {
              return await this.apiClient.enrichFromBol(book);
            } catch (error) {
              console.error("[KB Plugin] Error enriching book:", error);
              return book;
            }
          })
        );
        this.results.push(...enrichedResults);
      } else {
        this.results.push(...newResults);
      }

      this.currentStartRecord += newResults.length;
      this.isLoading = false;
      this.displayResults(container);
    } catch (error) {
      console.error("[KB Plugin] Browse search error:", error);
      this.isLoading = false;
      container.empty();
      container.createEl("p", {
        text: "An error occurred while searching. Please try again.",
        cls: "kb-error",
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
      cls: "kb-browse-count",
    });

    const gridContainer = container.createDiv("kb-browse-grid");

    this.results.forEach((book) => {
      const card = gridContainer.createDiv("kb-browse-card");

      const isCreated = this.createdBooks.has(book.isbn || book.title);
      if (isCreated) {
        card.addClass("kb-browse-card-created");
      }

      // Cover thumbnail
      const coverContainer = card.createDiv("kb-browse-cover");
      if (book.coverUrl) {
        console.log(`[KB Plugin] Cover URL for "${book.title}":`, book.coverUrl);
        const img = coverContainer.createEl("img", {
          attr: {
            src: book.coverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });
        
        // Handle image load errors - show placeholder on failure
        img.onerror = () => {
          console.log(`[KB Plugin] Cover failed to load for "${book.title}":`, book.coverUrl);
          coverContainer.empty();
          coverContainer.addClass("kb-browse-cover-placeholder");
          const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
          placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        };
        
        img.onload = () => {
          // Check if image is too small (likely a placeholder from Open Library)
          if (img.naturalWidth < 50 || img.naturalHeight < 50) {
            console.log(`[KB Plugin] Cover too small (${img.naturalWidth}x${img.naturalHeight}), showing placeholder for "${book.title}"`);
            coverContainer.empty();
            coverContainer.addClass("kb-browse-cover-placeholder");
            const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
            placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
          } else {
            console.log(`[KB Plugin] Cover loaded successfully for "${book.title}" (${img.naturalWidth}x${img.naturalHeight})`);
          }
        };
      } else {
        console.log(`[KB Plugin] No cover URL for "${book.title}"`);
        coverContainer.addClass("kb-browse-cover-placeholder");
        const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      }

      const info = card.createDiv("kb-browse-info");

      info.createEl("h3", { text: book.title, cls: "kb-browse-title" });

      if (book.authors && book.authors.length > 0) {
        const authorContainer = info.createEl("p", {
          cls: "kb-browse-author",
        });
        
        book.authors.forEach((author, index) => {
          const authorLink = authorContainer.createEl("a", {
            text: author,
            cls: "kb-browse-author-link",
          });
          authorLink.onclick = (e) => {
            e.stopPropagation(); // Prevent card click
            this.searchByAuthor(author);
          };
          
          if (index < book.authors.length - 1) {
            authorContainer.appendText(", ");
          }
        });
      }

      const details: string[] = [];
      if (book.publisher) details.push(book.publisher);
      if (book.publishYear) details.push(book.publishYear);
      if (details.length > 0) {
        info.createEl("p", {
          text: details.join(" • "),
          cls: "kb-browse-publisher",
        });
      }

      if (book.description) {
        const desc = book.description.substring(0, 150);
        info.createEl("p", {
          text: desc + (book.description.length > 150 ? "..." : ""),
          cls: "kb-browse-description",
        });
      }

      // Make entire card clickable
      card.style.cursor = "pointer";
      card.onclick = () => {
        const modal = new BookDetailModal(
          this.plugin,
          book,
          this.apiClient,
          () => {
            // On note created callback
            this.createdBooks.add(book.isbn || book.title);
            card.addClass("kb-browse-card-created");
          },
          (authorName: string) => {
            // On author clicked callback
            modal.close();
            this.searchByAuthor(authorName);
          },
          (subjects: string[]) => {
            // On subjects search callback
            modal.close();
            this.searchBySubjects(subjects);
          },
          (uri: string, type: 'creator' | 'subject' | 'series') => {
            // On linked data URI search callback
            modal.close();
            this.searchByLinkedDataUri(uri, type);
          }
        );
        modal.open();
      };
    });

    // Add "Load More" button if there are more results
    if (this.hasMoreResults && !this.isLoading) {
      const loadMoreContainer = container.createDiv("kb-browse-load-more");
      const loadMoreBtn = loadMoreContainer.createEl("button", {
        text: "Load More Results",
        cls: "kb-browse-load-more-btn",
      });

      loadMoreBtn.onclick = async () => {
        await this.searchAndDisplay(this.currentQuery, container, true);
      };
    }

    // Show loading indicator
    if (this.isLoading) {
      const loadingContainer = container.createDiv("kb-browse-loading");
      loadingContainer.createEl("p", { text: "Loading more results...", cls: "kb-searching" });
    }
  }

  async createBookNote(metadata: KBBookMetadata) {
    try {
      await this.bookNoteCreatorService.createBookNote(metadata, {
        openFile: false, // Don't open file in browse view
        runTemplater: false, // Don't run templater in browse view
        showNotice: false, // Don't show notice (we log instead)
        showCoverSource: false,
      });

      console.log(`[KB Plugin] Note created: ${metadata.title}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }

  saveNavigationState() {
    if (this.currentQuery && this.results.length > 0) {
      this.navigationHistory.push({
        query: this.currentQuery,
        results: [...this.results],
        startRecord: this.currentStartRecord,
        hasMoreResults: this.hasMoreResults,
        scrollPosition: this.resultsContainerEl?.scrollTop || 0,
      });
    }
  }

  navigateBack() {
    const prevState = this.navigationHistory.pop();
    if (prevState && this.resultsContainerEl) {
      this.currentQuery = prevState.query;
      this.results = prevState.results;
      this.currentStartRecord = prevState.startRecord;
      this.hasMoreResults = prevState.hasMoreResults;
      this.displayResults(this.resultsContainerEl);
      
      // Restore scroll position
      setTimeout(() => {
        if (this.resultsContainerEl) {
          this.resultsContainerEl.scrollTop = prevState.scrollPosition;
        }
      }, 50);
      
      // Update back button visibility
      this.updateBackButtonVisibility();
    }
  }

  updateBackButtonVisibility() {
    const backBtn = this.containerEl.querySelector(".kb-browse-back-btn") as HTMLElement;
    if (backBtn) {
      backBtn.style.display = this.navigationHistory.length > 0 ? "inline-block" : "none";
    }
  }

  async searchByAuthor(authorName: string) {
    if (!this.resultsContainerEl) return;
    
    // Save current state before navigating
    this.saveNavigationState();
    
    // Perform author search
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", { text: "Searching...", cls: "kb-searching" });
    
    await this.searchAndDisplay(authorName, this.resultsContainerEl);
    
    // Update back button visibility
    this.updateBackButtonVisibility();
  }

  async searchBySubjects(subjects: string[]) {
    if (!this.resultsContainerEl) return;
    
    // Save current state before navigating
    this.saveNavigationState();
    
    // Build query for multiple subjects (using AND logic with 'all' for partial matching)
    // Escape quotes in subject values
    const escapedSubjects = subjects.map(s => s.replace(/"/g, '\\"'));
    const subjectQuery = escapedSubjects.map(s => `dc.subject all "${s}"`).join(" AND ");
    
    console.log("[KB Plugin] Searching by subjects:", subjects);
    console.log("[KB Plugin] CQL Query:", subjectQuery);
    
    // Perform subjects search
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", { text: `Searching for books with ${subjects.length} subject${subjects.length > 1 ? "s" : ""}...`, cls: "kb-searching" });
    
    await this.searchAndDisplay(subjectQuery, this.resultsContainerEl);
    
    // Update back button visibility
    this.updateBackButtonVisibility();
  }

  async searchByLinkedDataUri(uri: string, type: 'creator' | 'subject' | 'series') {
    if (!this.resultsContainerEl) return;
    
    // Save current state before navigating
    this.saveNavigationState();
    
    // Build query for linked data URI search
    let query = '';
    const label = uri.split('/').pop() || 'Unknown';
    
    // For now, we'll extract the ID and search by that
    // In Phase 3, we'll implement direct URI-based search
    if (type === 'creator') {
      // Try to find books by this creator
      query = label; // Fallback to label search for now
    } else if (type === 'subject') {
      query = label; // Fallback to label search for now
    } else if (type === 'series') {
      query = label; // Fallback to label search for now
    }
    
    // Perform search
    this.resultsContainerEl.empty();
    this.resultsContainerEl.createEl("p", { 
      text: `Searching by ${type} URI...`, 
      cls: "kb-searching" 
    });
    
    await this.searchAndDisplay(query, this.resultsContainerEl);
    
    // Update back button visibility
    this.updateBackButtonVisibility();
  }

  async onClose() {
    // Cleanup if needed
  }
}
