import { KBBookMetadata } from "../types";

/**
 * Template Engine for KB Kinderboeken Plugin
 * Supports {{variable}} placeholders and basic helpers
 */
export class TemplateEngine {
  /**
   * Render a template with book metadata
   */
  render(template: string, metadata: KBBookMetadata, additionalData: Record<string, any> = {}): string {
    let result = template;

    // Prepare data object with all available variables
    const data = this.prepareData(metadata, additionalData);

    // Process conditional blocks {{#if}}, {{#unless}}
    result = this.processConditionals(result, data);

    // Process loop blocks {{#each}}
    result = this.processLoops(result, data);

    // Replace all {{variable}} placeholders
    result = this.replacePlaceholders(result, data);

    // Process date helpers like {{DATE:YYYY-MM-DD}}
    result = this.processDateHelpers(result);

    // Process inline scripts <%=%>
    result = this.processInlineScripts(result, data);

    return result;
  }

  /**
   * Prepare data object from metadata
   */
  private prepareData(metadata: KBBookMetadata, additionalData: Record<string, any>): Record<string, any> {
    const data: Record<string, any> = {
      ...additionalData,
      title: metadata.title || "",
      isbn: metadata.isbn || "",
      publisher: metadata.publisher || "",
      publishYear: metadata.publishYear || "",
      language: metadata.language || "",
      description: metadata.description || "",
      identifier: metadata.identifier || "",
      pageCount: metadata.pageCount || "",
      targetAge: metadata.targetAge || "",
      series: metadata.series || "",
      coverUrl: metadata.coverUrl || "",
      localCoverImage: metadata.localCoverImage || "",
    };

    // Handle arrays - provide both array and string versions
    if (metadata.authors && metadata.authors.length > 0) {
      data.authors = metadata.authors;
      data.authorsString = metadata.authors.join(", ");
      data.author = metadata.authors[0]; // First author for convenience
    } else {
      data.authors = [];
      data.authorsString = "";
      data.author = "";
    }

    if (metadata.subjects && metadata.subjects.length > 0) {
      data.subjects = metadata.subjects;
      data.subjectsString = metadata.subjects.join(", ");
    } else {
      data.subjects = [];
      data.subjectsString = "";
    }

    return data;
  }

  /**
   * Replace {{variable}} placeholders with values
   */
  private replacePlaceholders(template: string, data: Record<string, any>): string {
    let result = template;

    // Match {{variable}} patterns
    const placeholderRegex = /\{\{([^}]+)\}\}/g;

    result = result.replace(placeholderRegex, (match, key) => {
      const trimmedKey = key.trim();

      // Handle array access like {{authors.[0]}}
      if (trimmedKey.includes("[")) {
        return this.handleArrayAccess(trimmedKey, data);
      }

      // Handle property access like {{authors.length}}
      if (trimmedKey.includes(".")) {
        return this.handlePropertyAccess(trimmedKey, data);
      }

      // Simple variable replacement
      const value = data[trimmedKey];

      if (value === undefined || value === null) {
        return ""; // Return empty string for undefined values
      }

      // If it's an array, join with commas
      if (Array.isArray(value)) {
        return value.join(", ");
      }

      return String(value);
    });

