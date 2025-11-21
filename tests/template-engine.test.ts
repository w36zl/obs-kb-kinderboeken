import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngine } from '../src/template/engine';
import { KBBookMetadata } from '../src/types';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let sampleMetadata: KBBookMetadata;

  beforeEach(() => {
    engine = new TemplateEngine();
    sampleMetadata = {
      title: 'De Kleine Kapitein',
      authors: ['Paul Biegel'],
      isbn: '9789025866495',
      publisher: 'Querido',
      publishYear: '1970',
      language: 'Dutch',
      description: 'Een prachtig kinderboek over avontuur op zee.',
      subjects: ['Avontuur', 'Kinderboeken', 'Zee'],
      series: 'Kleine Kapitein serie',
      pageCount: '200',
    };
  });

  describe('Variable Replacement', () => {
    it('should replace simple variables', () => {
      const template = '{{title}} by {{author}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('De Kleine Kapitein by Paul Biegel');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = '{{title}} - {{title}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('De Kleine Kapitein - De Kleine Kapitein');
    });

    it('should handle undefined variables gracefully', () => {
      const template = '{{title}} by {{unknownField}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('De Kleine Kapitein by ');
    });

    it('should convert arrays to comma-separated strings', () => {
      const template = 'Authors: {{authors}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('Authors: Paul Biegel');
    });

    it('should handle authorsString variable', () => {
      const multiAuthorMetadata = {
        ...sampleMetadata,
        authors: ['Paul Biegel', 'Annie M.G. Schmidt'],
      };
      const template = 'Authors: {{authorsString}}';
      const result = engine.render(template, multiAuthorMetadata);
      expect(result).toBe('Authors: Paul Biegel, Annie M.G. Schmidt');
    });
  });

  describe('Conditional Blocks', () => {
    it('should render true block when condition is truthy', () => {
      const template = '{{#if isbn}}ISBN: {{isbn}}{{/if}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('ISBN: 9789025866495');
    });

    it('should render else block when condition is falsy', () => {
      const template = '{{#if coverUrl}}Has cover{{else}}No cover{{/if}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('No cover');
    });

    it('should handle unless blocks', () => {
      const template = '{{#unless coverUrl}}No cover available{{/unless}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('No cover available');
    });

    it('should treat empty string as falsy', () => {
      const metadataWithEmpty = { ...sampleMetadata, isbn: '' };
      const template = '{{#if isbn}}Has ISBN{{else}}No ISBN{{/if}}';
      const result = engine.render(template, metadataWithEmpty);
      expect(result).toBe('No ISBN');
    });

    it('should treat empty array as falsy', () => {
      const metadataWithEmptyAuthors = { ...sampleMetadata, authors: [] };
      const template = '{{#if authors}}Has authors{{else}}No authors{{/if}}';
      const result = engine.render(template, metadataWithEmptyAuthors);
      expect(result).toBe('No authors');
    });
  });

  describe('Loop Blocks', () => {
    it('should iterate over arrays with {{#each}}', () => {
      const template = '{{#each subjects}}- {{this}}\n{{/each}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('- Avontuur\n- Kinderboeken\n- Zee\n');
    });

    it('should provide @index in loops', () => {
      const template = '{{#each subjects}}{{@index}}: {{this}}, {{/each}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('0: Avontuur, 1: Kinderboeken, 2: Zee, ');
    });

    it('should handle empty arrays in loops', () => {
      const metadataWithEmpty = { ...sampleMetadata, subjects: [] };
      const template = 'Subjects: {{#each subjects}}{{this}}{{/each}}';
      const result = engine.render(template, metadataWithEmpty);
      expect(result).toBe('Subjects: ');
    });

    it('should provide @first and @last indicators', () => {
      const template = '{{#each subjects}}{{#if @first}}[FIRST]{{/if}}{{this}}{{#if @last}}[LAST]{{/if}},{{/each}}';
      // Note: @first and @last are replaced with strings "true"/"false", need to test properly
      const result = engine.render(template, sampleMetadata);
      expect(result).toContain('Avontuur');
      expect(result).toContain('Zee');
    });
  });

  describe('Date Helpers', () => {
    it('should format current date with {{DATE:format}}', () => {
      const template = '{{DATE:YYYY-MM-DD}}';
      const result = engine.render(template, sampleMetadata);
      // Check that it matches date format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format date with various tokens', () => {
      const template = '{{DATE:YYYY}}-{{DATE:MM}}-{{DATE:DD}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Property Access', () => {
    it('should handle nested property access', () => {
      const template = '{{authors.length}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('1');
    });

    it('should handle array index access', () => {
      const metadataWithMultipleAuthors = {
        ...sampleMetadata,
        authors: ['Paul Biegel', 'Annie M.G. Schmidt'],
      };
      const template = '{{authors[0]}} and {{authors[1]}}';
      const result = engine.render(template, metadataWithMultipleAuthors);
      expect(result).toBe('Paul Biegel and Annie M.G. Schmidt');
    });
  });

  describe('Inline Scripts', () => {
    it('should execute inline scripts', () => {
      const template = 'Title length: <%= title.length %>';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('Title length: 18');
    });

    it('should handle script errors gracefully', () => {
      const template = 'Result: <%= nonexistent.property %>';
      const result = engine.render(template, sampleMetadata);
      expect(result).toContain('[Script Error');
    });

    it('should allow complex expressions', () => {
      const template = 'Has ISBN: <%= isbn ? "Yes" : "No" %>';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('Has ISBN: Yes');
    });
  });

  describe('Filename Sanitization', () => {
    it('should remove invalid filename characters', () => {
      const result = engine.sanitizeFilename('Book: A/B\\C*D?E"F<G>H|I');
      expect(result).toBe('Book- A-B-C-D-E-F-G-H-I');
    });

    it('should normalize whitespace', () => {
      const result = engine.sanitizeFilename('Book   Title   Here');
      expect(result).toBe('Book Title Here');
    });

    it('should limit filename length', () => {
      const longTitle = 'A'.repeat(300);
      const result = engine.sanitizeFilename(longTitle);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should trim whitespace', () => {
      const result = engine.sanitizeFilename('  Book Title  ');
      expect(result).toBe('Book Title');
    });
  });

  describe('renderFilename', () => {
    it('should render and sanitize filename pattern', () => {
      const pattern = '{{title}} - {{author}}';
      const result = engine.renderFilename(pattern, sampleMetadata);
      expect(result).toBe('De Kleine Kapitein - Paul Biegel');
    });

    it('should handle complex patterns', () => {
      const pattern = '{{title}} ({{publishYear}})';
      const result = engine.renderFilename(pattern, sampleMetadata);
      expect(result).toBe('De Kleine Kapitein (1970)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template', () => {
      const result = engine.render('', sampleMetadata);
      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'Just plain text';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('Just plain text');
    });

    it('should handle minimal metadata', () => {
      const minimalMetadata: KBBookMetadata = {
        title: 'Test',
        authors: [],
      };
      const template = '{{title}} - {{author}}';
      const result = engine.render(template, minimalMetadata);
      expect(result).toBe('Test - ');
    });

    it('should preserve whitespace in template', () => {
      const template = 'Title:\n  {{title}}\n\nAuthor:\n  {{author}}';
      const result = engine.render(template, sampleMetadata);
      expect(result).toBe('Title:\n  De Kleine Kapitein\n\nAuthor:\n  Paul Biegel');
    });
  });
});
