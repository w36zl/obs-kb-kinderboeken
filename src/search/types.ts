/**
 * Search-specific type definitions for the KB Kinderboeken plugin
 */

export interface YearRange {
  from?: number;
  to?: number;
}

export interface AgeRange {
  min: number;
  max: number;
  label?: string; // e.g., "toddlers", "preschool", "early readers"
}

export interface ParsedQuery {
  originalQuery: string;
  normalized: string;
  keywords: string[];
  filters: QueryFilters;
  intent: SearchIntent;
}

export interface QueryFilters {
  author?: string;
  series?: string;
  yearRange?: YearRange;
  ageRange?: AgeRange;
  subjects?: string[];
  language?: string;
  publisher?: string;
}

export type SearchIntent =
  | 'find-books'        // General book search
  | 'explore-series'    // Looking for books in a series
  | 'author-works'      // Looking for books by specific author
  | 'subject-browse'    // Browsing by subject/topic
  | 'isbn-lookup';      // Exact ISBN search

export interface Suggestion {
  type: 'author' | 'series' | 'subject' | 'recent' | 'popular';
  text: string;
  matchScore: number; // 0-1
  metadata?: {
    count?: number;      // Number of books matching this
    description?: string;
  };
}

export interface SearchFacet {
  name: string;
  values: FacetValue[];
  type: 'list' | 'range' | 'histogram';
}

export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

export interface SearchFacets {
  authors: SearchFacet;
  publishers: SearchFacet;
  years: SearchFacet;
  subjects: SearchFacet;
  series: SearchFacet;
  languages: SearchFacet;
}

export interface SavedSearch {
  id: string;
  query: string;
  name?: string;
  timestamp: number;
  resultCount: number;
  isFavorite: boolean;
  tags?: string[];
  parsedQuery?: ParsedQuery;
}

export interface SearchTag {
  type: 'author' | 'series' | 'subject' | 'year' | 'language' | 'age';
  value: string;
  operator?: 'AND' | 'OR' | 'NOT';
  removable: boolean;
}
