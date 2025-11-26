/**
 * SearchSuggestionsUI - UI component for displaying search suggestions
 *
 * Shows a dropdown below the search input with suggestions
 */

import { Suggestion } from '../search/types';

export class SearchSuggestionsUI {
  private containerEl: HTMLElement;
  private suggestionsEl: HTMLElement | null = null;
  private selectedIndex: number = -1;
  private suggestions: Suggestion[] = [];
  private onSelect: (suggestion: Suggestion) => void;

  constructor(containerEl: HTMLElement, onSelect: (suggestion: Suggestion) => void) {
    this.containerEl = containerEl;
    this.onSelect = onSelect;
  }

  /**
   * Show suggestions dropdown
   */
  show(suggestions: Suggestion[]): void {
    this.suggestions = suggestions;
    this.selectedIndex = -1;

    if (suggestions.length === 0) {
      this.hide();
      return;
    }

    // Create or reuse suggestions element
    if (!this.suggestionsEl) {
      this.suggestionsEl = this.containerEl.createDiv('kb-search-suggestions');
    }

    this.suggestionsEl.empty();
    this.suggestionsEl.addClass('kb-search-suggestions-visible');

    // Render suggestions
    suggestions.forEach((suggestion, index) => {
      const item = this.suggestionsEl!.createDiv('kb-suggestion-item');

      // Add type icon
      const icon = item.createSpan('kb-suggestion-icon');
      icon.textContent = this.getIconForType(suggestion.type);

      // Add suggestion text
      const text = item.createDiv('kb-suggestion-text');
      text.textContent = suggestion.text;

      // Add description if available
      if (suggestion.metadata?.description) {
        const desc = item.createDiv('kb-suggestion-description');
        desc.textContent = suggestion.metadata.description;
      }

      // Click handler
      item.addEventListener('click', () => {
        this.onSelect(suggestion);
        this.hide();
      });

      // Mouse hover handler
      item.addEventListener('mouseenter', () => {
        this.setSelected(index);
      });
    });
  }

  /**
   * Hide suggestions dropdown
   */
  hide(): void {
    if (this.suggestionsEl) {
      this.suggestionsEl.removeClass('kb-search-suggestions-visible');
    }
    this.selectedIndex = -1;
  }

  /**
   * Navigate suggestions with keyboard
   */
  navigateUp(): boolean {
    if (this.suggestions.length === 0) return false;

    this.selectedIndex--;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.suggestions.length - 1;
    }

    this.updateSelection();
    return true;
  }

  navigateDown(): boolean {
    if (this.suggestions.length === 0) return false;

    this.selectedIndex++;
    if (this.selectedIndex >= this.suggestions.length) {
      this.selectedIndex = 0;
    }

    this.updateSelection();
    return true;
  }

  /**
   * Select current suggestion
   */
  selectCurrent(): boolean {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      this.onSelect(this.suggestions[this.selectedIndex]);
      this.hide();
      return true;
    }
    return false;
  }

  /**
   * Get the currently selected suggestion (for autocomplete)
   */
  getCurrentSuggestion(): Suggestion | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }

  /**
   * Check if suggestions are visible
   */
  isVisible(): boolean {
    return this.suggestionsEl?.hasClass('kb-search-suggestions-visible') || false;
  }

  /**
   * Update visual selection
   */
  private updateSelection(): void {
    if (!this.suggestionsEl) return;

    const items = this.suggestionsEl.querySelectorAll('.kb-suggestion-item');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.addClass('kb-suggestion-selected');
        // Scroll into view if needed
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.removeClass('kb-suggestion-selected');
      }
    });
  }

  /**
   * Set selected index
   */
  private setSelected(index: number): void {
    this.selectedIndex = index;
    this.updateSelection();
  }

  /**
   * Get icon for suggestion type
   */
  private getIconForType(type: Suggestion['type']): string {
    switch (type) {
      case 'author':
        return '👤';
      case 'series':
        return '📚';
      case 'subject':
        return '🏷️';
      case 'recent':
        return '🕐';
      case 'popular':
        return '⭐';
      default:
        return '🔍';
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.suggestionsEl) {
      this.suggestionsEl.remove();
      this.suggestionsEl = null;
    }
  }
}
