/**
 * Mock module for Obsidian API
 * This allows tests to run without the actual Obsidian environment
 */

export class Notice {
  constructor(public message: string, public timeout?: number) {}
}

export class Modal {
  app: any;
  contentEl: HTMLElement = document.createElement('div');

  constructor(app: any) {
    this.app = app;
  }

  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Setting {
  constructor(containerEl: HTMLElement) {}

  setName(name: string) {
    return this;
  }

  setDesc(desc: string) {
    return this;
  }

  addText(cb: (text: any) => void) {
    return this;
  }

  addButton(cb: (button: any) => void) {
    return this;
  }

  addDropdown(cb: (dropdown: any) => void) {
    return this;
  }

  addToggle(cb: (toggle: any) => void) {
    return this;
  }
}

export class Plugin {
  app: any;
  manifest: any;

  loadData() {
    return Promise.resolve({});
  }

  saveData(data: any) {
    return Promise.resolve();
  }

  addCommand(command: any) {}
  addRibbonIcon(icon: string, title: string, callback: () => void) {}
  addSettingTab(tab: any) {}
  registerView(type: string, viewCreator: any) {}
  registerEvent(event: any) {}
}

export class TFile {
  path: string = '';
  name: string = '';
  basename: string = '';
  extension: string = '';
}

export class ItemView {
  app: any;
  containerEl: HTMLElement = document.createElement('div');
  contentEl: HTMLElement = document.createElement('div');
  leaf: any;

  constructor(leaf: any) {
    this.leaf = leaf;
  }

  getViewType() {
    return '';
  }

  getDisplayText() {
    return '';
  }

  getIcon() {
    return '';
  }

  onOpen() {
    return Promise.resolve();
  }

  onClose() {
    return Promise.resolve();
  }
}

export function requestUrl(options: any) {
  return Promise.resolve({
    status: 200,
    text: '',
    json: {},
    arrayBuffer: new ArrayBuffer(0),
    headers: {},
  });
}

export class App {
  vault = {
    adapter: {
      exists: () => Promise.resolve(false),
      read: () => Promise.resolve(''),
      write: () => Promise.resolve(),
      writeBinary: () => Promise.resolve(),
    },
    create: () => Promise.resolve(new TFile()),
    createFolder: () => Promise.resolve(),
    modify: () => Promise.resolve(),
    getAbstractFileByPath: () => null,
  };

  workspace = {
    getLeaf: () => ({
      openFile: () => Promise.resolve(),
      setViewState: () => Promise.resolve(),
    }),
    getLeavesOfType: () => [],
    revealLeaf: () => {},
    detachLeavesOfType: () => {},
    on: () => ({ unload: () => {} }),
  };
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement = document.createElement('div');

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }

  display() {}
  hide() {}
}

export class WorkspaceLeaf {}

export class Editor {
  getSelection() {
    return '';
  }
}
