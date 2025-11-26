/**
 * FacetPanel - UI component for displaying and interacting with facets
 *
 * Renders facet groups with checkboxes, histograms, and "show more" functionality
 */

import { SearchFacets, Facet, FacetValue, YearFacet, ActiveFacetFilter } from '../search/FacetTypes';

export class FacetPanel {
  private containerEl: HTMLElement;
  private facets: SearchFacets | null = null;
  private onFacetChange: (facetId: string, value: string) => void;
  private onClearAll: () => void;

  constructor(
    containerEl: HTMLElement,
    onFacetChange: (facetId: string, value: string) => void,
    onClearAll: () => void
  ) {
    this.containerEl = containerEl;
    this.onFacetChange = onFacetChange;
    this.onClearAll = onClearAll;
  }

  /**
   * Render the facet panel
   */
  render(facets: SearchFacets, activeFacets: ActiveFacetFilter[]): void {
    this.facets = facets;
    this.containerEl.empty();
    this.containerEl.addClass('kb-facet-panel');

    // Header with title and clear button
    const header = this.containerEl.createDiv('kb-facet-header');
    header.createEl('h3', { text: '📊 Refine Results', cls: 'kb-facet-title' });

    if (activeFacets.length > 0) {
      const clearBtn = header.createEl('button', {
        text: 'Clear all',
        cls: 'kb-facet-clear-all',
      });
      clearBtn.onclick = () => this.onClearAll();
    }

    // Active facet chips
    if (activeFacets.length > 0) {
      const chipsContainer = this.containerEl.createDiv('kb-facet-chips');
      this.renderActiveChips(chipsContainer, activeFacets);
    }

    // Result count (filled in by parent component)
    const countEl = this.containerEl.createDiv('kb-facet-result-count');
    countEl.id = 'kb-facet-result-count';

    // Facet groups
    const groupsContainer = this.containerEl.createDiv('kb-facet-groups');

    // Render each facet group
    this.renderFacetGroup(groupsContainer, facets.authors);
    this.renderFacetGroup(groupsContainer, facets.series);
    this.renderFacetGroup(groupsContainer, facets.subjects);
    this.renderYearFacet(groupsContainer, facets.years);
    this.renderFacetGroup(groupsContainer, facets.publishers);
    this.renderFacetGroup(groupsContainer, facets.languages);
  }

  /**
   * Render active facet filter chips
   */
  private renderActiveChips(container: HTMLElement, activeFacets: ActiveFacetFilter[]): void {
    activeFacets.forEach(filter => {
      const chip = container.createDiv('kb-facet-chip');

      const label = chip.createSpan('kb-facet-chip-label');
      label.textContent = `${filter.facetLabel}: ${filter.valueLabel}`;

      const removeBtn = chip.createSpan('kb-facet-chip-remove');
      removeBtn.textContent = '×';
      removeBtn.onclick = () => this.onFacetChange(filter.facetId, filter.value);
    });
  }

  /**
   * Render a standard facet group (authors, publishers, etc.)
   */
  private renderFacetGroup(container: HTMLElement, facet: Facet): void {
    if (facet.values.length === 0) return;

    const groupEl = container.createDiv('kb-facet-group');

    // Header with collapse toggle
    const headerEl = groupEl.createDiv('kb-facet-group-header');
    headerEl.onclick = () => this.toggleCollapsed(groupEl, facet);

    const toggleIcon = headerEl.createSpan('kb-facet-toggle-icon');
    toggleIcon.textContent = facet.collapsed ? '▶' : '▼';

    const titleEl = headerEl.createSpan('kb-facet-group-title');
    titleEl.textContent = facet.label;

    const countEl = headerEl.createSpan('kb-facet-group-count');
    countEl.textContent = `(${facet.values.length})`;

    if (facet.collapsed) {
      groupEl.addClass('kb-facet-collapsed');
      return;
    }

    // Values list
    const valuesEl = groupEl.createDiv('kb-facet-values');

    const visibleValues = facet.showAll
      ? facet.values
      : facet.values.slice(0, this.getVisibleCount(facet.id));

    visibleValues.forEach(value => {
      this.renderFacetValue(valuesEl, facet.id, value);
    });

    // Show more/less button
    if (facet.values.length > this.getVisibleCount(facet.id)) {
      const showMoreBtn = valuesEl.createEl('button', {
        text: facet.showAll ? 'Show less' : `Show ${facet.values.length - this.getVisibleCount(facet.id)} more...`,
        cls: 'kb-facet-show-more',
      });
      showMoreBtn.onclick = () => this.toggleShowAll(facet);
    }
  }

