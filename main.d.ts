import { Plugin } from 'obsidian';

interface KBPluginSettings {
    attachmentFolder: string;
    downloadCovers: boolean;
    defaultAuthor: string;
    bookNotesFolder: string;
}

declare class KBKinderboekenPlugin extends Plugin {
    settings: KBPluginSettings;
    onload(): Promise<void>;
    onunload(): void;
    loadSettings(): Promise<void>;
    saveSettings(): Promise<void>;
}

export { KBKinderboekenPlugin as default };
