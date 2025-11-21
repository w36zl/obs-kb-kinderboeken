import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, KBPluginSettings, KBBookMetadata } from '../src/types';

describe('Types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have all required settings with default values', () => {
      expect(DEFAULT_SETTINGS.attachmentFolder).toBe('attachments');
      expect(DEFAULT_SETTINGS.downloadCovers).toBe(true);
      expect(DEFAULT_SETTINGS.bookNotesFolder).toBe('Books');
      expect(DEFAULT_SETTINGS.filenamePattern).toBe('{{title}}');
      expect(DEFAULT_SETTINGS.useTemplate).toBe(true);
    });

    it('should have proper default for children book search', () => {
      expect(DEFAULT_SETTINGS.prioritizeChildrensBooks).toBe(false);
    });

    it('should have fuzzy search enabled by default', () => {
      expect(DEFAULT_SETTINGS.useFuzzySearch).toBe(true);
    });

    it('should have linked data enrichment enabled by default', () => {
      expect(DEFAULT_SETTINGS.enableLinkedDataEnrichment).toBe(true);
    });

    it('should have Wikidata enrichment enabled by default', () => {
      expect(DEFAULT_SETTINGS.enableWikidataEnrichment).toBe(true);
    });

    it('should have Bol.com enrichment enabled by default', () => {
      expect(DEFAULT_SETTINGS.enrichFromBol).toBe(true);
    });

    it('should have Amazon region set to Netherlands', () => {
      expect(DEFAULT_SETTINGS.amazonRegion).toBe('nl');
    });

    it('should have empty Amazon credentials by default', () => {
      expect(DEFAULT_SETTINGS.amazonAccessKey).toBe('');
      expect(DEFAULT_SETTINGS.amazonSecretKey).toBe('');
      expect(DEFAULT_SETTINGS.amazonAssociateTag).toBe('');
    });
  });

  describe('KBBookMetadata', () => {
    it('should allow creating metadata with required fields only', () => {
      const metadata: KBBookMetadata = {
        title: 'Test Book',
        authors: ['Test Author'],
      };
      expect(metadata.title).toBe('Test Book');
      expect(metadata.authors).toHaveLength(1);
    });

    it('should allow all optional fields', () => {
      const metadata: KBBookMetadata = {
        title: 'Test Book',
        authors: ['Author 1', 'Author 2'],
        isbn: '9789000000000',
        allIsbns: ['9789000000000', '9789000000001'],
        publisher: 'Test Publisher',
        publishYear: '2024',
        language: 'nl',
        description: 'A test description',
        subjects: ['Subject 1', 'Subject 2'],
        series: 'Test Series',
        pageCount: '100',
        targetAge: '6-9',
        coverUrl: 'https://example.com/cover.jpg',
        localCoverImage: 'attachments/cover.jpg',
        identifier: 'ID123',
        ppn: '123456789',
        ppnUri: 'https://data.bibliotheken.nl/doc/nbt/123456789',
        linkedData: {
          uri: 'https://example.com/linked',
          creators: [],
          subjects: [],
          series: [],
        },
      };

      expect(metadata.isbn).toBe('9789000000000');
      expect(metadata.allIsbns).toHaveLength(2);
      expect(metadata.linkedData?.uri).toBe('https://example.com/linked');
    });
  });

  describe('KBPluginSettings completeness', () => {
    it('should have cover filename pattern setting', () => {
      expect(DEFAULT_SETTINGS.coverFilenamePattern).toBe('{{title}}-cover');
    });

    it('should have deduplication setting', () => {
      expect(DEFAULT_SETTINGS.deduplicateCovers).toBe(true);
    });

    it('should have fallback URL setting', () => {
      expect(DEFAULT_SETTINGS.coverFallbackUrl).toBe('');
    });

    it('should have default author setting', () => {
      expect(DEFAULT_SETTINGS.defaultAuthor).toBe('');
    });

    it('should have template path setting', () => {
      expect(DEFAULT_SETTINGS.templatePath).toBe('');
    });
  });
});
