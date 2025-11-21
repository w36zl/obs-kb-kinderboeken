import { Modal, Notice } from "obsidian";
import { KBBookMetadata } from "./types";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { KBApiClient } from "./api";
import { CoverDownloadService, BookNoteCreatorService, WikidataApiClient, WikidataAuthorInfo, WikidataCharacterInfo } from "./services";

export class BookDetailModal extends Modal {
  plugin: KBKinderboekenPlugin;
  book: KBBookMetadata;
  templateEngine: TemplateEngine;
  templateReader: TemplateReader;
  apiClient: KBApiClient;
  wikidataClient: WikidataApiClient;
  coverDownloadService: CoverDownloadService;
  bookNoteCreatorService: BookNoteCreatorService;
  onNoteCreated: () => void;
  onAuthorClicked?: (authorName: string) => void;
  onSubjectsSearch?: (subjects: string[]) => void;
  onLinkedDataUriSearch?: (uri: string, type: 'creator' | 'subject' | 'series') => void;
  selectedSubjects: Set<string> = new Set();
  wikidataAuthorInfo?: WikidataAuthorInfo | null;
  wikidataCharacterInfo?: WikidataCharacterInfo | null;

  constructor(
    plugin: KBKinderboekenPlugin,
    book: KBBookMetadata,
    apiClient: KBApiClient,
    onNoteCreated: () => void,
    onAuthorClicked?: (authorName: string) => void,
    onSubjectsSearch?: (subjects: string[]) => void,
    onLinkedDataUriSearch?: (uri: string, type: 'creator' | 'subject' | 'series') => void
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.book = book;
    this.apiClient = apiClient;
    this.onNoteCreated = onNoteCreated;
    this.onAuthorClicked = onAuthorClicked;
    this.onSubjectsSearch = onSubjectsSearch;
    this.onLinkedDataUriSearch = onLinkedDataUriSearch;
    this.templateEngine = new TemplateEngine();
    this.templateReader = new TemplateReader(this.app);
    this.wikidataClient = new WikidataApiClient();

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

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("kb-book-detail-modal");

    // Debug: Check if linked data is available
    console.log("[KB Plugin] Opening detail modal for:", this.book.title);
    console.log("[KB Plugin] Book has PPN:", this.book.ppn);
    console.log("[KB Plugin] Book has linkedData:", !!this.book.linkedData);
    if (this.book.linkedData) {
      console.log("[KB Plugin] Linked data:", this.book.linkedData);
    }

    // Enrich with Wikidata information
    await this.enrichWithWikidata();

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
      coverContainer.createEl("img", {
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

          // Add hover tooltip for author
          this.addAuthorTooltip(authorLink, author);
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
        subjectHeader.createEl("span", {
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

        // Add hover tooltip for subject
        this.addSubjectTooltip(tag, subject);

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

    // Linked Data section - Show enriched information from data.bibliotheken.nl
    if (this.book.linkedData && ((this.book.linkedData.creators && this.book.linkedData.creators.length > 0) || (this.book.linkedData.subjects && this.book.linkedData.subjects.length > 0) || (this.book.linkedData.series && this.book.linkedData.series.length > 0))) {
      const linkedDataSection = infoSection.createDiv("kb-detail-linked-data-section");
      linkedDataSection.createEl("h3", { text: "Linked Data" });
      
      linkedDataSection.createEl("p", {
        text: "Enriched information from data.bibliotheken.nl - click to explore",
        cls: "kb-detail-linked-data-hint",
      });

      // Creators (Authors) with URIs - Enhanced with Wikidata profiles
      if (this.book.linkedData.creators && this.book.linkedData.creators.length > 0) {
        console.log("[KB Plugin] Rendering creators:", this.book.linkedData.creators);
        
        const creatorsContainer = linkedDataSection.createDiv("kb-detail-linked-creators");
        creatorsContainer.createEl("h4", { text: "Creators", cls: "kb-detail-linked-subtitle" });
        
        const creatorsGrid = creatorsContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.creators.forEach((creator) => {
          console.log("[KB Plugin] Creator wikidataProfile:", creator.wikidataProfile);
          const creatorCard = creatorsGrid.createDiv("kb-detail-linked-card");
          
          // Show Wikidata author photo if available
          if (creator.wikidataProfile && creator.wikidataProfile.imageUrl) {
            const authorImage = creatorCard.createDiv("kb-detail-wikidata-author-image");
            authorImage.createEl("img", {
              attr: {
                src: creator.wikidataProfile.imageUrl,
                alt: `Photo of ${creator.label}`,
              },
            });
          }
          
          const creatorInfo = creatorCard.createDiv("kb-detail-wikidata-author-info");
          
          const creatorHeader = creatorInfo.createDiv("kb-detail-linked-card-header");
          creatorHeader.createEl("span", {
            text: creator.label || "Unknown Creator",
            cls: "kb-detail-linked-label",
          });
          
          // Prefer Wikidata dates if available
          const birthDate = creator.wikidataProfile?.birthDate || creator.birthDate;
          const deathDate = creator.wikidataProfile?.deathDate || creator.deathDate;
          
          if (birthDate || deathDate) {
            creatorInfo.createEl("p", {
              text: `${birthDate || '?'} - ${deathDate || 'present'}`,
              cls: "kb-detail-linked-dates",
            });
          }
          
          // Show occupation if available from Wikidata
          if (creator.wikidataProfile?.occupation && creator.wikidataProfile.occupation.length > 0) {
            creatorInfo.createEl("p", {
              text: creator.wikidataProfile.occupation.join(", "),
              cls: "kb-detail-wikidata-occupation",
            });
          }
          
          // Prefer Wikidata description if available
          const description = creator.wikidataProfile?.description || creator.description;
          if (description) {
            creatorInfo.createEl("p", {
              text: description,
              cls: "kb-detail-linked-description",
            });
          }
          
          const creatorActions = creatorCard.createDiv("kb-detail-linked-actions");
          
          const searchBtn = creatorActions.createEl("button", {
            text: "Find all books",
            cls: "kb-detail-linked-btn",
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(creator.uri, 'creator');
            }
          };
          
          creatorActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: creator.uri,
              target: "_blank",
            },
          });
          
          // Add Wikipedia link if available from Wikidata profile
          if (creator.wikidataProfile?.wikipediaUrl) {
            creatorActions.createEl("a", {
              text: "Wikipedia",
              cls: "kb-detail-wikidata-wiki-link",
              attr: {
                href: creator.wikidataProfile.wikipediaUrl,
                target: "_blank",
              },
            });
          }
        });
      }

      // Subjects with URIs
      if (this.book.linkedData.subjects && this.book.linkedData.subjects.length > 0) {
        const subjectsContainer = linkedDataSection.createDiv("kb-detail-linked-subjects");
        subjectsContainer.createEl("h4", { text: "Subject URIs", cls: "kb-detail-linked-subtitle" });
        
        const subjectsGrid = subjectsContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.subjects.forEach((subject) => {
          const subjectCard = subjectsGrid.createDiv("kb-detail-linked-card");
          
          const subjectHeader = subjectCard.createDiv("kb-detail-linked-card-header");
          subjectHeader.createEl("span", {
            text: subject.label || "Unknown Subject",
            cls: "kb-detail-linked-label",
          });
          
          if (subject.description) {
            subjectCard.createEl("p", {
              text: subject.description,
              cls: "kb-detail-linked-description",
            });
          }
          
          const subjectActions = subjectCard.createDiv("kb-detail-linked-actions");
          
          const searchBtn = subjectActions.createEl("button", {
            text: "Find all books",
            cls: "kb-detail-linked-btn",
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(subject.uri, 'subject');
            }
          };
          
          subjectActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: subject.uri,
              target: "_blank",
            },
          });
        });
      }

