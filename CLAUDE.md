# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin (`obs-kb-kinderboeken`) that integrates with the Koninklijke Bibliotheek (Royal Library of the Netherlands) APIs to fetch metadata and cover images for Dutch children's books.

## Improvement Focus

To make the app more user friendly and configurable, prioritize the following initiatives:

### 1. Configurable Note & Metadata Templates
- Replace the hard-coded YAML builder in `src/modal.ts` with a template-driven system. Let users pick a template file from their vault and use placeholders such as `{{title}}`, `{{authors}}`, `{{publishYear}}`, `{{DATE:YYYY-MM-DD}}`, etc.
- Offer separate templates for frontmatter and body, plus a configurable file-name pattern (e.g., `{{title}} - {{author}}`).
- Provide inline helpers for optional cover embeds (`{{coverUrl}}` / `{{localCoverImage}}`) and allow simple conditional or inline-script blocks.

### 2. Settings Experience
- Expand `KBSettingTab` with inputs for template file selection, file-name format, toggleable metadata fields, and a live preview that renders the template with sample data.
- Remember the last-used search mode/query and expose toggles for “insert into current note” vs “create a new note.”

### 3. Template Runtime Enhancements
- Add utilities similar to `replaceVariableSyntax`, date helpers, and optional inline script execution (see [anpigon/obsidian-book-search-plugin](https://github.com/anpigon/obsidian-book-search-plugin) `src/utils/template.ts` & `src/utils/utils.ts` for reference).
- Support running the Templater plugin automatically after note creation if it is installed in the user’s vault.

### 4. Cover & Asset Handling
- Allow users to set cover download paths/patterns, deduplicate existing covers, and automatically embed them when the template references `{{localCoverImage}}`.
- Provide fallbacks (placeholder image or remote link) when no cover is available.

### 5. Documentation & Samples
- Ship example templates under `examples/` and extend `README.md` with a “Template Cookbook” that lists all available placeholders plus Dataview snippets.
- Note testing expectations (Vitest unit tests for the template helper and API parsing).

## Template Inspiration Notes

The referenced project [anpigon/obsidian-book-search-plugin](https://github.com/anpigon/obsidian-book-search-plugin) demonstrates:
- File/folder suggesters in settings, simplifying template selection.
- Placeholder replacement via `{{variable}}`, date arithmetic helpers, and inline `<%=%>` script blocks.
- Optional cover download toggles and variables (`{{localCoverImage}}`) that templates can embed directly.
- Ability to rerun the Templater community plugin after file creation for advanced workflows.

## Development Workflow

### Quick Local Testing

This project uses a clean local testing workflow for rapid development.

**Plugin Location**: `/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/`

**Workflow**:
1. Make code changes
2. Run `npm run build`
3. Plugin auto-reloads in Obsidian (or manually reload)
4. Test changes
5. When satisfied, run `./push-version.sh <version> <message>`

### Push Script

Use `push-version.sh` to commit and deploy in one command:

```bash
./push-version.sh 1.6.3 "feat: add query expansion"
```

This script:
1. ✅ Git commits all changes
2. ✅ Tags with version number (v1.6.3)
3. ✅ Copies 3 files to plugin folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
4. ✅ Keeps plugin folder clean (no source files)

**What's NOT copied** (to keep folder lean):
- Source files (`src/`)
- `main.js.map` (source map)
- `main.d.ts` (type definitions)
- Configuration files
- Test files

### Git Version Control

All commits and tags stay in local git repo (no GitHub push):

```bash
git log --oneline        # See commit history
git tag                  # List all versions
git show v1.6.3          # See what changed
```

## Development Commands

```bash
# Build the plugin
npm run build

# Watch mode for development (auto-rebuild on changes)
npm run dev

# Lint TypeScript files
npm run lint

# Run tests
npm test

# Clean build artifacts
npm run clean

# Package plugin for distribution
npm run package

# Push version to git and plugin folder (custom)
./push-version.sh <version> <message>
```

## Architecture

### Build System
- Uses `tsup` for bundling TypeScript into a single `main.js` file
- The built output (`main.js`, `main.d.ts`) is placed in the project root for Obsidian to load
- ESLint configured with TypeScript support and Prettier integration

### Dependencies
- `fast-xml-parser`: For parsing XML responses from the KB APIs
- `yaml`: For YAML processing (likely for frontmatter in Obsidian notes)
- `obsidian`: Type definitions for Obsidian plugin API

### Testing
- Uses Vitest for running tests
- Test files should be placed in the `tests/` directory

## Plugin Structure

When developing this plugin, note that:
- Obsidian plugins expect `main.js` at the project root
- The plugin will interact with the Koninklijke Bibliotheek APIs to fetch book data
- Source files should be placed in `src/`
