# KB Nederlandse Kinderboeken Plugin

An Obsidian plugin that fetches metadata and cover images for Dutch children's books from the Koninklijke Bibliotheek (Royal Library of the Netherlands) APIs.

## Features

- **Multiple Search Methods**
  - Search by book title or author name
  - Direct ISBN lookup (supports both ISBN-10 and ISBN-13)

- **Multiple Ways to Access**
  - Command palette commands
  - Ribbon icon in the sidebar
  - Context menu (right-click on selected text)

- **Rich Metadata**
  - Automatically inserts comprehensive YAML frontmatter including:
    - Title and author(s)
    - ISBN
    - Publisher and publication year
    - Language
    - Description/summary
    - Subjects and tags
    - Series information (when available)
    - Page count and target age (when available)

- **Cover Images**
  - Optional automatic download of book covers
  - Configurable storage location in your vault

## Usage

### Search for a Book

1. **Via Command Palette** (Ctrl/Cmd + P):
   - Type "KB" to see available commands
   - Select "Search for book" or "Search by ISBN"

2. **Via Ribbon Icon**:
   - Click the book icon in the left sidebar

3. **Via Context Menu**:
   - Select text in your note (book title, author, or ISBN)
   - Right-click and choose "Search KB for book"

### Insert Metadata

1. Search results will appear in a modal window
2. Browse the results to find the correct book
3. Click "Insert" on your chosen book
4. The plugin will:
   - Insert YAML frontmatter at the top of your current note
   - Download the cover image (if enabled in settings)

## Settings

Access plugin settings via Settings → KB Nederlandse Kinderboeken:

- **Download cover images**: Toggle automatic cover image downloads
- **Attachment folder**: Choose where to store downloaded cover images
- **Default author**: Set a fallback author name for books without author metadata

## Installation

### Manual Installation

1. Download the latest release files:
   - `main.js`
   - `manifest.json`
   - `styles.css`

2. Create a folder named `obs-kb-kinderboeken` in your vault's `.obsidian/plugins/` directory

3. Copy the downloaded files into the new folder

4. Restart Obsidian or reload plugins

5. Enable the plugin in Settings → Community Plugins

### Development

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

# Package for distribution
npm run package
```

## API Information

This plugin uses the Koninklijke Bibliotheek SRU (Search/Retrieve via URL) API:

- **Endpoint**: `http://jsru.kb.nl/sru`
- **Collection**: GGC (Gemeenschappelijk Geautomatiseerd Catalogussysteem)
- **Protocol**: SRU 1.2
- **Metadata Format**: Dublin Core (XML)

## Support

For issues, feature requests, or questions, please file an issue on the GitHub repository.

## License

MIT

## Author

win36
