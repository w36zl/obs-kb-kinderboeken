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

    new Setting(containerEl)
      .setName("Book notes folder")
      .setDesc("Folder where book notes will be created. Notes will be named after the book title.")
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
