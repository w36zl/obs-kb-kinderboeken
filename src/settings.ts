import { App, PluginSettingTab, Setting } from "obsidian";
import type KBKinderboekenPlugin from "./main";

export class KBSettingTab extends PluginSettingTab {
  plugin: KBKinderboekenPlugin;

  constructor(app: App, plugin: KBKinderboekenPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "KB Kinderboeken Settings" });

    // Template Settings Section
    containerEl.createEl("h3", { text: "Template Settings" });

    new Setting(containerEl)
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
      new Setting(containerEl)
        .setName("Template file path")
        .setDesc("Path to your book note template (leave empty to use default). Example: Templates/Book Note.md")
        .addText((text) =>
          text
            .setPlaceholder("Templates/Book Note.md")
            .setValue(this.plugin.settings.templatePath)
            .onChange(async (value) => {
              this.plugin.settings.templatePath = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
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

      // Template help text
      const helpEl = containerEl.createDiv("kb-template-help");
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

    // File & Folder Settings Section
    containerEl.createEl("h3", { text: "File & Folder Settings" });

    new Setting(containerEl)
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
      );

    new Setting(containerEl)
      .setName("Download cover images")
      .setDesc("Download and store book covers locally in your vault")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.downloadCovers)
          .onChange(async (value) => {
            this.plugin.settings.downloadCovers = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
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
      );

    new Setting(containerEl)
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
