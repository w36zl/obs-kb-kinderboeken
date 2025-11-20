import { App, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, FuzzySuggestModal, Modal } from "obsidian";
import type KBKinderboekenPlugin from "./main";
import { TemplateEngine } from "./template/engine";
import { TemplateReader } from "./template/reader";
import { KBBookMetadata } from "./types";


export class KBSettingTab extends PluginSettingTab {
  plugin: KBKinderboekenPlugin;

  constructor(app: App, plugin: KBKinderboekenPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Get all markdown files in the vault
   */
  private getMarkdownFiles(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  /**
   * Get all folders in the vault
   */
  private getAllFolders(): string[] {
    const folders: string[] = [""];
    this.app.vault.getAllLoadedFiles().forEach((file: TAbstractFile) => {
      if (file instanceof TFolder) {
        folders.push(file.path);
      }
    });
    return folders.sort();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "KB Kinderboeken Settings" });
    containerEl.createEl("p", {
      text: "Configure how book notes are created and organized in your vault.",
      cls: "setting-item-description",
    });

    // Template Settings Section
    const templateSection = containerEl.createDiv("kb-settings-section");
    templateSection.createEl("h3", { text: "Template Settings" });
    templateSection.createEl("p", {
      text: "Customize how book note content is generated using templates.",
      cls: "kb-settings-description",
    });

    new Setting(templateSection)
      .setName("Use template")
      .setDesc("Use a template file for creating book notes")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useTemplate)
          .onChange(async (value) => {
            this.plugin.settings.useTemplate = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide template settings
          })
      );

    if (this.plugin.settings.useTemplate) {
      new Setting(templateSection)
        .setName("Template file path")
        .setDesc("Select a template file from your vault (leave empty to use default)")
        .addSearch((search) => {
          const markdownFiles = this.getMarkdownFiles();

          search
            .setPlaceholder("Templates/Book Note.md")
            .setValue(this.plugin.settings.templatePath)
            .onChange(async (value) => {
              this.plugin.settings.templatePath = value;
              await this.plugin.saveSettings();
            });

          // Add autocomplete suggestions
          search.inputEl.addEventListener("focus", () => {
            search.inputEl.select();
          });

          // Setup suggestions
          const suggestions = markdownFiles.map(f => f.path);
          search.inputEl.addEventListener("input", () => {
            const value = search.getValue().toLowerCase();
            if (value) {
              const matches = suggestions.filter(s => s.toLowerCase().includes(value));
              if (matches.length > 0) {
                search.inputEl.setAttribute("data-suggestions", matches.slice(0, 10).join(","));
              }
            }
          });
        })
        .addButton((button) =>
          button
            .setButtonText("Browse")
            .setTooltip("Select template file")
            .onClick(() => {
              const modal = new TemplateFileModal(this.app, this.getMarkdownFiles(), (file) => {
                this.plugin.settings.templatePath = file.path;
                this.plugin.saveSettings();
                this.display(); // Refresh settings display
              });
              modal.open();
            })
        );

      new Setting(templateSection)
        .setName("Filename pattern")
        .setDesc("Pattern for book note filenames. Use {{title}}, {{author}}, {{publishYear}}, etc.")
        .addText((text) =>
          text
            .setPlaceholder("{{title}}")
            .setValue(this.plugin.settings.filenamePattern)
            .onChange(async (value) => {
              this.plugin.settings.filenamePattern = value || "{{title}}";
              await this.plugin.saveSettings();
            })
        );

      // Template preview button
      new Setting(templateSection)
        .setName("Preview template")
        .setDesc("Preview how your template will look with sample book data")
        .addButton((button) =>
          button
            .setButtonText("Preview")
            .setTooltip("Open template preview")
            .onClick(async () => {
              const templateEngine = new TemplateEngine();
              const templateReader = new TemplateReader(this.app);

              // Get template content
              let templateContent: string;
              if (this.plugin.settings.templatePath) {
                const customTemplate = await templateReader.readTemplate(
                  this.plugin.settings.templatePath
                );
                templateContent = customTemplate || templateReader.getDefaultTemplate();
              } else {
                templateContent = templateReader.getDefaultTemplate();
              }

              // Create sample book data
              const sampleBook: KBBookMetadata = {
                title: "De Gruffalo",
                authors: ["Julia Donaldson", "Axel Scheffler"],
                isbn: "9789025735722",
                publisher: "Lemniscaat",
                publishYear: "2000",
                language: "Dutch",
                description: "Een muis loopt door een donker bos en ontmoet verschillende dieren die hem willen opeten. De muis vertelt dat hij op weg is naar de griezelige Gruffalo.",
                subjects: ["Prentenboeken", "Vriendschap", "Moed"],
                pageCount: "32",
                targetAge: "4-6 jaar",
                series: "",
                coverUrl: "https://example.com/cover.jpg",
                localCoverImage: "attachments/de-gruffalo-cover.jpg",
                identifier: "KB:12345",
              };

              // Render template
              const rendered = templateEngine.render(templateContent, sampleBook);

              // Show preview modal
              const modal = new TemplatePreviewModal(this.app, rendered, this.plugin.settings.templatePath || "Default Template");
              modal.open();
            })
        );

      // Template help text
      const helpEl = templateSection.createDiv("kb-template-help");
      helpEl.createEl("p", {
        text: "Available template variables:",
        cls: "setting-item-description",
      });
      const variablesList = helpEl.createEl("ul", {
        cls: "kb-template-variables",
      });

      const variables = [
        "{{title}} - Book title",
        "{{author}} - First author",
        "{{authors}} - All authors (comma-separated)",
        "{{authorsString}} - All authors as string",
        "{{isbn}} - ISBN number",
        "{{publishYear}} - Publication year",
        "{{publisher}} - Publisher name",
        "{{language}} - Language",
        "{{description}} - Book description",
        "{{subjects}} - Subjects (comma-separated)",
        "{{pageCount}} - Number of pages",
        "{{coverUrl}} - Cover image URL",
        "{{localCoverImage}} - Local cover path",
        "{{DATE:YYYY-MM-DD}} - Current date (customizable format)",
      ];

      variables.forEach((v) => {
        variablesList.createEl("li", { text: v });
      });
    }

    // Search Preferences Section
    const searchSection = containerEl.createDiv("kb-settings-section");
    searchSection.createEl("h3", { text: "Search Preferences" });
    searchSection.createEl("p", {
      text: "Configure how the plugin searches for books in the KB catalog.",
      cls: "kb-settings-description",
    });

    new Setting(searchSection)
      .setName("Prioritize children's books")
      .setDesc("When searching, prioritize books with youth/children's literature subjects (Jeugd, Fictie). This helps find more children's books but may miss some adult books with similar titles.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.prioritizeChildrensBooks)
          .onChange(async (value) => {
            this.plugin.settings.prioritizeChildrensBooks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(searchSection)
      .setName("Use fuzzy search")
      .setDesc("Enable fuzzy matching to find results even with typos or partial matches. Disable for exact matches only.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useFuzzySearch)
          .onChange(async (value) => {
            this.plugin.settings.useFuzzySearch = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(searchSection)
      .setName("Fetch KB linked data")
      .setDesc("Enrich search results with linked data from data.bibliotheken.nl (subjects, creators, and series URIs). Disable if you want to avoid additional network calls.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableLinkedDataEnrichment)
          .onChange(async (value) => {
            this.plugin.settings.enableLinkedDataEnrichment = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(searchSection)
      .setName("Enrich metadata from Bol.com")
      .setDesc("Automatically fetch additional metadata (series, page count, better descriptions) from Bol.com when available. This may slightly slow down searches but provides richer information.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enrichFromBol)
          .onChange(async (value) => {
            this.plugin.settings.enrichFromBol = value;
            await this.plugin.saveSettings();
          })
      );

    // File & Folder Settings Section
    const fileSection = containerEl.createDiv("kb-settings-section");
    fileSection.createEl("h3", { text: "File & Folder Settings" });
    fileSection.createEl("p", {
      text: "Configure where book notes and cover images are stored in your vault.",
      cls: "kb-settings-description",
    });

    new Setting(fileSection)
      .setName("Book notes folder")
      .setDesc("Folder where book notes will be created.")
      .addText((text) =>
        text
          .setPlaceholder("Books")
          .setValue(this.plugin.settings.bookNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.bookNotesFolder = value || "Books";
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Browse")
          .setTooltip("Select folder")
          .onClick(() => {
            const modal = new FolderSuggestModal(this.app, this.getAllFolders(), (folder) => {
              this.plugin.settings.bookNotesFolder = folder || "Books";
              this.plugin.saveSettings();
              this.display(); // Refresh settings display
            });
            modal.open();
          })
      );

    new Setting(fileSection)
      .setName("Download cover images")
      .setDesc("Download and store book covers locally in your vault")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.downloadCovers)
          .onChange(async (value) => {
            this.plugin.settings.downloadCovers = value;
            await this.plugin.saveSettings();
            this.display(); // Refresh to show/hide cover settings
          })
      );

    if (this.plugin.settings.downloadCovers) {
      new Setting(fileSection)
        .setName("Cover filename pattern")
        .setDesc("Pattern for cover filenames. Use {{title}}, {{isbn}}, {{author}}, etc.")
        .addText((text) =>
          text
            .setPlaceholder("{{title}}-cover")
            .setValue(this.plugin.settings.coverFilenamePattern)
            .onChange(async (value) => {
              this.plugin.settings.coverFilenamePattern = value || "{{title}}-cover";
              await this.plugin.saveSettings();
            })
        );

      new Setting(fileSection)
        .setName("Deduplicate covers")
        .setDesc("Skip downloading if a cover with the same filename already exists")
        .addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.deduplicateCovers)
            .onChange(async (value) => {
              this.plugin.settings.deduplicateCovers = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(fileSection)
        .setName("Cover fallback URL")
        .setDesc("URL or path to use when no cover is available (leave empty for no fallback)")
        .addText((text) =>
          text
            .setPlaceholder("https://example.com/placeholder.jpg")
            .setValue(this.plugin.settings.coverFallbackUrl)
            .onChange(async (value) => {
              this.plugin.settings.coverFallbackUrl = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(fileSection)
      .setName("Attachment folder")
      .setDesc("Folder where cover images will be saved (relative to vault root)")
      .addText((text) =>
        text
          .setPlaceholder("attachments")
          .setValue(this.plugin.settings.attachmentFolder)
          .onChange(async (value) => {
            this.plugin.settings.attachmentFolder = value || "attachments";
            await this.plugin.saveSettings();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Browse")
          .setTooltip("Select folder")
          .onClick(() => {
            const modal = new FolderSuggestModal(this.app, this.getAllFolders(), (folder) => {
              this.plugin.settings.attachmentFolder = folder || "attachments";
              this.plugin.saveSettings();
              this.display(); // Refresh settings display
            });
            modal.open();
          })
      );

    new Setting(fileSection)
      .setName("Default author")
      .setDesc("Default author name to use when metadata doesn't include an author")
      .addText((text) =>
        text
          .setPlaceholder("Unknown Author")
          .setValue(this.plugin.settings.defaultAuthor)
          .onChange(async (value) => {
            this.plugin.settings.defaultAuthor = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

/**
 * Modal for selecting a template file from the vault
 */
class TemplateFileModal extends FuzzySuggestModal<TFile> {
  private files: TFile[];
  private onSelect: (file: TFile) => void;

  constructor(app: App, files: TFile[], onSelect: (file: TFile) => void) {
    super(app);
    this.files = files;
    this.onSelect = onSelect;
    this.setPlaceholder("Search for a template file...");
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onSelect(file);
  }
}

/**
 * Modal for selecting a folder from the vault
 */
class FolderSuggestModal extends FuzzySuggestModal<string> {
  private folders: string[];
  private onSelect: (folder: string) => void;

  constructor(app: App, folders: string[], onSelect: (folder: string) => void) {
    super(app);
    this.folders = folders;
    this.onSelect = onSelect;
    this.setPlaceholder("Search for a folder...");
  }

  getItems(): string[] {
    return this.folders;
  }

  getItemText(folder: string): string {
    return folder || "(root)";
  }

  onChooseItem(folder: string): void {
    this.onSelect(folder);
  }
}

/**
 * Modal for previewing a template with sample data
 */
class TemplatePreviewModal extends Modal {
  private content: string;
  private templateName: string;

  constructor(app: App, content: string, templateName: string) {
    super(app);
    this.content = content;
    this.templateName = templateName;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("kb-template-preview-modal");

    contentEl.createEl("h2", { text: `Template Preview: ${this.templateName}` });

    contentEl.createEl("p", {
      text: "This is how your template will look with sample book data:",
      cls: "kb-preview-description",
    });

    // Create a pre element to show the rendered content
    const previewContainer = contentEl.createDiv("kb-preview-container");
    const preEl = previewContainer.createEl("pre", { cls: "kb-preview-content" });
    const codeEl = preEl.createEl("code");
    codeEl.textContent = this.content;

    // Add copy button
    const buttonContainer = contentEl.createDiv("kb-preview-buttons");
    const copyButton = buttonContainer.createEl("button", { text: "Copy to Clipboard" });
    copyButton.onclick = async () => {
      await navigator.clipboard.writeText(this.content);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy to Clipboard";
      }, 2000);
    };

    const closeButton = buttonContainer.createEl("button", { text: "Close" });
    closeButton.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
