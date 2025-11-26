import { ItemView, WorkspaceLeaf, Notice, Setting } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { BookDetailModal } from "./book-detail-modal";
import { CoverDownloadService, BookNoteCreatorService } from "./services";
import { SearchSuggester } from "./search/SearchSuggester";
import { SearchSuggestionsUI } from "./components/SearchSuggestionsUI";
import { FacetedSearch } from "./search/FacetedSearch";
import { FacetPanel } from "./components/FacetPanel";
import { VIEW_TYPE_KB_GRAPH } from "./graph/GraphView";
import type { KBGraphView } from "./graph/GraphView";

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
  private suggester: SearchSuggester;
  private suggestionsUI: SearchSuggestionsUI | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private facetedSearch: FacetedSearch | null = null;
  private facetPanel: FacetPanel | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: KBKinderboekenPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch,
      plugin.settings.enableLinkedDataEnrichment,
      plugin.settings.enableWikidataEnrichment
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

    this.suggester = new SearchSuggester();
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

    // Create two-column layout
    const layout = container.createDiv('kb-browse-with-facets');

    // Left: Facet panel
    const facetContainer = layout.createDiv();
    this.facetPanel = new FacetPanel(
      facetContainer,
      (facetId, value) => this.handleFacetChange(facetId, value),
      () => this.handleClearFacets()
    );

    // Right: Main content
    const mainContainer = layout.createDiv('kb-browse-main');
    mainContainer.addClass("kb-browse-view");

    // Header
    const header = mainContainer.createDiv("kb-browse-header");
    const headerTitle = header.createDiv("kb-browse-header-title");

    // Back button (initially hidden)
    const backBtn = headerTitle.createEl("button", {
      text: "← Back",
      cls: "kb-browse-back-btn",
    });
    backBtn.style.display = "none";
    backBtn.onclick = () => this.navigateBack();

    headerTitle.createEl("h2", { text: "Browse & Explore Books" });

    // Explore Graph button
    const graphBtn = headerTitle.createEl("button", {
      text: "📊 Explore Graph",
      cls: "kb-graph-toggle-btn",
    });
    graphBtn.onclick = () => this.openGraphView();

    // Search container (with suggestions)
    const searchContainer = mainContainer.createDiv("kb-browse-search");
    searchContainer.style.position = "relative";
    let searchInput: any;

    const performSearch = async () => {
      const query = searchInput.getValue().trim();
      if (!query) {
        new Notice("Please enter a search query");
        return;
      }

      // Hide suggestions
      if (this.suggestionsUI) {
        this.suggestionsUI.hide();
      }

      // Save search to recent history
      this.suggester.saveSearch(query);

      resultsContainer.empty();
      resultsContainer.createEl("p", { text: "Searching...", cls: "kb-searching" });

      await this.searchAndDisplay(query, resultsContainer);
    };

    // Initialize suggestions UI
    this.suggestionsUI = new SearchSuggestionsUI(
      searchContainer,
      (suggestion) => {
        searchInput.setValue(suggestion.text);
        this.suggestionsUI?.hide();
        performSearch();
      }
    );

    new Setting(searchContainer)
      .setName("Search")
      .addText((text) => {
        searchInput = text;
        text
          .setPlaceholder("Search for books...")
          .onChange(async (value) => {
            // Debounced suggestions
            if (this.debounceTimer) {
              clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
              if (value.trim().length >= 2) {
                const suggestions = await this.suggester.getSuggestions(value);
                this.suggestionsUI?.show(suggestions);
              } else if (value.trim().length === 0) {
                const suggestions = await this.suggester.getSuggestions("");
                this.suggestionsUI?.show(suggestions);
              } else {
                this.suggestionsUI?.hide();
              }
            }, 150); // Reduced from 300ms for faster response
          });

        text.inputEl.addEventListener("keydown", async (event: KeyboardEvent) => {
          // Handle suggestions navigation
          if (this.suggestionsUI?.isVisible()) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              this.suggestionsUI.navigateDown();
              return;
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              this.suggestionsUI.navigateUp();
              return;
            } else if (event.key === "Escape") {
              event.preventDefault();
              this.suggestionsUI.hide();
              return;
            } else if (event.key === "Enter") {
              if (this.suggestionsUI.selectCurrent()) {
                event.preventDefault();
                return;
              }
            }
          }

          // Normal enter behavior
          if (event.key === "Enter") {
            event.preventDefault();
            await performSearch();
          }
        });

        // Hide suggestions on blur
        text.inputEl.addEventListener("blur", () => {
          setTimeout(() => {
            this.suggestionsUI?.hide();
          }, 200);
        });

        // Show suggestions on focus
        text.inputEl.addEventListener("focus", async () => {
          const value = searchInput.getValue();
          if (value.trim().length >= 2) {
            const suggestions = await this.suggester.getSuggestions(value);
            this.suggestionsUI?.show(suggestions);
          } else if (value.trim().length === 0) {
            const suggestions = await this.suggester.getSuggestions("");
            this.suggestionsUI?.show(suggestions);
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
    const resultsContainer = mainContainer.createDiv("kb-browse-results");
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

  private handleFacetChange(facetId: string, value: string): void {
    if (!this.facetedSearch) return;

    // Toggle facet
    this.facetedSearch.toggleFacet(facetId, value);

    // Rebuild facets with new counts
    const facets = this.facetedSearch.buildFacets();
    const activeFacets = this.facetedSearch.getActiveFacets();

    // Re-render panel
    this.facetPanel?.render(facets, activeFacets);

    // Update results display
    this.displayFilteredResults(this.resultsContainerEl);

    // Update count
    const filtered = this.facetedSearch.getFilteredResults();
    this.facetPanel?.updateResultCount(filtered.length, this.results.length);
  }

  private handleClearFacets(): void {
    if (!this.facetedSearch) return;

    // Clear all filters
    this.facetedSearch.clearAllFacets();

    // Rebuild and re-render
    const facets = this.facetedSearch.buildFacets();
    this.facetPanel?.render(facets, []);

    // Show all results
    this.displayFilteredResults(this.resultsContainerEl);

    // Update count
    this.facetPanel?.updateResultCount(this.results.length, this.results.length);
  }

  private displayFilteredResults(container: HTMLElement | null): void {
    if (!container || !this.facetedSearch) return;

    // Get filtered results
    const filtered = this.facetedSearch.getFilteredResults();

    // Clear and display
    container.empty();

    if (filtered.length === 0) {
      container.createEl("p", { text: "No results match the selected filters", cls: "kb-no-results" });
      return;
    }

    container.createEl("p", {
      text: `Showing ${filtered.length} of ${this.results.length} result(s)`,
      cls: "kb-browse-count",
    });

    const gridContainer = container.createDiv("kb-browse-grid");

    filtered.forEach((book) => {
      this.renderBookCard(gridContainer, book);
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

      // Initialize or update faceted search
      if (!append) {
        // New search - initialize faceted search
        this.facetedSearch = new FacetedSearch(this.results);

        // Build and render facets
        const facets = this.facetedSearch.buildFacets();
        const activeFacets = this.facetedSearch.getActiveFacets();
        this.facetPanel?.render(facets, activeFacets);

        // Update result count
        this.facetPanel?.updateResultCount(this.results.length, this.results.length);
      } else {
        // Appending results - update faceted search with new full result set
        this.facetedSearch = new FacetedSearch(this.results);

        // Rebuild facets with updated counts
        const facets = this.facetedSearch.buildFacets();
        const activeFacets = this.facetedSearch.getActiveFacets();
        this.facetPanel?.render(facets, activeFacets);

        // Update result count
        const filtered = this.facetedSearch.getFilteredResults();
        this.facetPanel?.updateResultCount(filtered.length, this.results.length);
      }

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

  private renderBookCard(gridContainer: HTMLElement, book: KBBookMetadata): void {
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

    // Smart badges for linked data status
    const badgesContainer = info.createDiv("kb-browse-badges");

    // [LD] badge - Full linked data available
    const hasLinkedData = book.linkedData && (
      (book.linkedData.creators && book.linkedData.creators.length > 0) ||
      (book.linkedData.subjects && book.linkedData.subjects.length > 0) ||
      (book.linkedData.series && book.linkedData.series.length > 0)
    );
    if (hasLinkedData) {
      const ldBadge = badgesContainer.createEl("span", {
        text: "LD",
        cls: "kb-badge kb-badge-linked-data",
      });
      ldBadge.setAttribute("title", "Linked data available");
    }

    // [W] badge - Wikidata enrichable (has authors)
    if (book.authors && book.authors.length > 0) {
      const wBadge = badgesContainer.createEl("span", {
        text: "W",
        cls: "kb-badge kb-badge-wikidata",
      });
      wBadge.setAttribute("title", "Wikidata enrichment available");
    }

    // [📚] badge - Part of series
    if (book.series) {
      const seriesBadge = badgesContainer.createEl("span", {
        text: "📚",
        cls: "kb-badge kb-badge-series",
      });
      seriesBadge.setAttribute("title", `Part of series: ${book.series}`);
    }

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

    // Linked data statistics status bar
    const linkedDataCount = this.results.filter(book =>
      book.linkedData && (
        (book.linkedData.creators && book.linkedData.creators.length > 0) ||
        (book.linkedData.subjects && book.linkedData.subjects.length > 0) ||
        (book.linkedData.series && book.linkedData.series.length > 0)
      )
    ).length;

    const wikidataCount = this.results.filter(book =>
      book.authors && book.authors.length > 0
    ).length;

    if (this.results.length > 0) {
      const statsBar = container.createDiv("kb-browse-stats-bar");

      // Linked data stat
      if (linkedDataCount > 0) {
        statsBar.createEl("span", {
          text: `${linkedDataCount} with linked data`,
          cls: "kb-browse-stat kb-browse-stat-ld",
        });
      }

      // Wikidata stat
      if (wikidataCount > 0) {
        statsBar.createEl("span", {
          text: `${wikidataCount} with Wikidata`,
          cls: "kb-browse-stat kb-browse-stat-wikidata",
        });
      }
    }

    const gridContainer = container.createDiv("kb-browse-grid");

    this.results.forEach((book) => {
      this.renderBookCard(gridContainer, book);
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
    // Cleanup suggestions UI
    if (this.suggestionsUI) {
      this.suggestionsUI.destroy();
      this.suggestionsUI = null;
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Cleanup facets
    if (this.facetPanel) {
      this.facetPanel.destroy();
      this.facetPanel = null;
    }
    this.facetedSearch = null;
  }

  /**
   * Open graph view with current search results
   */
  async openGraphView(): Promise<void> {
    if (this.results.length === 0) {
      new Notice("Please search for books first");
      return;
    }

    // Find or create graph view
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_KB_GRAPH);

    let leaf: WorkspaceLeaf;
    if (leaves.length > 0) {
      // Reuse existing graph view
      leaf = leaves[0];
    } else {
      // Create new graph view in split
      leaf = this.app.workspace.getLeaf('split', 'vertical');
      await leaf.setViewState({
        type: VIEW_TYPE_KB_GRAPH,
        active: true,
      });
    }

    // Reveal the leaf
    this.app.workspace.revealLeaf(leaf);

    // Load graph with current results
    const graphView = leaf.view as KBGraphView;
    if (graphView && graphView.loadFromResults) {
      await graphView.loadFromResults(this.results);
    }
  }
}
