# KB Nederlandse Kinderboeken Plugin

An Obsidian plugin that fetches metadata and cover images for Dutch children's books from the Koninklijke Bibliotheek (Royal Library of the Netherlands) APIs.

## ✨ Features

### Search & Metadata
- **Multiple Search Methods**
  - **Simple Search** - Search by book title or author name
  - **Advanced Search** - Form-based complex query builder with multiple criteria
  - **Direct ISBN lookup** - Supports both ISBN-10 and ISBN-13
  - **Children's Book Prioritization** - Optional filtering for youth literature (Jeugd subject)

- **Advanced Search Features**
  - Combine multiple search criteria (Title, Author, ISBN, Series, Subject, Publisher, Year range, Language)
  - Choose match mode: ALL (AND) or ANY (OR)
  - Live query preview showing generated CQL
  - Filter by children's books only

- **Multiple Access Points**
  - Command palette commands
  - Ribbon icon in the sidebar
  - Context menu (right-click on selected text)

- **Rich Metadata**
  - Title and author(s)
  - ISBN, Publisher, and Publication year
  - Language and Description
  - Subjects, Series information
  - Page count and Target age

### Template System
- **Customizable Templates**
  - Use your own template files from your vault
  - Simple `{{variable}}` placeholder syntax
  - Conditional logic with `{{#if}}`, `{{#unless}}`, `{{#else}}`
  - Array loops with `{{#each}}`
  - Inline JavaScript with `<%=%>` syntax
  - Date helpers like `{{DATE:YYYY-MM-DD}}`

- **Flexible File Naming**
  - Customizable filename patterns
  - Example: `{{title}} - {{author}}`, `{{isbn}}`, `{{publishYear}}/{{title}}`

### Cover Management
- **Intelligent Cover Downloads**
  - Multi-source cover fallback system:
    1. Open Library (primary)
    2. Google Books API
    3. Amazon image servers
    4. **Bol.com** (Dutch bookstore - high quality 550x550px images)
  - Customizable cover filename patterns
  - Optional deduplication to save bandwidth
  - Configurable fallback for missing covers

### Integrations
- **Templater Plugin Support**
  - Automatic detection and execution
  - Run Templater after note creation
  - Combine both plugins for advanced workflows

- **Obsidian Bases Compatible**
  - Properly formatted YAML frontmatter
  - Works with database views
  - See examples for filter and formula ideas

## 📖 Quick Start

### 1. Search for a Book

**Via Command Palette** (Ctrl/Cmd + P):
```
KB: Search for book             # Simple search by title/author
KB: Advanced search for books   # Form-based complex search
KB: Search by ISBN              # Direct ISBN lookup
```

**Via Ribbon Icon**: Click the book icon in the left sidebar

**Via Context Menu**: Select text → Right-click → "Search KB for book"

### 2. Select and Insert

1. Browse search results in the modal
2. Click "Insert" (or "Select this book" in advanced search) on your chosen book
3. Plugin creates a new note with all metadata
4. Cover image downloads automatically (if enabled)

### 3. Advanced Search Guide

Use the advanced search modal for complex queries:

1. Open via command palette: "KB: Advanced search for books"
2. Fill in any combination of search fields:
   - **Title**: Search in book titles
   - **Author**: Search by author name
   - **ISBN**: Exact ISBN match
   - **Series**: Find books in a series
   - **Subject**: Search by topic/subject
   - **Publisher**: Filter by publisher
   - **Year range**: Publication year from/to
   - **Language**: Filter by language
3. Choose match mode:
   - **ALL (AND)**: Books must match all filled criteria
   - **ANY (OR)**: Books can match any filled criteria
4. Click "Preview Query" to see the generated CQL query
5. Click "Search" to execute
6. Select a book from results to create a note

## 🎨 Template Cookbook

### Available Variables

