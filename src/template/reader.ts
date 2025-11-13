import { App, TFile } from "obsidian";

/**
 * Template Reader - Loads template files from the vault
 */
export class TemplateReader {
  constructor(private app: App) {}

  /**
   * Read a template file from the vault
   */
  async readTemplate(templatePath: string): Promise<string | null> {
    try {
      const file = this.app.vault.getAbstractFileByPath(templatePath);

      if (!file || !(file instanceof TFile)) {
        console.error("[KB Plugin] Template file not found:", templatePath);
        return null;
      }

      const content = await this.app.vault.read(file);
      return content;
    } catch (error) {
      console.error("[KB Plugin] Error reading template:", error);
      return null;
    }
  }

  /**
   * Check if a template file exists
   */
  async templateExists(templatePath: string): Promise<boolean> {
    const file = this.app.vault.getAbstractFileByPath(templatePath);
    return file instanceof TFile;
  }

  /**
   * Get the default template
   * Returns a hard-coded default if no template file is configured
   */
  getDefaultTemplate(): string {
    return `---
title: "{{title}}"
author: "{{author}}"
authors:
{{#if authors}}
{{#each authors}}
  - "{{this}}"
{{/each}}
{{else}}
  - "Unknown Author"
{{/if}}
isbn: "{{isbn}}"
publishYear: "{{publishYear}}"
publisher: "{{publisher}}"
language: "{{language}}"
subjects:
{{#if subjects}}
{{#each subjects}}
  - "{{this}}"
{{/each}}
{{/if}}
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
rating: ""
{{#if localCoverImage}}
cover: "{{localCoverImage}}"
{{/if}}
{{#if pageCount}}
pageCount: "{{pageCount}}"
{{/if}}
{{#if targetAge}}
targetAge: "{{targetAge}}"
{{/if}}
{{#if series}}
series: "{{series}}"
{{/if}}
tags:
  - books
{{#if subjects}}
{{#each subjects}}
  - books/{{this}}
{{/each}}
{{/if}}
---

# {{title}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

{{#if authors}}
**Authors:** {{authorsString}}
{{/if}}
{{#if publishYear}}
**Published:** {{publishYear}}
{{/if}}
{{#if publisher}}
**Publisher:** {{publisher}}
{{/if}}
{{#if isbn}}
**ISBN:** {{isbn}}
{{/if}}
{{#if language}}
**Language:** {{language}}
{{/if}}
{{#if targetAge}}
**Target Age:** {{targetAge}}
{{/if}}
{{#if pageCount}}
**Page Count:** {{pageCount}}
{{/if}}
{{#if series}}
**Series:** {{series}}
{{/if}}

## Description

{{#if description}}
{{description}}
{{else}}
No description available.
{{/if}}

## My Notes



## Reading Progress

- [ ] Started reading
- [ ] Finished reading
- [ ] Added rating
- [ ] Wrote review

---

*Book added via KB Nederlandse Kinderboeken plugin on {{DATE:YYYY-MM-DD}}*
`;
  }
}
