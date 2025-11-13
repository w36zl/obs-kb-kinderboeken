import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";

export class BookSearchModal extends Modal {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  results: KBBookMetadata[] = [];
  selectedBook: KBBookMetadata | null = null;
  initialQuery: string;

  constructor(app: App, plugin: KBKinderboekenPlugin, initialQuery = "") {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient();
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(app);
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
      })
      .addButton((button) =>
        button.setButtonText("Search").onClick(async () => {
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
        })
      );

    // Results container
    const resultsContainer = contentEl.createDiv("kb-results-container");
    resultsContainer.createEl("p", {
      text: "Enter a search query and click Search",
      cls: "kb-results-hint",
    });

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
      console.log("[KB Plugin] Creating note for:", this.selectedBook.title);
      const metadata = this.selectedBook;

      // Download cover first if enabled (so we have local path for template)
      if (this.plugin.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.downloadAndAttachCover(metadata, metadata.title);
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
      new Notice(`Error creating book note: ${error.message}`);
    }
  }


  /**
   * Run Templater plugin if it's installed in the vault
   */
  async runTemplaterIfAvailable(file: TFile): Promise<void> {
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

  async downloadAndAttachCover(metadata: KBBookMetadata, baseName: string): Promise<string | null> {
    if (!metadata.coverUrl) return null;

    try {
      const coverData = await this.apiClient.downloadCover(metadata.coverUrl);
      if (!coverData) {
        new Notice("Could not download cover image");
        return null;
      }

      const folder = this.plugin.settings.attachmentFolder;
      const sanitized = this.templateEngine.sanitizeFilename(baseName);
      const fileName = `${sanitized}-cover.jpg`;
      const filePath = `${folder}/${fileName}`;

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
      new Notice(`Could not save cover image: ${error.message}`);
      return null;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
