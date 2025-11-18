import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";

export class BrowseExploreModal extends Modal {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  results: KBBookMetadata[] = [];
  createdBooks: Set<string> = new Set(); // Track created book ISBNs

  constructor(app: App, plugin: KBKinderboekenPlugin) {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-browse-modal");

    // Header
    contentEl.createEl("h2", { text: "Browse & Explore Books" });

    // Search container
    const searchContainer = contentEl.createDiv("kb-browse-search");
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
          .onChange(() => {
            // Can add debounce here later
          });

        // Enter key to search
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
    const resultsContainer = contentEl.createDiv("kb-browse-results");
    resultsContainer.createEl("p", {
      text: "Enter a search query to browse books",
      cls: "kb-browse-hint",
    });

    // Auto-focus search
    setTimeout(() => {
      if (searchInput && searchInput.inputEl) {
        searchInput.inputEl.focus();
      }
    }, 50);
  }

  async searchAndDisplay(query: string, container: HTMLElement) {
    try {
      console.log("[KB Plugin] Browse search:", query);
      this.results = await this.apiClient.searchBooks(query, 20);
      console.log("[KB Plugin] Found", this.results.length, "results");

      // Enrich results with Bol.com metadata if enabled
      if (this.plugin.settings.enrichFromBol && this.results.length > 0) {
        console.log("[KB Plugin] Enriching results from Bol.com...");
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
      console.error("[KB Plugin] Browse search error:", error);
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

    // Grid of book cards
    const gridContainer = container.createDiv("kb-browse-grid");

    this.results.forEach((book) => {
      const card = gridContainer.createDiv("kb-browse-card");

      // Check if already created
      const isCreated = this.createdBooks.has(book.isbn || book.title);
      if (isCreated) {
        card.addClass("kb-browse-card-created");
      }

      // Cover indicator icon
      const hasCover = book.coverUrl ? true : false;
      const coverIndicator = card.createDiv("kb-browse-cover-indicator");
      if (hasCover) {
        coverIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><circle cx="12" cy="11" r="2"></circle><path d="m4.5 16.5 3.5-3.5 3.5 3.5 3.5-3.5 3.5 3.5"></path></svg>`;
        coverIndicator.setAttribute("title", "Cover available");
        coverIndicator.addClass("kb-has-cover");
      } else {
        coverIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        coverIndicator.setAttribute("title", "No cover");
        coverIndicator.addClass("kb-no-cover");
      }

      // Book info
      const info = card.createDiv("kb-browse-info");

      // Title
      info.createEl("h3", { text: book.title, cls: "kb-browse-title" });

      // Author
      if (book.authors && book.authors.length > 0) {
        info.createEl("p", {
          text: book.authors.join(", "),
          cls: "kb-browse-author",
        });
      }

      // Publisher & Year
      const details: string[] = [];
      if (book.publisher) details.push(book.publisher);
      if (book.publishYear) details.push(book.publishYear);
      if (details.length > 0) {
        info.createEl("p", {
          text: details.join(" • "),
          cls: "kb-browse-publisher",
        });
      }

      // Description
      if (book.description) {
        const desc = book.description.substring(0, 150);
        info.createEl("p", {
          text: desc + (book.description.length > 150 ? "..." : ""),
          cls: "kb-browse-description",
        });
      }

      // Create Note button
      const btnContainer = card.createDiv("kb-browse-actions");
      const createBtn = btnContainer.createEl("button", {
        text: isCreated ? "✓ Created" : "Create Note",
        cls: isCreated ? "kb-browse-btn-created" : "kb-browse-btn",
      });

      createBtn.onclick = async () => {
        if (isCreated) {
          new Notice("Book note already created");
          return;
        }

        try {
          await this.createBookNote(book);
          
          // Mark as created
          this.createdBooks.add(book.isbn || book.title);
          
          // Update button
          createBtn.textContent = "✓ Created";
          createBtn.removeClass("kb-browse-btn");
          createBtn.addClass("kb-browse-btn-created");
          card.addClass("kb-browse-card-created");
          
          new Notice(`Note created: ${book.title}`);
        } catch (error) {
          console.error("[KB Plugin] Error creating note:", error);
          new Notice("Failed to create note. Check console for details.");
        }
      };
    });
  }

  /**
   * Create book note (copied from BookSearchModal but stays in modal)
   */
  async createBookNote(metadata: KBBookMetadata) {
    try {
      console.log("[KB Plugin] Creating note for:", metadata.title);

      // Download cover first if enabled
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

      if (fileExists) {
        // File exists, update it
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
        }
      } else {
        // Create new file
        console.log("[KB Plugin] Creating new note:", filePath);
        await this.app.vault.create(filePath, renderedContent);
      }

      console.log(`[KB Plugin] Note created: ${filename}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }

  /**
   * Download and attach cover (simplified version)
   */
  async downloadAndAttachCover(metadata: KBBookMetadata): Promise<string | null> {
    if (!metadata.coverUrl) {
      return null;
    }

    try {
      const folder = this.plugin.settings.attachmentFolder;
      const fileName = this.templateEngine.renderFilename(
        this.plugin.settings.coverFilenamePattern,
        metadata
      );
      const filePath = `${folder}/${fileName}.jpg`;

      // Check for existing cover
      if (this.plugin.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }

      // Try to download cover
      const isbnsToTry = metadata.allIsbns && metadata.allIsbns.length > 0
        ? metadata.allIsbns
        : [metadata.isbn].filter(Boolean) as string[];

      let coverData: ArrayBuffer | null = null;

      // Try Open Library
      for (const isbn of isbnsToTry) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        coverData = await this.apiClient.downloadCover(coverUrl);
        if (coverData && coverData.byteLength > 1000) {
          break;
        }
      }

      if (!coverData) {
        return null;
      }

      // Ensure folder exists
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      // Save cover
      await this.app.vault.adapter.writeBinary(filePath, coverData);
      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      return null;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
