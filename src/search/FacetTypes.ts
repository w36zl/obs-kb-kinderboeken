/**
 * FacetTypes - Type definitions for faceted search
 *
 * Supports client-side filtering of search results by various dimensions
 */

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface Facet {
  id: string;
  label: string;
  values: FacetValue[];
  collapsed: boolean;
  showAll: boolean; // Whether to show all values or just top N
}

export interface SearchFacets {
  authors: Facet;
  publishers: Facet;
  years: YearFacet;
  subjects: Facet;
  series: Facet;
  languages: Facet;
}

export interface YearFacet extends Facet {
  histogram: YearHistogramBin[];
  minYear: number;
  maxYear: number;
  selectedRange?: [number, number];
}

export interface YearHistogramBin {
  year: number;
  count: number;
  height: number; // Normalized height 0-100 for display
}

export interface ActiveFacetFilter {
  facetId: string;
  facetLabel: string;
  value: string;
  valueLabel: string;
}

export interface FacetConfig {
  // How many facet values to show initially before "Show more"
  defaultVisibleCount: {
    authors: number;
    publishers: number;
    subjects: number;
    series: number;
    languages: number;
  };
  // Minimum count to show a facet value (hide rare items)
  minCount: number;
  // Whether facets within a group use AND or OR logic
  withinGroupLogic: 'AND' | 'OR';
  // Whether different facet groups use AND or OR logic
  betweenGroupLogic: 'AND' | 'OR';
}

export const DEFAULT_FACET_CONFIG: FacetConfig = {
  defaultVisibleCount: {
    authors: 10,
    publishers: 8,
    subjects: 12,
    series: 8,
    languages: 5,
  },
  minCount: 1,
  withinGroupLogic: 'OR',  // Multiple authors: show books by ANY selected author
  betweenGroupLogic: 'AND', // Author + Subject: show books matching BOTH
};
