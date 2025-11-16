export interface KBBookMetadata {
  title: string;
  authors: string[];
  isbn?: string;
  allIsbns?: string[]; // All ISBNs found (for cover fallback)
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
  coverFilenamePattern: string;
  deduplicateCovers: boolean;
  coverFallbackUrl: string;
  // Amazon Product Advertising API
  amazonAccessKey: string;
  amazonSecretKey: string;
  amazonAssociateTag: string;
  amazonRegion: string;
}

export const DEFAULT_SETTINGS: KBPluginSettings = {
  attachmentFolder: "attachments",
  downloadCovers: true,
  defaultAuthor: "",
  bookNotesFolder: "Books",
  templatePath: "",
  filenamePattern: "{{title}}",
  useTemplate: true,
  coverFilenamePattern: "{{title}}-cover",
  deduplicateCovers: true,
  coverFallbackUrl: "",
  // Amazon Product Advertising API
  amazonAccessKey: "",
  amazonSecretKey: "",
  amazonAssociateTag: "",
  amazonRegion: "nl", // Netherlands by default
};