All template variables support the `{{variable}}` syntax:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{title}}` | Book title | De Gruffalo |
| `{{author}}` | First author | Julia Donaldson |
| `{{authors}}` | All authors (array) | ["Julia Donaldson", "Axel Scheffler"] |
| `{{authorsString}}` | Authors as string | Julia Donaldson, Axel Scheffler |
| `{{isbn}}` | ISBN number | 9789047704539 |
| `{{publishYear}}` | Publication year | 2014 |
| `{{publisher}}` | Publisher name | Lemniscaat |
| `{{language}}` | Language | Nederlands |
| `{{description}}` | Book description | Een muis loopt door... |
| `{{subjects}}` | Subject tags (array) | ["Prentenboeken", "Vriendschap"] |
| `{{subjectsString}}` | Subjects as string | Prentenboeken, Vriendschap |
| `{{pageCount}}` | Number of pages | 32 |
| `{{targetAge}}` | Target age range | 4-6 jaar |
| `{{series}}` | Book series name | Mijn eerste Gruffalo |
| `{{coverUrl}}` | Remote cover URL | https://covers.openlibrary.org/... |
| `{{localCoverImage}}` | Local cover path | attachments/de-gruffalo-cover.jpg |
| `{{identifier}}` | KB identifier | PPN:376974923 |
| `{{DATE:format}}` | Current date | 2025-11-13 |

### Basic Template Example

```markdown
---
title: "{{title}}"
author: "{{author}}"
isbn: "{{isbn}}"
publishYear: "{{publishYear}}"
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
tags:
  - books
---

# {{title}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

**By:** {{authorsString}}
**Published:** {{publishYear}}

## Description

{{description}}

