import { Modal, Notice, TFile } from "obsidian";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { KBApiClient } from "./api";

export class BookDetailModal extends Modal {
  plugin: KBKinderboekenPlugin;
  book: KBBookMetadata;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  apiClient: KBApiClient;
  onNoteCreated: () => void;

  constructor(
    plugin: KBKinderboekenPlugin,
    book: KBBookMetadata,
    apiClient: KBApiClient,
    onNoteCreated: () => void
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.book = book;
    this.apiClient = apiClient;
    this.onNoteCreated = onNoteCreated;
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("kb-book-detail-modal");

    // Cover with fade background effect
    const coverBg = contentEl.createDiv("kb-detail-cover-bg");
    if (this.book.coverUrl) {
      coverBg.style.backgroundImage = `url(${this.book.coverUrl})`;
    }

    // Main content container
    const mainContent = contentEl.createDiv("kb-detail-content");

    // Cover thumbnail
    const coverSection = mainContent.createDiv("kb-detail-cover-section");
    const coverContainer = coverSection.createDiv("kb-detail-cover");
    if (this.book.coverUrl) {
      const img = coverContainer.createEl("img", {
        attr: {
          src: this.book.coverUrl,
          alt: `Cover for ${this.book.title}`,
        },
      });
    } else {
      coverContainer.addClass("kb-detail-cover-placeholder");
      const placeholder = coverContainer.createDiv("kb-detail-cover-placeholder-icon");
      placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
    }

    // Info section
    const infoSection = mainContent.createDiv("kb-detail-info");

    // Title
    infoSection.createEl("h2", {
      text: this.book.title,
      cls: "kb-detail-title",
    });

    // Authors
    if (this.book.authors && this.book.authors.length > 0) {
      infoSection.createEl("p", {
        text: this.book.authors.join(", "),
        cls: "kb-detail-author",
      });
    }

    // Metadata grid
    const metaGrid = infoSection.createDiv("kb-detail-meta-grid");

    if (this.book.publisher) {
      this.addMetaItem(metaGrid, "Publisher", this.book.publisher);
    }

    if (this.book.publishYear) {
      this.addMetaItem(metaGrid, "Year", this.book.publishYear);
    }

    if (this.book.isbn) {
      this.addMetaItem(metaGrid, "ISBN", this.book.isbn);
    }

    if (this.book.series) {
      this.addMetaItem(metaGrid, "Series", this.book.series);
    }

    if (this.book.pageCount) {
      this.addMetaItem(metaGrid, "Pages", this.book.pageCount);
    }

    if (this.book.language) {
      this.addMetaItem(metaGrid, "Language", this.book.language);
    }

    // Description
    if (this.book.description) {
      const descSection = infoSection.createDiv("kb-detail-description-section");
      descSection.createEl("h3", { text: "Description" });
      descSection.createEl("p", {
        text: this.book.description,
        cls: "kb-detail-description",
      });
    }

    // Subjects
    if (this.book.subjects && this.book.subjects.length > 0) {
      const subjectSection = infoSection.createDiv("kb-detail-subjects-section");
      subjectSection.createEl("h3", { text: "Subjects" });
      const subjectTags = subjectSection.createDiv("kb-detail-subjects");
      this.book.subjects.slice(0, 10).forEach((subject) => {
        subjectTags.createEl("span", {
          text: subject,
          cls: "kb-detail-subject-tag",
        });
      });
    }

    // Actions section
    const actionsSection = infoSection.createDiv("kb-detail-actions");

    // KB Link
    if (this.book.identifier) {
      const kbLink = actionsSection.createEl("a", {
        text: "View on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=1016&SRT=YOP&TRM=${encodeURIComponent(this.book.identifier)}`,
          target: "_blank",
        },
      });
    }

    // Create Note button
    const createBtn = actionsSection.createEl("button", {
      text: "Create Note",
      cls: "kb-detail-create-btn",
    });

    createBtn.onclick = async () => {
      createBtn.disabled = true;
      createBtn.textContent = "Creating...";

      try {
        await this.createBookNote();
        createBtn.textContent = "✓ Note Created";
        createBtn.addClass("kb-detail-btn-success");
        this.onNoteCreated();

        setTimeout(() => {
          this.close();
        }, 1000);
      } catch (error) {
        console.error("[KB Plugin] Error creating note:", error);
        new Notice("Failed to create note. Check console for details.");
        createBtn.disabled = false;
        createBtn.textContent = "Create Note";
      }
    };
  }

  addMetaItem(container: HTMLElement, label: string, value: string) {
    const item = container.createDiv("kb-detail-meta-item");
    item.createEl("span", { text: label, cls: "kb-detail-meta-label" });
    item.createEl("span", { text: value, cls: "kb-detail-meta-value" });
  }

  async createBookNote() {
    try {
      console.log("[KB Plugin] Creating note for:", this.book.title);

      if (this.plugin.settings.downloadCovers && this.book.coverUrl) {
        const coverPath = await this.downloadAndAttachCover();
        if (coverPath) {
          this.book.localCoverImage = coverPath;
        }
      }

      const filename = this.templateEngine.renderFilename(
        this.plugin.settings.filenamePattern,
        this.book
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

      const renderedContent = this.templateEngine.render(templateContent, this.book);

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

      new Notice(`Note created: ${this.book.title}`);
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }

  async downloadAndAttachCover(): Promise<string | null> {
    if (!this.book.coverUrl) {
      return null;
    }

    try {
      const folder = this.plugin.settings.attachmentFolder;
      const fileName = this.templateEngine.renderFilename(
        this.plugin.settings.coverFilenamePattern,
        this.book
      );
      const filePath = `${folder}/${fileName}.jpg`;

      if (this.plugin.settings.deduplicateCovers) {
        const exists = await this.app.vault.adapter.exists(filePath);
        if (exists) {
          console.log(`[KB Plugin] Cover already exists: ${filePath}`);
          return filePath;
        }
      }

      console.log(`[KB Plugin] Downloading cover from: ${this.book.coverUrl}`);
      let coverData = await this.apiClient.downloadCover(this.book.coverUrl);

      if (!coverData || coverData.byteLength < 1000) {
        console.log(`[KB Plugin] Primary cover download failed, trying Open Library fallbacks...`);
        const isbnsToTry = this.book.allIsbns && this.book.allIsbns.length > 0
          ? this.book.allIsbns
          : [this.book.isbn].filter(Boolean) as string[];

        for (const isbn of isbnsToTry) {
          const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          console.log(`[KB Plugin] Trying Open Library with ISBN: ${isbn}`);
          coverData = await this.apiClient.downloadCover(coverUrl);
          if (coverData && coverData.byteLength > 1000) {
            console.log(`[KB Plugin] ✅ Cover downloaded successfully (${coverData.byteLength} bytes)`);
            break;
          }
        }
      } else {
        console.log(`[KB Plugin] ✅ Cover downloaded successfully (${coverData.byteLength} bytes)`);
      }

      if (!coverData || coverData.byteLength < 1000) {
        console.log(`[KB Plugin] ❌ No valid cover found to download`);
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

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
