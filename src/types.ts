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
  ppn?: string;
  ppnUri?: string;
  linkedData?: {
    uri?: string;
    creators?: KBLinkedDataResource[];
    subjects?: KBLinkedDataResource[];
    series?: KBLinkedDataResource[];
  };
}

export interface KBLinkedDataResource {
  uri: string;
  label?: string;
  type?: string | string[];
  description?: string;
  image?: string;
  birthDate?: string;
  deathDate?: string;
  sameAs?: string[]; // Links to other databases (VIAF, Wikidata, etc.)
  broader?: string[]; // Parent subjects
  narrower?: string[]; // Child subjects
  related?: string[]; // Related subjects/entities
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
  // Children's book search preferences
  prioritizeChildrensBooks: boolean;
  // Search behavior
  useFuzzySearch: boolean;
  enableLinkedDataEnrichment: boolean;
  // Bol.com integration
  enrichFromBol: boolean;
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
  // Children's book search preferences
  prioritizeChildrensBooks: false, // Default to general search
  // Search behavior
  useFuzzySearch: true, // Enable fuzzy matching by default for better results
  enableLinkedDataEnrichment: true,
  // Bol.com integration
  enrichFromBol: true, // Enable metadata enrichment by default
};
