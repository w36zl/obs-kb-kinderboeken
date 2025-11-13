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
  localCoverImage?: string;
  identifier?: string;
}

export interface KBPluginSettings {
  attachmentFolder: string;
  downloadCovers: boolean;
  defaultAuthor: string;
  bookNotesFolder: string;
  templatePath: string;
  filenamePattern: string;
  useTemplate: boolean;
}

export const DEFAULT_SETTINGS: KBPluginSettings = {
  attachmentFolder: "attachments",
  downloadCovers: true,
  defaultAuthor: "",
  bookNotesFolder: "Books",
  templatePath: "",
  filenamePattern: "{{title}}",
  useTemplate: true,
};