    return result;
  }

  /**
   * Handle array access like {{authors.[0]}}
   */
  private handleArrayAccess(key: string, data: Record<string, any>): string {
    const match = key.match(/^([^[]+)\[(\d+)\]$/);
    if (!match) return "";

    const [, arrayName, indexStr] = match;
    const index = parseInt(indexStr, 10);
    const array = data[arrayName.trim()];

    if (!Array.isArray(array) || index >= array.length) {
      return "";
    }

    return String(array[index]);
  }

  /**
   * Handle property access like {{authors.length}}
   */
  private handlePropertyAccess(key: string, data: Record<string, any>): string {
    const parts = key.split(".");
    let current: any = data;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return "";
      }
      current = current[part.trim()];
    }

    if (current === undefined || current === null) {
      return "";
    }

    return String(current);
  }

  /**
   * Process date helpers like {{DATE:YYYY-MM-DD}}
   */
  private processDateHelpers(template: string): string {
    let result = template;

    // Match {{DATE:format}} patterns
    const dateRegex = /\{\{DATE:([^}]+)\}\}/g;

    result = result.replace(dateRegex, (match, format) => {
      const now = new Date();
      return this.formatDate(now, format.trim());
    });

    return result;
  }

  /**
   * Format a date according to a format string
   * Supports basic tokens: YYYY, MM, DD, HH, mm, ss
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return format
      .replace("YYYY", String(year))
      .replace("YY", String(year).slice(-2))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * Process conditional blocks like {{#if variable}}...{{/if}}
   */
  private processConditionals(template: string, data: Record<string, any>): string {
    let result = template;

    // Process {{#if variable}}...{{else}}...{{/if}}
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    result = result.replace(ifRegex, (match, condition, trueBlock, falseBlock) => {
      const value = this.evaluateCondition(condition.trim(), data);
      if (value) {
        return trueBlock || "";
      } else {
        return falseBlock || "";
      }
    });

    // Process {{#unless variable}}...{{/unless}}
    const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    result = result.replace(unlessRegex, (match, condition, block) => {
      const value = this.evaluateCondition(condition.trim(), data);
      return !value ? (block || "") : "";
    });

    return result;
  }

  /**
   * Process loop blocks like {{#each array}}...{{/each}}
   */
  private processLoops(template: string, data: Record<string, any>): string {
    let result = template;

    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    result = result.replace(eachRegex, (match, arrayName, block) => {
      const array = data[arrayName.trim()];
      if (!Array.isArray(array) || array.length === 0) {
        return "";
      }

      return array
        .map((item, index) => {
          let itemBlock = block;
          // Replace {{this}} with the current item
          itemBlock = itemBlock.replace(/\{\{this\}\}/g, String(item));
          // Replace {{@index}} with the current index
          itemBlock = itemBlock.replace(/\{\{@index\}\}/g, String(index));
          // Replace {{@first}} and {{@last}}
          itemBlock = itemBlock.replace(/\{\{@first\}\}/g, index === 0 ? "true" : "false");
          itemBlock = itemBlock.replace(/\{\{@last\}\}/g, index === array.length - 1 ? "true" : "false");
          return itemBlock;
        })
        .join("");
    });

    return result;
  }

  /**
   * Process inline script blocks like <%=%>
   */
  private processInlineScripts(template: string, data: Record<string, any>): string {
    let result = template;

    const scriptRegex = /<%=\s*([\s\S]*?)\s*%>/g;
    result = result.replace(scriptRegex, (match, script) => {
      try {
        // Create a function that has access to the data
        const fn = new Function(...Object.keys(data), `return ${script};`);
        const output = fn(...Object.values(data));
        return output !== undefined && output !== null ? String(output) : "";
      } catch (error) {
        console.error("[KB Plugin] Error executing inline script:", error);
        return `[Script Error: ${error.message}]`;
      }
    });

    return result;
  }

  /**
   * Evaluate a conditional expression
   */
  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    const value = this.getNestedValue(condition, data);

    // Falsy values: undefined, null, false, 0, "", []
    if (value === undefined || value === null || value === false) {
      return false;
    }

    if (typeof value === "string" && value.trim() === "") {
      return false;
    }

    if (typeof value === "number" && value === 0) {
      return false;
    }

    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get nested value from data object (e.g., "authors.length")
   */
  private getNestedValue(path: string, data: Record<string, any>): any {
    const parts = path.split(".");
    let current: any = data;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part.trim()];
    }

    return current;
  }

  /**
   * Sanitize a string for use as a filename
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[\\/:*?"<>|]/g, "-") // Replace invalid chars
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Render a filename pattern
   */
  renderFilename(pattern: string, metadata: KBBookMetadata, additionalData: Record<string, any> = {}): string {
    const rendered = this.render(pattern, metadata, additionalData);
    return this.sanitizeFilename(rendered);
  }
}
