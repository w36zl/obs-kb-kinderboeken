import { Plugin, Editor, WorkspaceLeaf } from "obsidian";
import { BookSearchModal } from "./modal";
import { AdvancedSearchModal } from "./advanced-modal";
import { KBBrowseView, VIEW_TYPE_KB_BROWSE } from "./browse-view";
import { KBGraphView, VIEW_TYPE_KB_GRAPH } from "./graph/GraphView";
import { KBSettingTab } from "./settings";
import { KBPluginSettings, DEFAULT_SETTINGS } from "./types";

export default class KBKinderboekenPlugin extends Plugin {
  settings!: KBPluginSettings;

  async onload() {
    console.log("[KB Plugin] Loading KB Kinderboeken plugin");

    // Load settings
    await this.loadSettings();
    console.log("[KB Plugin] Settings loaded");

    // Register browse view
    this.registerView(
      VIEW_TYPE_KB_BROWSE,
      (leaf) => new KBBrowseView(leaf, this)
    );

    // Register graph view
    this.registerView(
      VIEW_TYPE_KB_GRAPH,
      (leaf) => new KBGraphView(leaf, this)
    );

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
      callback: async () => {
        try {
          console.log("[KB Plugin] Opening browse & explore view");
          await this.activateBrowseView();
        } catch (error) {
          console.error("[KB Plugin] Error opening browse & explore view:", error);
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

  async activateBrowseView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_KB_BROWSE);

    if (leaves.length > 0) {
      // View already exists, reveal it
      leaf = leaves[0];
    } else {
      // Create new leaf in right sidebar or main area
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({
        type: VIEW_TYPE_KB_BROWSE,
        active: true,
      });
    }

    // Reveal the leaf
    workspace.revealLeaf(leaf);
  }

  onunload() {
    console.log("Unloading KB Kinderboeken plugin");
    
    // Detach all browse views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_KB_BROWSE);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
