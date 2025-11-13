import { Plugin, Editor } from "obsidian";
import { BookSearchModal } from "./modal";
import { KBSettingTab } from "./settings";
import { KBPluginSettings, DEFAULT_SETTINGS } from "./types";

export default class KBKinderboekenPlugin extends Plugin {
  settings!: KBPluginSettings;

  async onload() {
    console.log("Loading KB Kinderboeken plugin");

    // Load settings
    await this.loadSettings();

    // Add ribbon icon
    this.addRibbonIcon("book", "Search KB Kinderboeken", () => {
      new BookSearchModal(this.app, this).open();
    });

    // Add command palette commands
    this.addCommand({
      id: "search-kb-kinderboeken",
      name: "Search for book",
      callback: () => {
        new BookSearchModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "search-kb-kinderboeken-selection",
      name: "Search for selected text",
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          new BookSearchModal(this.app, this, selection).open();
        } else {
          new BookSearchModal(this.app, this).open();
        }
      },
    });

    this.addCommand({
      id: "search-kb-kinderboeken-isbn",
      name: "Search by ISBN",
      callback: () => {
        new BookSearchModal(this.app, this).open();
      },
    });

    // Add context menu
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selection = editor.getSelection();
        if (selection) {
          menu.addItem((item) => {
            item
              .setTitle("Search KB for book")
              .setIcon("book")
              .onClick(() => {
                new BookSearchModal(this.app, this, selection).open();
              });
          });
        }
      })
    );

    // Add settings tab
    this.addSettingTab(new KBSettingTab(this.app, this));
  }

  onunload() {
    console.log("Unloading KB Kinderboeken plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
