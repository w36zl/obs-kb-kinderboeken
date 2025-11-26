/**
 * FacetedSearch - Client-side faceted filtering of search results
 *
 * Allows users to refine search results by selecting facets
 * without making additional API calls.
 */

import { KBBookMetadata } from '../types';
import {
  SearchFacets,
  Facet,
  FacetValue,
  YearFacet,
  YearHistogramBin,
  ActiveFacetFilter,
  FacetConfig,
  DEFAULT_FACET_CONFIG,
} from './FacetTypes';

export class FacetedSearch {
  private allResults: KBBookMetadata[];
  private activeFacets: Map<string, Set<string>> = new Map();
  private config: FacetConfig;

  constructor(results: KBBookMetadata[], config?: Partial<FacetConfig>) {
    this.allResults = results;
    this.config = { ...DEFAULT_FACET_CONFIG, ...config };
  }

  /**
   * Update the full result set
   */
  updateResults(results: KBBookMetadata[]): void {
    this.allResults = results;
  }

  /**
   * Build facets from current results
   */
  buildFacets(): SearchFacets {
    // Use filtered results to build facets (so counts reflect active filters)
    const resultsToAnalyze = this.getFilteredResults();

    return {
      authors: this.buildAuthorsFacet(resultsToAnalyze),
      publishers: this.buildPublishersFacet(resultsToAnalyze),
      years: this.buildYearsFacet(resultsToAnalyze),
      subjects: this.buildSubjectsFacet(resultsToAnalyze),
      series: this.buildSeriesFacet(resultsToAnalyze),
      languages: this.buildLanguagesFacet(resultsToAnalyze),
    };
  }

  /**
   * Apply a facet filter
   */
  applyFacet(facetId: string, value: string): void {
    if (!this.activeFacets.has(facetId)) {
      this.activeFacets.set(facetId, new Set());
    }
    this.activeFacets.get(facetId)!.add(value);
  }

  /**
   * Remove a facet filter
   */
  removeFacet(facetId: string, value: string): void {
    const facetValues = this.activeFacets.get(facetId);
    if (facetValues) {
      facetValues.delete(value);
      if (facetValues.size === 0) {
        this.activeFacets.delete(facetId);
      }
    }
  }

  /**
   * Toggle a facet filter (add if not present, remove if present)
   */
  toggleFacet(facetId: string, value: string): void {
    const facetValues = this.activeFacets.get(facetId);
    if (facetValues && facetValues.has(value)) {
      this.removeFacet(facetId, value);
    } else {
      this.applyFacet(facetId, value);
    }
  }

  /**
   * Clear all facet filters
   */
  clearAllFacets(): void {
    this.activeFacets.clear();
  }

  /**
   * Clear filters for a specific facet group
   */
  clearFacetGroup(facetId: string): void {
    this.activeFacets.delete(facetId);
  }

  /**
   * Get active facet filters as a list
   */
  getActiveFacets(): ActiveFacetFilter[] {
    const filters: ActiveFacetFilter[] = [];

    this.activeFacets.forEach((values, facetId) => {
      values.forEach(value => {
        filters.push({
          facetId,
          facetLabel: this.getFacetLabel(facetId),
          value,
          valueLabel: value,
        });
      });
    });

    return filters;
  }

  /**
   * Check if any facets are active
   */
  hasActiveFacets(): boolean {
    return this.activeFacets.size > 0;
  }