## My Notes
```

### Conditional Logic

**Show/hide fields based on availability:**

```markdown
{{#if pageCount}}
**Pages:** {{pageCount}}
{{/if}}

{{#if description}}
{{description}}
{{else}}
No description available.
{{/if}}

{{#unless isbn}}
⚠️ No ISBN available
{{/unless}}
```

### Array Loops

**Iterate over authors:**

```markdown
authors:
{{#if authors}}
{{#each authors}}
  - "{{this}}"
{{/each}}
{{else}}
  - "Unknown Author"
{{/if}}
```

**Create tags from subjects:**

```markdown
tags:
  - books
{{#each subjects}}
  - books/{{this}}
{{/each}}
```

**Advanced loop with context:**

```markdown
{{#each authors}}
- {{this}} (Author #{{@index}}){{#if @last}} - Lead Author{{/if}}
{{/each}}
```

### Inline Scripts

**Execute JavaScript expressions:**

```markdown
**Author Count:** <%= authors.length %>

**Recent Book:** <%= publishYear > 2020 ? "Yes ✓" : "No" %>

**By:** <%= authors.slice(0, 2).join(", ") %><%= authors.length > 2 ? ` and ${authors.length - 2} more` : "" %>

**Reading Level:** <%= targetAge || "All Ages" %>
```

### Date Formatting

```markdown
dateAdded: {{DATE:YYYY-MM-DD}}
dateAddedLong: {{DATE:YYYY-MM-DD HH:mm:ss}}
yearOnly: {{DATE:YYYY}}
```

### Filename Patterns

Configure in Settings → Template Settings → Filename pattern:

```
{{title}}                    → De Gruffalo.md
{{title}} - {{author}}       → De Gruffalo - Julia Donaldson.md
{{isbn}}                     → 9789047704539.md
{{publishYear}}/{{title}}    → 2014/De Gruffalo.md
```

### Cover Filename Patterns

Configure in Settings → File & Folder Settings → Cover filename pattern:

```
{{title}}-cover              → de-gruffalo-cover.jpg
{{isbn}}-cover               → 9789047704539-cover.jpg
{{author}}/{{title}}         → julia-donaldson/de-gruffalo-cover.jpg
```

## 📊 Obsidian Bases Integration

The plugin creates YAML frontmatter compatible with Obsidian Bases for database-like views.

### Recommended Property Types

When creating a Base view, configure these property types:

| Property | Type | Notes |
|----------|------|-------|
| title | Text | Book title |
| authors | List | Multiple authors |
| isbn | Text | ISBN identifier |
| publishYear | Number | Year published |
| publisher | Text | Publisher name |
| language | Text | Book language |
| pageCount | Number | Number of pages |
| targetAge | Text | Age recommendation |
| subjects | List | Subject categories |
| status | Select | to-read, reading, finished |
| rating | Number | Your rating (0-5) |
| progress | Number | Reading progress % |
| dateAdded | Date | When added to vault |
| dateStarted | Date | When you started reading |
| dateFinished | Date | When you finished |
| cover | Text | Cover image path |

### Useful Filters

Create filtered views in Bases:

```
Currently Reading:
  status = "reading"

Highly Rated:
  rating >= 4

Recent Books:
  publishYear >= 2020

Books for Young Children:
  targetAge contains "4-6"

By Favorite Author:
  authors contains "Julia Donaldson"

Unfinished:
  status != "finished" AND dateAdded < today() - 30 days

Long Books:
  pageCount > 100
```

### Formulas

Use formulas in Bases for calculated fields:

```javascript
// Days since added
(today() - dateAdded) / 86400000

// Reading progress display
progress + "%"

// Age group
if(targetAge, targetAge, "All Ages")

// Reading status badge
if(status == "finished", "✓ Done", if(status == "reading", "📖 Reading", "📚 To Read"))

// Years since published
year(today()) - publishYear

// Author count
size(authors)
```

### Group By Examples

Create organized views:

- **By Status**: Group by `status` to see to-read / reading / finished
- **By Author**: Group by `authors` to organize by favorite authors
- **By Year**: Group by `publishYear` to see books by publication year
- **By Age Group**: Group by `targetAge` to organize by reading level
- **By Subject**: Group by `subjects` to categorize by topic

## ⚙️ Settings

### Template Settings

- **Use template**: Enable/disable template system
- **Template file path**: Select your custom template file ([Browse])
- **Filename pattern**: Customize note filenames with `{{variables}}`
- **Preview template**: See how your template renders with sample data

### Search Preferences
- **Prioritize Children's Books**
  - When enabled, searches prioritize books with youth/children's literature subjects
  - Uses `dc.subject=Jeugd` (Youth) and `dc.subject=Fictie` (Fiction) filters
  - Helps find more children's books but may miss some adult books with similar titles
  - Useful for children's book collectors and educators

### File & Folder Settings

- **Book notes folder**: Where to create book notes ([Browse])
- **Download cover images**: Toggle automatic cover downloads
  - **Cover filename pattern**: Customize cover filenames
  - **Deduplicate covers**: Skip re-downloading existing covers
  - **Cover fallback URL**: Placeholder image for missing covers
- **Attachment folder**: Where to store cover images ([Browse])
- **Default author**: Fallback for books without author info

## 📁 Example Templates

Three example templates are included in `examples/templates/`:

1. **Basic-Book-Note.md**
   - Simple template with essential fields
   - Good starting point for customization

2. **Advanced-Book-Note.md**
   - Full-featured template with conditionals
   - Includes reading progress tracking
   - Uses inline scripts for advanced formatting

3. **Bases-Compatible-Note.md**
   - Optimized for Obsidian Bases
   - Properly formatted properties
   - Includes usage guide and filter examples

To use:
1. Copy desired template to your vault
2. Settings → Template Settings → Template file path
3. Browse and select the template

## 🚀 Installation

### Via BRAT (Recommended)

1. Install [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Open Command Palette (Ctrl/Cmd + P)
3. Run "BRAT: Add a beta plugin for testing"
4. Enter: `w36zl/obs-kb-kinderboeken`
5. Enable the plugin in Settings → Community Plugins

### Manual Installation

1. Download latest release from [Releases page](https://github.com/w36zl/obs-kb-kinderboeken/releases)
2. Extract `main.js`, `manifest.json`, `styles.css`
3. Create folder: `.obsidian/plugins/obs-kb-kinderboeken/`
4. Copy files to the folder
5. Restart Obsidian
6. Enable in Settings → Community Plugins

## 🔧 Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## 🌐 API Information

This plugin uses two APIs:

### Koninklijke Bibliotheek SRU API
- **Endpoint**: `https://jsru.kb.nl/sru/sru`
- **Collection**: GGC (Gemeenschappelijk Geautomatiseerd Catalogussysteem)
- **Protocol**: SRU 1.2
- **Metadata Format**: Dublin Core (XML)
- **Documentation**: [KB SRU Documentation](http://jsru.kb.nl/)

### Open Library Covers API
- **Endpoint**: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- **Purpose**: Book cover images
- **Size**: `-L` suffix for large (500px) covers
- **Documentation**: [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**win36**

For issues, feature requests, or questions, please [file an issue](https://github.com/w36zl/obs-kb-kinderboeken/issues) on GitHub.

---

**Note**: This plugin is not officially affiliated with the Koninklijke Bibliotheek or Open Library.
