import { Plugin, Editor } from "obsidian";
import { BookSearchModal } from "./modal";
import { AdvancedSearchModal } from "./advanced-modal";
import { BrowseExploreModal } from "./browse-modal";
import { KBSettingTab } from "./settings";
import { KBPluginSettings, DEFAULT_SETTINGS } from "./types";

export default class KBKinderboekenPlugin extends Plugin {
  settings!: KBPluginSettings;

  async onload() {
    console.log("[KB Plugin] Loading KB Kinderboeken plugin v0.1.0");

    // Load settings
    await this.loadSettings();
    console.log("[KB Plugin] Settings loaded");

    // Add ribbon icon
    this.addRibbonIcon("book", "Search KB Kinderboeken", () => {
      try {
        console.log("[KB Plugin] Opening modal from ribbon");
        new BookSearchModal(this.app, this).open();
      } catch (error) {
        console.error("[KB Plugin] Error opening modal from ribbon:", error);
      }
    });

    // Add command palette commands
    this.addCommand({
      id: "search-kb-kinderboeken",
      name: "Search for book",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening modal from command");
          new BookSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening modal from command:", error);
        }
      },
    });

    this.addCommand({
      id: "search-kb-kinderboeken-selection",
      name: "Search for selected text",
      editorCallback: (editor: Editor) => {
        try {
          const selection = editor.getSelection();
          console.log("[KB Plugin] Opening modal with selection:", selection ? "yes" : "no");
          if (selection) {
            new BookSearchModal(this.app, this, selection).open();
          } else {
            new BookSearchModal(this.app, this).open();
          }
        } catch (error) {
          console.error("[KB Plugin] Error opening modal from selection:", error);
        }
      },
    });

    this.addCommand({
      id: "search-kb-kinderboeken-isbn",
      name: "Search by ISBN",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening ISBN search modal");
          new BookSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening ISBN modal:", error);
        }
      },
    });

    this.addCommand({
      id: "advanced-search-kb-kinderboeken",
      name: "Advanced search for books",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening advanced search modal");
          new AdvancedSearchModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening advanced search modal:", error);
        }
      },
    });

    this.addCommand({
      id: "browse-explore-kb-kinderboeken",
      name: "Browse & explore books",
      callback: () => {
        try {
          console.log("[KB Plugin] Opening browse & explore modal");
          new BrowseExploreModal(this.app, this).open();
        } catch (error) {
          console.error("[KB Plugin] Error opening browse & explore modal:", error);
        }
      },
    });

    // Add context menu
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        try {
          const selection = editor.getSelection();
          if (selection) {
            menu.addItem((item) => {
              item
                .setTitle("Search KB for book")
                .setIcon("book")
                .onClick(() => {
                  try {
                    console.log("[KB Plugin] Opening modal from context menu");
                    new BookSearchModal(this.app, this, selection).open();
                  } catch (error) {
                    console.error("[KB Plugin] Error in context menu click:", error);
                  }
                });
            });
          }
        } catch (error) {
          console.error("[KB Plugin] Error adding context menu:", error);
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