  /**
   * Get filtered results based on active facets
   */
  getFilteredResults(): KBBookMetadata[] {
    if (!this.hasActiveFacets()) {
      return this.allResults;
    }

    return this.allResults.filter(book => {
      // Between-group logic (AND by default)
      for (const [facetId, values] of this.activeFacets.entries()) {
        if (!this.bookMatchesFacet(book, facetId, values)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Check if a book matches a facet filter
   */
  private bookMatchesFacet(
    book: KBBookMetadata,
    facetId: string,
    values: Set<string>
  ): boolean {
    // Within-group logic (OR by default)
    // If any of the selected values match, the book passes this facet

    switch (facetId) {
      case 'authors':
        return this.matchesArrayFacet(book.authors || [], values);

      case 'publishers':
        return values.has(book.publisher || '');

      case 'years': {
        // Year range matching
        if (!book.publishYear) return false;
        const year = parseInt(book.publishYear);
        return Array.from(values).some(rangeStr => {
          const [min, max] = rangeStr.split('-').map(Number);
          return year >= min && year <= max;
        });
      }

      case 'subjects':
        return this.matchesArrayFacet(book.subjects || [], values);

      case 'series':
        return values.has(book.series || '');

      case 'languages':
        return values.has(book.language || '');

      default:
        return true;
    }
  }

  /**
   * Check if any array element matches selected values
   */
  private matchesArrayFacet(bookValues: string[], selectedValues: Set<string>): boolean {
    if (bookValues.length === 0) return false;
    return bookValues.some(value => selectedValues.has(value));
  }

  /**
   * Build authors facet
   */
  private buildAuthorsFacet(results: KBBookMetadata[]): Facet {
    const counts = new Map<string, number>();

    results.forEach(book => {
      if (book.authors) {
        book.authors.forEach(author => {
          counts.set(author, (counts.get(author) || 0) + 1);
        });
      }
    });

    return this.countsToFacet(
      'authors',
      'Authors',
      counts,
      this.config.defaultVisibleCount.authors
    );
  }

  /**
   * Build publishers facet
   */
  private buildPublishersFacet(results: KBBookMetadata[]): Facet {
    const counts = new Map<string, number>();

    results.forEach(book => {
      if (book.publisher) {
        counts.set(book.publisher, (counts.get(book.publisher) || 0) + 1);
      }
    });

    return this.countsToFacet(
      'publishers',
      'Publishers',
      counts,
      this.config.defaultVisibleCount.publishers
    );
  }

  /**
   * Build years facet with histogram
   */
  private buildYearsFacet(results: KBBookMetadata[]): YearFacet {
    const counts = new Map<number, number>();
    let minYear = Infinity;
    let maxYear = -Infinity;

    results.forEach(book => {
      if (book.publishYear) {
        const year = parseInt(book.publishYear);
        if (!isNaN(year)) {
          counts.set(year, (counts.get(year) || 0) + 1);
          minYear = Math.min(minYear, year);
          maxYear = Math.max(maxYear, year);
        }
      }
    });

    // Build histogram bins
    const histogram: YearHistogramBin[] = [];
    const maxCount = Math.max(...Array.from(counts.values()));

    for (let year = minYear; year <= maxYear; year++) {
      const count = counts.get(year) || 0;
      histogram.push({
        year,
        count,
        height: maxCount > 0 ? (count / maxCount) * 100 : 0,
      });
    }

    // Convert to facet values (group by decade or year ranges)
    const values: FacetValue[] = [];
    const selectedYears = this.activeFacets.get('years');

    // Group into 5-year bins for display
    for (let year = minYear; year <= maxYear; year += 5) {
      const endYear = Math.min(year + 4, maxYear);
      const rangeKey = `${year}-${endYear}`;
      let rangeCount = 0;

      for (let y = year; y <= endYear; y++) {
        rangeCount += counts.get(y) || 0;
      }

      if (rangeCount > 0) {
        values.push({
          value: rangeKey,
          label: year === endYear ? `${year}` : `${year}-${endYear}`,
          count: rangeCount,
          selected: selectedYears?.has(rangeKey) || false,
        });
      }
    }

    return {
      id: 'years',
      label: 'Publication Year',
      values,
      collapsed: false,
      showAll: false,
      histogram,
      minYear: minYear === Infinity ? 0 : minYear,
      maxYear: maxYear === -Infinity ? 0 : maxYear,
    };
  }

  /**
   * Build subjects facet
   */
  private buildSubjectsFacet(results: KBBookMetadata[]): Facet {
    const counts = new Map<string, number>();

    results.forEach(book => {
      if (book.subjects) {
        book.subjects.forEach(subject => {
          counts.set(subject, (counts.get(subject) || 0) + 1);
        });
      }
    });

    return this.countsToFacet(
      'subjects',
      'Subjects',
      counts,
      this.config.defaultVisibleCount.subjects
    );
  }

  /**
   * Build series facet
   */
  private buildSeriesFacet(results: KBBookMetadata[]): Facet {
    const counts = new Map<string, number>();

    results.forEach(book => {
      if (book.series) {
        counts.set(book.series, (counts.get(book.series) || 0) + 1);
      }
    });

    return this.countsToFacet(
      'series',
      'Series',
      counts,
      this.config.defaultVisibleCount.series
    );
  }

  /**
   * Build languages facet
   */
  private buildLanguagesFacet(results: KBBookMetadata[]): Facet {
    const counts = new Map<string, number>();

    results.forEach(book => {
      if (book.language) {
        const lang = this.normalizeLanguage(book.language);
        counts.set(lang, (counts.get(lang) || 0) + 1);
      }
    });

    return this.countsToFacet(
      'languages',
      'Languages',
      counts,
      this.config.defaultVisibleCount.languages
    );
  }

  /**
   * Convert counts map to facet structure
   */
  private countsToFacet(
    id: string,
    label: string,
    counts: Map<string, number>,
    visibleCount: number
  ): Facet {
    const selectedValues = this.activeFacets.get(id);

    const values: FacetValue[] = Array.from(counts.entries())
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, count]) => count >= this.config.minCount)
      .map(([value, count]) => ({
        value,
        label: value,
        count,
        selected: selectedValues?.has(value) || false,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    return {
      id,
      label,
      values,
      collapsed: false,
      showAll: values.length <= visibleCount,
    };
  }

  /**
   * Normalize language codes
   */
  private normalizeLanguage(lang: string): string {
    const map: Record<string, string> = {
      'nl': 'Dutch',
      'nld': 'Dutch',
      'en': 'English',
      'eng': 'English',
      'de': 'German',
      'deu': 'German',
      'fr': 'French',
      'fra': 'French',
    };

    return map[lang.toLowerCase()] || lang;
  }

  /**
   * Get human-readable facet label
   */
  private getFacetLabel(facetId: string): string {
    const labels: Record<string, string> = {
      authors: 'Author',
      publishers: 'Publisher',
      years: 'Year',
      subjects: 'Subject',
      series: 'Series',
      languages: 'Language',
    };

    return labels[facetId] || facetId;
  }
}
