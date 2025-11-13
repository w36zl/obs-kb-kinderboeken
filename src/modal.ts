import { App, Modal, Notice, Setting } from "obsidian";
import { KBApiClient } from "./api";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";

export class BookSearchModal extends Modal {
  plugin: KBKinderboekenPlugin;
  apiClient: KBApiClient;
  results: KBBookMetadata[] = [];
  selectedBook: KBBookMetadata | null = null;
  initialQuery: string;

  constructor(app: App, plugin: KBKinderboekenPlugin, initialQuery = "") {
    super(app);
    this.plugin = plugin;
    this.apiClient = new KBApiClient();
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
    this.results = await this.apiClient.searchBooks(query, 20);
    this.displayResults(container);
  }

  async searchByISBN(isbn: string, container: HTMLElement) {
    const result = await this.apiClient.searchByISBN(isbn);
    this.results = result ? [result] : [];
    this.displayResults(container);
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
        this.selectedBook = book;
        await this.insertBookMetadata();
        this.close();
      };
    });
  }

  async insertBookMetadata() {
    if (!this.selectedBook) return;

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("No active file to insert metadata");
      return;
    }

    try {
      const metadata = this.selectedBook;
      const frontmatter = this.buildFrontmatter(metadata);

      // Read current file content
      const fileContent = await this.app.vault.read(activeFile);

      // Check if file already has frontmatter
      const hasFrontmatter = fileContent.startsWith("---");

      let newContent: string;
      if (hasFrontmatter) {
        // Replace existing frontmatter
        const endOfFrontmatter = fileContent.indexOf("---", 3);
        if (endOfFrontmatter !== -1) {
          const restOfContent = fileContent.substring(endOfFrontmatter + 3);
          newContent = frontmatter + restOfContent;
        } else {
          // Malformed frontmatter, append at beginning
          newContent = frontmatter + "\n" + fileContent;
        }
      } else {
        // Add frontmatter at the beginning
        newContent = frontmatter + "\n" + fileContent;
      }

      await this.app.vault.modify(activeFile, newContent);

      // Download cover if enabled
      if (this.plugin.settings.downloadCovers && metadata.coverUrl) {
        await this.downloadAndAttachCover(metadata, activeFile.basename);
      }

      new Notice("Book metadata inserted successfully!");
    } catch (error) {
      console.error("Error inserting metadata:", error);
      new Notice(`Error inserting metadata: ${error.message}`);
    }
  }

  buildFrontmatter(metadata: KBBookMetadata): string {
    const yaml: string[] = ["---"];

    yaml.push(`title: "${this.escapeYaml(metadata.title)}"`);

    if (metadata.authors && metadata.authors.length > 0) {
      if (metadata.authors.length === 1) {
        yaml.push(`author: "${this.escapeYaml(metadata.authors[0])}"`);
      } else {
        yaml.push("authors:");
        metadata.authors.forEach((author) => {
          yaml.push(`  - "${this.escapeYaml(author)}"`);
        });
      }
    } else if (this.plugin.settings.defaultAuthor) {
      yaml.push(`author: "${this.escapeYaml(this.plugin.settings.defaultAuthor)}"`);
    }

    if (metadata.isbn) yaml.push(`isbn: "${metadata.isbn}"`);
    if (metadata.publishYear) yaml.push(`publishYear: ${metadata.publishYear}`);
    if (metadata.publisher) yaml.push(`publisher: "${this.escapeYaml(metadata.publisher)}"`);
    if (metadata.language) yaml.push(`language: "${metadata.language}"`);
    if (metadata.series) yaml.push(`series: "${this.escapeYaml(metadata.series)}"`);
    if (metadata.pageCount) yaml.push(`pageCount: ${metadata.pageCount}`);
    if (metadata.targetAge) yaml.push(`targetAge: "${metadata.targetAge}"`);

    if (metadata.subjects && metadata.subjects.length > 0) {
      yaml.push("subjects:");
      metadata.subjects.forEach((subject) => {
        yaml.push(`  - "${this.escapeYaml(subject)}"`);
      });
    }

    if (metadata.description) {
      yaml.push(`description: "${this.escapeYaml(metadata.description)}"`);
    }

    yaml.push("---");

    return yaml.join("\n");
  }

  escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, " ");
  }

  async downloadAndAttachCover(metadata: KBBookMetadata, baseName: string) {
    if (!metadata.coverUrl) return;

    try {
      const coverData = await this.apiClient.downloadCover(metadata.coverUrl);
      if (!coverData) {
        new Notice("Could not download cover image");
        return;
      }

      const folder = this.plugin.settings.attachmentFolder;
      const fileName = `${baseName}-cover.jpg`;
      const filePath = `${folder}/${fileName}`;

      // Ensure folder exists
      const folderExists = await this.app.vault.adapter.exists(folder);
      if (!folderExists) {
        await this.app.vault.createFolder(folder);
      }

      // Save cover image
      await this.app.vault.adapter.writeBinary(filePath, coverData);

      new Notice(`Cover image saved to ${filePath}`);
    } catch (error) {
      console.error("Error downloading cover:", error);
      new Notice(`Could not save cover image: ${error.message}`);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
