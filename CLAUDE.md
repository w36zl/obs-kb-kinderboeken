# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin (`obs-kb-kinderboeken`) that integrates with the Koninklijke Bibliotheek (Royal Library of the Netherlands) APIs to fetch metadata and cover images for Dutch children's books.

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