  /**
   * Render a single facet value with checkbox
   */
  private renderFacetValue(
    container: HTMLElement,
    facetId: string,
    value: FacetValue
  ): void {
    const valueEl = container.createDiv('kb-facet-value');

    const checkbox = valueEl.createEl('input', { type: 'checkbox' });
    checkbox.checked = value.selected;
    checkbox.onchange = () => this.onFacetChange(facetId, value.value);

    const labelEl = valueEl.createEl('label');
    labelEl.textContent = value.label;
    labelEl.onclick = () => {
      checkbox.checked = !checkbox.checked;
      this.onFacetChange(facetId, value.value);
    };

    const countEl = valueEl.createSpan('kb-facet-value-count');
    countEl.textContent = `(${value.count})`;
  }

  /**
   * Render year facet with histogram
   */
  private renderYearFacet(container: HTMLElement, facet: YearFacet): void {
    if (facet.values.length === 0) return;

    const groupEl = container.createDiv('kb-facet-group kb-facet-year-group');

    // Header
    const headerEl = groupEl.createDiv('kb-facet-group-header');
    headerEl.onclick = () => this.toggleCollapsed(groupEl, facet);

    const toggleIcon = headerEl.createSpan('kb-facet-toggle-icon');
    toggleIcon.textContent = facet.collapsed ? '▶' : '▼';

    const titleEl = headerEl.createSpan('kb-facet-group-title');
    titleEl.textContent = facet.label;

    if (facet.collapsed) {
      groupEl.addClass('kb-facet-collapsed');
      return;
    }

    // Histogram
    const histogramEl = groupEl.createDiv('kb-facet-histogram');

    const barsEl = histogramEl.createDiv('kb-facet-histogram-bars');
    facet.histogram.forEach(bin => {
      const barEl = barsEl.createDiv('kb-facet-histogram-bar');
      barEl.style.height = `${bin.height}%`;
      barEl.title = `${bin.year}: ${bin.count} book${bin.count === 1 ? '' : 's'}`;
    });

    const axisEl = histogramEl.createDiv('kb-facet-histogram-axis');
    axisEl.createSpan().textContent = facet.minYear.toString();
    axisEl.createSpan().textContent = facet.maxYear.toString();

    // Year range values
    const valuesEl = groupEl.createDiv('kb-facet-values');

    const visibleValues = facet.showAll
      ? facet.values
      : facet.values.slice(0, 5);

    visibleValues.forEach(value => {
      this.renderFacetValue(valuesEl, facet.id, value);
    });

    // Show more/less
    if (facet.values.length > 5) {
      const showMoreBtn = valuesEl.createEl('button', {
        text: facet.showAll ? 'Show less' : `Show ${facet.values.length - 5} more...`,
        cls: 'kb-facet-show-more',
      });
      showMoreBtn.onclick = () => this.toggleShowAll(facet);
    }
  }

  /**
   * Toggle collapsed state of a facet group
   */
  private toggleCollapsed(groupEl: HTMLElement, facet: Facet): void {
    facet.collapsed = !facet.collapsed;

    if (this.facets) {
      this.render(this.facets, []); // Re-render to update UI
    }
  }

  /**
   * Toggle show all values for a facet
   */
  private toggleShowAll(facet: Facet): void {
    facet.showAll = !facet.showAll;

    if (this.facets) {
      this.render(this.facets, []); // Re-render to update UI
    }
  }

  /**
   * Get visible count for a facet type
   */
  private getVisibleCount(facetId: string): number {
    const defaults: Record<string, number> = {
      authors: 10,
      publishers: 8,
      subjects: 12,
      series: 8,
      languages: 5,
    };

    return defaults[facetId] || 10;
  }

  /**
   * Update result count display
   */
  updateResultCount(filteredCount: number, totalCount: number): void {
    const countEl = this.containerEl.querySelector('#kb-facet-result-count');
    if (countEl) {
      if (filteredCount === totalCount) {
        countEl.textContent = `Showing all ${totalCount} results`;
      } else {
        countEl.textContent = `Showing ${filteredCount} of ${totalCount} results`;
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.containerEl.empty();
  }
}
