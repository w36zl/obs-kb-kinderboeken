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
authors: "{{authorsString}}"
isbn: "{{isbn}}"
publishYear: "{{publishYear}}"
publisher: "{{publisher}}"
language: "{{language}}"
subjects: "{{subjectsString}}"
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
rating: ""
cover: "{{localCoverImage}}"
pageCount: "{{pageCount}}"
targetAge: "{{targetAge}}"
series: "{{series}}"
tags:
  - books
---

# {{title}}

![[{{localCoverImage}}|200]]

**Authors:** {{authorsString}}
**Published:** {{publishYear}}
**Publisher:** {{publisher}}
**ISBN:** {{isbn}}
**Language:** {{language}}
**Target Age:** {{targetAge}}
**Page Count:** {{pageCount}}

## Description

{{description}}

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
