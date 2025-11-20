# KB Nederlandse Kinderboeken Plugin

Fetch metadata and cover images for Dutch children's books from the Koninklijke Bibliotheek (Royal Library of the Netherlands).

## Features

**Search Methods**: Simple search, Advanced search (multi-criteria CQL), ISBN lookup, optional children's book filtering
**Access**: Command palette, ribbon icon, context menu (right-click text)
**Rich Metadata**: Title, authors, ISBN, publisher, year, language, description, subjects, series, page count, target age

**Templates**: Customizable note templates with `{{variable}}` placeholders, conditionals (`{{#if}}`), loops (`{{#each}}`), inline JS (`<%=%>`), date helpers
**File Naming**: Flexible patterns for notes and covers (e.g., `{{title}} - {{author}}`)

**Covers**: Multi-source fallback (Open Library, Google Books, Amazon, Bol.com), deduplication, custom patterns
**Integrations**: Templater plugin auto-execution, Obsidian Bases compatible YAML

## Quick Start

1. **Search**: Use command palette (`KB: Search for book`, `KB: Advanced search`, `KB: Search by ISBN`), ribbon icon, or right-click selected text
2. **Select**: Browse results, click "Insert" on chosen book
3. **Done**: Note created with metadata, cover downloads automatically

**Advanced Search**: Combine criteria (Title, Author, ISBN, Series, Subject, Publisher, Year, Language), choose ALL/ANY match mode, preview CQL query

## Template Guide

### Variables
`{{title}}`, `{{author}}`, `{{authors}}`, `{{authorsString}}`, `{{isbn}}`, `{{publishYear}}`, `{{publisher}}`, `{{language}}`, `{{description}}`, `{{subjects}}`, `{{subjectsString}}`, `{{pageCount}}`, `{{targetAge}}`, `{{series}}`, `{{coverUrl}}`, `{{localCoverImage}}`, `{{identifier}}`, `{{DATE:format}}`

### Example Template
```markdown
---
title: "{{title}}"
authors: {{#each authors}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}
isbn: "{{isbn}}"
publishYear: {{publishYear}}
dateAdded: {{DATE:YYYY-MM-DD}}
---

# {{title}}
{{#if localCoverImage}}![[{{localCoverImage}}|200]]{{/if}}

**By:** {{authorsString}} | **Published:** {{publishYear}}
{{#if pageCount}}**Pages:** {{pageCount}}{{/if}}

{{description}}
```

**Conditionals**: `{{#if var}}...{{else}}...{{/if}}`, `{{#unless var}}...{{/unless}}`
**Loops**: `{{#each array}}{{this}}{{/each}}` (use `{{@index}}`, `{{@first}}`, `{{@last}}`)
**Inline JS**: `<%= authors.length %>`, `<%= publishYear > 2020 ? "Recent" : "Older" %>`
**Patterns**: `{{title}} - {{author}}`, `{{isbn}}`, `{{publishYear}}/{{title}}`

## Obsidian Bases Integration

Creates compatible YAML frontmatter for database views.

**Properties**: title (Text), authors (List), isbn (Text), publishYear (Number), publisher (Text), language (Text), pageCount (Number), targetAge (Text), subjects (List), status (Select), rating (Number), dateAdded (Date)

**Example Filters**: `status = "reading"`, `rating >= 4`, `publishYear >= 2020`, `authors contains "Author Name"`
**Example Formulas**: `(today() - dateAdded) / 86400000` (days since added), `year(today()) - publishYear` (years old)
**Group By**: Status, Author, Year, Age Group, Subject

## Settings

**Templates**: Enable/disable, select template file, customize filename pattern, preview with sample data
**Search**: Prioritize children's books (filters by `dc.subject=Jeugd` and `dc.subject=Fictie`)
**Files**: Book notes folder, attachment folder, cover downloads (enable/disable, filename pattern, deduplication, fallback URL), default author

## Example Templates

See `examples/templates/`: **Basic-Book-Note.md** (simple), **Advanced-Book-Note.md** (full-featured with conditionals/scripts), **Bases-Compatible-Note.md** (optimized for Obsidian Bases). Copy to vault and select in Settings → Template Settings.

## Installation

**BRAT** (Recommended): Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) → Command Palette → "BRAT: Add a beta plugin" → Enter `w36zl/obs-kb-kinderboeken` → Enable in Settings

**Manual**: Download from [Releases](https://github.com/w36zl/obs-kb-kinderboeken/releases) → Extract to `.obsidian/plugins/obs-kb-kinderboeken/` → Restart Obsidian → Enable plugin

## Development

```bash
npm install    # Install dependencies
npm run build  # Build plugin
npm run dev    # Watch mode
npm test       # Run tests
npm run lint   # Lint code
```

## APIs

**KB SRU**: `jsru.kb.nl/sru/sru` (GGC collection, SRU 1.2, Dublin Core XML) - [Docs](http://jsru.kb.nl/)
**Open Library Covers**: `covers.openlibrary.org/b/isbn/{ISBN}-L.jpg` - [Docs](https://openlibrary.org/dev/docs/api/covers)

## License & Contributing

MIT License. Contributions welcome - fork, branch, test, PR. [Issues](https://github.com/w36zl/obs-kb-kinderboeken/issues)

---
*Not affiliated with Koninklijke Bibliotheek or Open Library*
