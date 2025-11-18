import { ItemView, WorkspaceLeaf, Notice, Setting, TFile } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";

export const VIEW_TYPE_KB_BROWSE = "kb-browse-view";

export class KBBrowseView extends ItemView {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  results: KBBookMetadata[] = [];
  createdBooks: Set<string> = new Set();

  constructor(leaf: WorkspaceLeaf, plugin: KBKinderboekenPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.apiClient = new KBApiClient(
      plugin.settings.prioritizeChildrensBooks,
      plugin.settings.useFuzzySearch
    );
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);
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
    header.createEl("h2", { text: "Browse & Explore Books" });

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

  async searchAndDisplay(query: string, container: HTMLElement) {
    try {
      console.log("[KB Plugin] Browse search:", query);
      this.results = await this.apiClient.searchBooks(query, 20);
      console.log("[KB Plugin] Found", this.results.length, "results");

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
        const img = coverContainer.createEl("img", {
          attr: {
            src: book.coverUrl,
            alt: `Cover for ${book.title}`,
            loading: "lazy"
          }
        });
        
        // Handle image load errors - show placeholder on failure
        img.onerror = () => {
          coverContainer.empty();
          coverContainer.addClass("kb-browse-cover-placeholder");
          const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
          placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
        };
      } else {
        coverContainer.addClass("kb-browse-cover-placeholder");
        const placeholder = coverContainer.createDiv("kb-browse-cover-placeholder-icon");
        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
      }

      const info = card.createDiv("kb-browse-info");

      info.createEl("h3", { text: book.title, cls: "kb-browse-title" });

      if (book.authors && book.authors.length > 0) {
        info.createEl("p", {
          text: book.authors.join(", "),
          cls: "kb-browse-author",
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
          
          this.createdBooks.add(book.isbn || book.title);
          
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

  async createBookNote(metadata: KBBookMetadata) {
    try {
      console.log("[KB Plugin] Creating note for:", metadata.title);

      if (this.plugin.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.downloadAndAttachCover(metadata);
        if (coverPath) {
          metadata.localCoverImage = coverPath;
        }
      }

      const filename = this.templateEngine.renderFilename(
        this.plugin.settings.filenamePattern,
        metadata
      );

      const folderPath = this.plugin.settings.bookNotesFolder;

      const folderExists = await this.app.vault.adapter.exists(folderPath);
      if (!folderExists) {
        console.log("[KB Plugin] Creating folder:", folderPath);
        await this.app.vault.createFolder(folderPath);
      }

      const filePath = `${folderPath}/${filename}.md`;
      const fileExists = await this.app.vault.adapter.exists(filePath);

      let templateContent: string;
      if (this.plugin.settings.useTemplate && this.plugin.settings.templatePath) {
        const customTemplate = await this.templateReader.readTemplate(
          this.plugin.settings.templatePath
        );
        templateContent = customTemplate || this.templateReader.getDefaultTemplate();
      } else {
        templateContent = this.templateReader.getDefaultTemplate();
      }

      const renderedContent = this.templateEngine.render(templateContent, metadata);

      if (fileExists) {
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
        }
      } else {
        console.log("[KB Plugin] Creating new note:", filePath);
        await this.app.vault.create(filePath, renderedContent);
      }

      console.log(`[KB Plugin] Note created: ${filename}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }

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

      if (this.plugin.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }

      const isbnsToTry = metadata.allIsbns && metadata.allIsbns.length > 0
        ? metadata.allIsbns
        : [metadata.isbn].filter(Boolean) as string[];

      let coverData: ArrayBuffer | null = null;

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

      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      await this.app.vault.adapter.writeBinary(filePath, coverData);
      return filePath;
    } catch (error) {
      console.error("[KB Plugin] Error downloading cover:", error);
      return null;
    }
  }

  async onClose() {
    // Cleanup if needed
  }
}
