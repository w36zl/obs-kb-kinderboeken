import { Modal, Notice } from "obsidian";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { KBApiClient } from "./api";
import { CoverDownloadService, BookNoteCreatorService } from "./services";

export class BookDetailModal extends Modal {
  plugin: KBKinderboekenPlugin;
  book: KBBookMetadata;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  apiClient: KBApiClient;
  coverDownloadService: CoverDownloadService;
  bookNoteCreatorService: BookNoteCreatorService;
  onNoteCreated: () => void;
  onAuthorClicked?: (authorName: string) => void;
  onSubjectsSearch?: (subjects: string[]) => void;
  selectedSubjects: Set<string> = new Set();

  constructor(
    plugin: KBKinderboekenPlugin,
    book: KBBookMetadata,
    apiClient: KBApiClient,
    onNoteCreated: () => void,
    onAuthorClicked?: (authorName: string) => void,
    onSubjectsSearch?: (subjects: string[]) => void
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.book = book;
    this.apiClient = apiClient;
    this.onNoteCreated = onNoteCreated;
    this.onAuthorClicked = onAuthorClicked;
    this.onSubjectsSearch = onSubjectsSearch;
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);

    // Initialize services
    this.coverDownloadService = new CoverDownloadService(
      this.app,
      apiClient,
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
      const authorContainer = infoSection.createEl("p", {
        cls: "kb-detail-author",
      });
      
      this.book.authors.forEach((author, index) => {
        if (this.onAuthorClicked) {
          const authorLink = authorContainer.createEl("a", {
            text: author,
            cls: "kb-detail-author-link",
          });
          authorLink.onclick = () => {
            if (this.onAuthorClicked) {
              this.onAuthorClicked(author);
            }
          };
        } else {
          authorContainer.appendText(author);
        }
        
        if (index < this.book.authors.length - 1) {
          authorContainer.appendText(", ");
        }
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

    // Subjects with multi-select capability
    if (this.book.subjects && this.book.subjects.length > 0) {
      const subjectSection = infoSection.createDiv("kb-detail-subjects-section");
      
      const subjectHeader = subjectSection.createDiv("kb-detail-subjects-header");
      subjectHeader.createEl("h3", { text: "Subjects" });
      
      if (this.onSubjectsSearch) {
        const hint = subjectHeader.createEl("span", {
          text: "Click to select subjects",
          cls: "kb-detail-subjects-hint",
        });
      }
      
      const subjectTags = subjectSection.createDiv("kb-detail-subjects");
      this.book.subjects.slice(0, 10).forEach((subject) => {
        const tag = subjectTags.createEl("span", {
          text: subject,
          cls: "kb-detail-subject-tag",
        });
        
        if (this.onSubjectsSearch) {
          tag.addClass("kb-detail-subject-tag-selectable");
          tag.onclick = () => {
            if (this.selectedSubjects.has(subject)) {
              this.selectedSubjects.delete(subject);
              tag.removeClass("kb-detail-subject-tag-selected");
            } else {
              this.selectedSubjects.add(subject);
              tag.addClass("kb-detail-subject-tag-selected");
            }
            this.updateSubjectSearchButton();
          };
        }
      });
      
      // Add search button if callback is provided
      if (this.onSubjectsSearch) {
        const searchBtn = subjectSection.createEl("button", {
          text: "Search by selected subjects",
          cls: "kb-detail-subjects-search-btn",
        });
        searchBtn.style.display = "none"; // Hidden until subjects are selected
        searchBtn.onclick = () => {
          if (this.selectedSubjects.size > 0 && this.onSubjectsSearch) {
            this.onSubjectsSearch(Array.from(this.selectedSubjects));
          }
        };
      }
    }

    // Actions section
    const actionsSection = infoSection.createDiv("kb-detail-actions");

    // KB Link - use PPN for direct search on KB.nl, fallback to ISBN
    if (this.book.ppn) {
      const kbLink = actionsSection.createEl("a", {
        text: "View on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=12&TRM=ppn+${this.book.ppn}`,
          target: "_blank",
        },
      });
    } else if (this.book.isbn) {
      const kbLink = actionsSection.createEl("a", {
        text: "Search on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=7&TRM=${encodeURIComponent(this.book.isbn)}`,
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

  updateSubjectSearchButton() {
    const btn = this.contentEl.querySelector(".kb-detail-subjects-search-btn") as HTMLElement;
    if (btn) {
      if (this.selectedSubjects.size > 0) {
        btn.style.display = "block";
        btn.textContent = `Search by ${this.selectedSubjects.size} selected subject${this.selectedSubjects.size > 1 ? "s" : ""}`;
      } else {
        btn.style.display = "none";
      }
    }
  }

  async createBookNote() {
    try {
      await this.bookNoteCreatorService.createBookNote(this.book, {
        openFile: false, // Don't open file in detail modal
        runTemplater: false, // Don't run templater in detail modal
        showNotice: true,
        showCoverSource: false,
      });
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      throw error;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
