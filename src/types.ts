export interface KBBookMetadata {
  title: string;
  authors: string[];
  isbn?: string;
  publisher?: string;
  publishYear?: string;
  language?: string;
  description?: string;
  subjects?: string[];
  series?: string;
  pageCount?: string;
  targetAge?: string;
  coverUrl?: string;
  identifier?: string;
}

export interface KBPluginSettings {
  attachmentFolder: string;
  downloadCovers: boolean;
  defaultAuthor: string;
}

export const DEFAULT_SETTINGS: KBPluginSettings = {
  attachmentFolder: "attachments",
  downloadCovers: true,
  defaultAuthor: "",
};