      // Series with URIs
      if (this.book.linkedData.series && this.book.linkedData.series.length > 0) {
        const seriesContainer = linkedDataSection.createDiv("kb-detail-linked-series");
        seriesContainer.createEl("h4", { text: "Series", cls: "kb-detail-linked-subtitle" });
        
        const seriesGrid = seriesContainer.createDiv("kb-detail-linked-grid");
        this.book.linkedData.series.forEach((series) => {
          const seriesCard = seriesGrid.createDiv("kb-detail-linked-card");
          
          const seriesHeader = seriesCard.createDiv("kb-detail-linked-card-header");
          seriesHeader.createEl("span", {
            text: series.label || "Unknown Series",
            cls: "kb-detail-linked-label",
          });
          
          if (series.description) {
            seriesCard.createEl("p", {
              text: series.description,
              cls: "kb-detail-linked-description",
            });
          }
          
          const seriesActions = seriesCard.createDiv("kb-detail-linked-actions");
          
          const searchBtn = seriesActions.createEl("button", {
            text: "Find all books in series",
            cls: "kb-detail-linked-btn",
          });
          searchBtn.onclick = () => {
            if (this.onLinkedDataUriSearch) {
              this.onLinkedDataUriSearch(series.uri, 'series');
            }
          };
          
          seriesActions.createEl("a", {
            text: "View URI",
            cls: "kb-detail-linked-uri",
            attr: {
              href: series.uri,
              target: "_blank",
            },
          });
        });
      }
    }

    // Wikidata enrichment section
    if (this.wikidataAuthorInfo || this.wikidataCharacterInfo) {
      const wikidataSection = infoSection.createDiv("kb-detail-wikidata-section");
      wikidataSection.createEl("h3", { text: "Additional Information" });

      // Author information
      if (this.wikidataAuthorInfo) {
        const authorSection = wikidataSection.createDiv("kb-detail-wikidata-author");

        if (this.wikidataAuthorInfo.imageUrl) {
          const authorImage = authorSection.createDiv("kb-detail-wikidata-author-image");
          authorImage.createEl("img", {
            attr: {
              src: this.wikidataAuthorInfo.imageUrl,
              alt: `Photo of ${this.wikidataAuthorInfo.name}`,
            },
          });
        }

        const authorInfo = authorSection.createDiv("kb-detail-wikidata-author-info");

        if (this.wikidataAuthorInfo.birthDate || this.wikidataAuthorInfo.deathDate) {
          authorInfo.createEl("p", {
            text: `${this.wikidataAuthorInfo.birthDate || '?'} - ${this.wikidataAuthorInfo.deathDate || 'present'}`,
            cls: "kb-detail-wikidata-dates",
          });
        }

        if (this.wikidataAuthorInfo.description) {
          authorInfo.createEl("p", {
            text: this.wikidataAuthorInfo.description,
            cls: "kb-detail-wikidata-description",
          });
        }

        if (this.wikidataAuthorInfo.wikipediaUrl) {
          authorSection.createEl("a", {
            text: "View on Wikipedia",
            cls: "kb-detail-wikidata-wiki-link",
            attr: {
              href: this.wikidataAuthorInfo.wikipediaUrl,
              target: "_blank",
            },
          });
        }
      }

      // Character information
      if (this.wikidataCharacterInfo) {
        const characterSection = wikidataSection.createDiv("kb-detail-wikidata-character");

        if (this.wikidataCharacterInfo.imageUrl) {
          const characterImage = characterSection.createDiv("kb-detail-wikidata-character-image");
          characterImage.createEl("img", {
            attr: {
              src: this.wikidataCharacterInfo.imageUrl,
              alt: `Image of ${this.wikidataCharacterInfo.name}`,
            },
          });
        }

        const characterInfo = characterSection.createDiv("kb-detail-wikidata-character-info");
        characterInfo.createEl("h4", { text: this.wikidataCharacterInfo.name });

        if (this.wikidataCharacterInfo.description) {
          characterInfo.createEl("p", {
            text: this.wikidataCharacterInfo.description,
            cls: "kb-detail-wikidata-description",
          });
        }

        if (this.wikidataCharacterInfo.wikipediaUrl) {
          characterSection.createEl("a", {
            text: "View on Wikipedia",
            cls: "kb-detail-wikidata-wiki-link",
            attr: {
              href: this.wikidataCharacterInfo.wikipediaUrl,
              target: "_blank",
            },
          });
        }
      }
    }

    // Actions section
    const actionsSection = infoSection.createDiv("kb-detail-actions");

    // KB Link - use PPN for direct search on KB.nl, fallback to ISBN
    if (this.book.ppn) {
      actionsSection.createEl("a", {
        text: "View on KB.nl",
        cls: "kb-detail-link-btn",
        attr: {
          href: `https://webggc.oclc.org/cbs/DB=3.34/CMD?ACT=SRCHA&IKT=12&TRM=ppn+${this.book.ppn}`,
          target: "_blank",
        },
      });
    } else if (this.book.isbn) {
      actionsSection.createEl("a", {
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

  /**
   * Enrich book information with Wikidata data
   */
  private async enrichWithWikidata(): Promise<void> {
    try {
      // Try to get author information
      if (this.book.authors && this.book.authors.length > 0) {
        const primaryAuthor = this.book.authors[0];
        this.wikidataAuthorInfo = await this.wikidataClient.getAuthorInfo(primaryAuthor);
      }

      // Try to get character information for popular series
      if (this.book.title.toLowerCase().includes('nijntje') ||
          this.book.title.toLowerCase().includes('miffy') ||
          this.book.series?.toLowerCase().includes('jip en janneke')) {
        let characterName = '';
        if (this.book.title.toLowerCase().includes('nijntje') ||
            this.book.title.toLowerCase().includes('miffy')) {
          characterName = 'Miffy';
        } else if (this.book.series?.toLowerCase().includes('jip en janneke')) {
          characterName = 'Jip en Janneke';
        }

        if (characterName) {
          this.wikidataCharacterInfo = await this.wikidataClient.getCharacterInfo(characterName);
        }
      }
    } catch (error) {
      console.error("[KB Plugin] Error enriching with Wikidata:", error);
      // Don't show error to user - Wikidata enrichment is optional
    }
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

  /**
   * Add hover tooltip to author link showing additional information
   */
  private addAuthorTooltip(element: HTMLElement, authorName: string) {
    let tooltip: HTMLElement | null = null;
    let tooltipTimeout: NodeJS.Timeout | null = null;

    element.addEventListener("mouseenter", async (e) => {
      // Clear any existing timeout
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }

      // Delay showing tooltip slightly
      tooltipTimeout = setTimeout(async () => {
        // Create tooltip element
        tooltip = this.contentEl.createDiv("kb-tooltip");

        // Check if we have linked data for this creator
        const creatorInfo = this.book.linkedData?.creators?.find(
          creator => creator.label?.toLowerCase().includes(authorName.toLowerCase())
        );

        // Build tooltip content
        const tooltipContent = tooltip.createDiv("kb-tooltip-content");

        // Title
        tooltipContent.createEl("div", {
          text: authorName,
          cls: "kb-tooltip-title",
        });

        // Add linked data info if available
        if (creatorInfo) {
          if (creatorInfo.birthDate || creatorInfo.deathDate) {
            tooltipContent.createEl("div", {
              text: `${creatorInfo.birthDate || '?'} - ${creatorInfo.deathDate || '?'}`,
              cls: "kb-tooltip-dates",
            });
          }

          if (creatorInfo.description) {
            tooltipContent.createEl("div", {
              text: creatorInfo.description,
              cls: "kb-tooltip-description",
            });
          }

          tooltipContent.createEl("div", {
            text: "🔗 Linked data available",
            cls: "kb-tooltip-badge",
          });
        } else {
          // Try to fetch from Wikidata
          try {
            const wikidataInfo = await this.wikidataClient.getAuthorInfo(authorName);
            if (wikidataInfo) {
              if (wikidataInfo.birthDate || wikidataInfo.deathDate) {
                tooltipContent.createEl("div", {
                  text: `${wikidataInfo.birthDate || '?'} - ${wikidataInfo.deathDate || 'present'}`,
                  cls: "kb-tooltip-dates",
                });
              }

              if (wikidataInfo.description) {
                tooltipContent.createEl("div", {
                  text: wikidataInfo.description,
                  cls: "kb-tooltip-description",
                });
              }

              tooltipContent.createEl("div", {
                text: "W Wikidata enriched",
                cls: "kb-tooltip-badge",
              });
            } else {
              tooltipContent.createEl("div", {
                text: "Click to search for books",
                cls: "kb-tooltip-hint",
              });
            }
          } catch (error) {
            console.error("[KB Plugin] Error fetching Wikidata for tooltip:", error);
            tooltipContent.createEl("div", {
              text: "Click to search for books",
              cls: "kb-tooltip-hint",
            });
          }
        }

        // Position tooltip near mouse
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left}px`;
      }, 300); // 300ms delay
    });

    element.addEventListener("mouseleave", () => {
      // Clear timeout if mouse leaves before tooltip shows
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      // Remove tooltip
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  }

  /**
   * Add hover tooltip to subject tag showing additional information
   */
  private addSubjectTooltip(element: HTMLElement, subjectName: string) {
    let tooltip: HTMLElement | null = null;
    let tooltipTimeout: NodeJS.Timeout | null = null;

    element.addEventListener("mouseenter", async (e) => {
      // Clear any existing timeout
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }

      // Delay showing tooltip slightly
      tooltipTimeout = setTimeout(async () => {
        // Create tooltip element
        tooltip = this.contentEl.createDiv("kb-tooltip");

        // Check if we have linked data for this subject
        const subjectInfo = this.book.linkedData?.subjects?.find(
          subject => subject.label?.toLowerCase().includes(subjectName.toLowerCase())
        );

        // Build tooltip content
        const tooltipContent = tooltip.createDiv("kb-tooltip-content");

        // Title
        tooltipContent.createEl("div", {
          text: subjectName,
          cls: "kb-tooltip-title",
        });

        // Add linked data info if available
        if (subjectInfo) {
          if (subjectInfo.description) {
            tooltipContent.createEl("div", {
              text: subjectInfo.description,
              cls: "kb-tooltip-description",
            });
          }

          // Show broader/narrower subjects if available
          if (subjectInfo.broader && subjectInfo.broader.length > 0) {
            tooltipContent.createEl("div", {
              text: `Parent: ${subjectInfo.broader.map(b => b.split('/').pop()).join(', ')}`,
              cls: "kb-tooltip-hierarchy",
            });
          }

          if (subjectInfo.narrower && subjectInfo.narrower.length > 0) {
            tooltipContent.createEl("div", {
              text: `Children: ${subjectInfo.narrower.map(n => n.split('/').pop()).join(', ')}`,
              cls: "kb-tooltip-hierarchy",
            });
          }

          tooltipContent.createEl("div", {
            text: "🔗 Linked data available",
            cls: "kb-tooltip-badge",
          });
        } else {
          tooltipContent.createEl("div", {
            text: "Click to select for search",
            cls: "kb-tooltip-hint",
          });
        }

        // Position tooltip near element
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.style.left = `${rect.left}px`;
      }, 300); // 300ms delay
    });

    element.addEventListener("mouseleave", () => {
      // Clear timeout if mouse leaves before tooltip shows
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }

      // Remove tooltip
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
