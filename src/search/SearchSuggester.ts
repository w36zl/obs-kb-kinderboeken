/**
 * SearchSuggester - Real-time search suggestions for book queries
 *
 * Provides intelligent suggestions as users type, drawing from:
 * - Authors from vocabulary
 * - Series from vocabulary
 * - Subjects from vocabulary
 * - Recent searches (localStorage)
 * - Popular/hardcoded queries
 */

import { Suggestion } from './types';
import { vocabulary } from '../vocab';

export class SearchSuggester {
  private recentSearches: string[] = [];
  private readonly MAX_RECENT = 10;
  private readonly STORAGE_KEY = 'kb-recent-searches';

  // Popular queries to suggest when user has no history
  private readonly POPULAR_QUERIES = [
    'Julia Donaldson',
    'Gruffalo',
    'Little People Big Dreams',
    'Kikker',
    'Muizenhuis',
    'prentenboeken',
    'books for toddlers',
    'dutch picture books',
    'books about friendship',
    'series for early readers',
  ];

  constructor() {
    this.loadRecentSearches();
  }

  /**
   * Get suggestions based on partial user input
   */
  async getSuggestions(partial: string, maxResults = 8): Promise<Suggestion[]> {
    if (!partial || partial.trim().length < 2) {
      // Show recent searches for empty/very short queries
      return this.getRecentSuggestions(maxResults);
    }

    const normalized = partial.toLowerCase().trim();
    const suggestions: Suggestion[] = [];

    // Detect what type of query this looks like
    const queryType = this.detectQueryType(normalized);

    // Get suggestions based on query type
    if (queryType === 'author' || queryType === 'general') {
      suggestions.push(...this.suggestAuthors(normalized));
    }

    if (queryType === 'series' || queryType === 'general') {
      suggestions.push(...this.suggestSeries(normalized));
    }

    if (queryType === 'subject' || queryType === 'general') {
      suggestions.push(...this.suggestSubjects(normalized));
    }

    // Add recent searches that match
    suggestions.push(...this.suggestFromRecent(normalized));

    // Add popular queries that match
    suggestions.push(...this.suggestFromPopular(normalized));

    // Rank and deduplicate
    return this.rankAndDedupe(suggestions, normalized).slice(0, maxResults);
  }

  /**
   * Save a search to recent history
   */
  saveSearch(query: string): void {
    if (!query || query.trim().length < 2) return;

    const trimmed = query.trim();

    // Remove if already exists
    this.recentSearches = this.recentSearches.filter(q => q !== trimmed);

    // Add to front
    this.recentSearches.unshift(trimmed);

    // Keep only MAX_RECENT
    if (this.recentSearches.length > this.MAX_RECENT) {
      this.recentSearches = this.recentSearches.slice(0, this.MAX_RECENT);
    }

    // Persist to localStorage
    this.persistRecentSearches();
  }

  /**
   * Clear recent search history
   */
  clearRecentSearches(): void {
    this.recentSearches = [];
    this.persistRecentSearches();
  }

  /**
   * Detect what type of query the user is typing
   */
  private detectQueryType(query: string): 'author' | 'series' | 'subject' | 'general' {
    // Check for explicit patterns
    if (/\b(by|door|author|schrijver)\b/.test(query)) {
      return 'author';
    }

    if (/\b(series|reeks)\b/.test(query)) {
      return 'series';
    }

    if (/\b(about|over|subject|onderwerp)\b/.test(query)) {
      return 'subject';
    }

    // Check if it starts with a capital letter (likely author/series name)
    if (/^[A-Z]/.test(query)) {
      return 'general'; // Could be author or series
    }

    return 'general';
  }

  /**
   * Suggest authors from vocabulary
   */
  private suggestAuthors(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const matches = vocabulary.matchCreators(partial);

    matches.forEach(match => {
      // Calculate match score (0-1)
      const score = this.calculateMatchScore(partial, match.canonical);

      suggestions.push({
        type: 'author',
        text: `Books by ${match.canonical}`,
        matchScore: score,
        metadata: {
          description: `Search for books by ${match.canonical}`,
        },
      });
    });

    return suggestions;
  }

  /**
   * Suggest series from vocabulary
   */
  private suggestSeries(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const matches = vocabulary.matchSeries(partial);

    matches.forEach(match => {
      const score = this.calculateMatchScore(partial, match.canonical);

      suggestions.push({
        type: 'series',
        text: `${match.canonical} series`,
        matchScore: score,
        metadata: {
          description: `Browse the ${match.canonical} series`,
        },
      });
    });

    return suggestions;
  }

  /**
   * Suggest subjects from vocabulary
   */
  private suggestSubjects(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const matches = vocabulary.matchSubjects(partial);

    matches.forEach(match => {
      const score = this.calculateMatchScore(partial, match.canonical);

      suggestions.push({
        type: 'subject',
        text: `Books about ${match.canonical.toLowerCase()}`,
        matchScore: score,
        metadata: {
          description: `Find books about ${match.canonical.toLowerCase()}`,
        },
      });
    });

    return suggestions;
  }

  /**
   * Suggest from recent searches
   */
  private suggestFromRecent(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    this.recentSearches.forEach(recent => {
      if (recent.toLowerCase().includes(partial)) {
        const score = this.calculateMatchScore(partial, recent);

        suggestions.push({
          type: 'recent',
          text: recent,
          matchScore: score,
          metadata: {
            description: 'Recent search',
          },
        });
      }
    });

    return suggestions;
  }

  /**
   * Suggest from popular queries
   */
  private suggestFromPopular(partial: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    this.POPULAR_QUERIES.forEach(popular => {
      if (popular.toLowerCase().includes(partial)) {
        const score = this.calculateMatchScore(partial, popular);

        suggestions.push({
          type: 'popular',
          text: popular,
          matchScore: score * 0.8, // Slightly lower priority than other types
          metadata: {
            description: 'Popular search',
          },
        });
      }
    });

    return suggestions;
  }

  /**
   * Get recent searches as suggestions (for empty query)
   */
  private getRecentSuggestions(limit: number): Suggestion[] {
    const suggestions: Suggestion[] = [];

    this.recentSearches.slice(0, limit).forEach(recent => {
      suggestions.push({
        type: 'recent',
        text: recent,
        matchScore: 1.0,
        metadata: {
          description: 'Recent search',
        },
      });
    });

    // Fill with popular queries if not enough recent
    if (suggestions.length < limit) {
      const remaining = limit - suggestions.length;
      this.POPULAR_QUERIES.slice(0, remaining).forEach(popular => {
        suggestions.push({
          type: 'popular',
          text: popular,
          matchScore: 0.8,
          metadata: {
            description: 'Popular search',
          },
        });
      });
    }

    return suggestions;
  }

  /**
   * Calculate match score between partial input and suggestion
   * Higher score = better match
   */
  private calculateMatchScore(partial: string, suggestion: string): number {
    const partialLower = partial.toLowerCase();
    const suggestionLower = suggestion.toLowerCase();

    // Exact match
    if (partialLower === suggestionLower) {
      return 1.0;
    }

    // Starts with (high priority)
    if (suggestionLower.startsWith(partialLower)) {
      return 0.9;
    }

    // Contains at word boundary
    const words = suggestionLower.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(partialLower)) {
        return 0.8;
      }
    }

    // Contains anywhere
    if (suggestionLower.includes(partialLower)) {
      return 0.6;
    }

    // Fuzzy match (consecutive characters)
    let matchedChars = 0;
    let suggestionIndex = 0;

    for (const char of partialLower) {
      const foundIndex = suggestionLower.indexOf(char, suggestionIndex);
      if (foundIndex !== -1) {
        matchedChars++;
        suggestionIndex = foundIndex + 1;
      }
    }

    if (matchedChars === partialLower.length) {
      return 0.4;
    }

    return 0.0;
  }

  /**
   * Rank suggestions by score and deduplicate
   */
  private rankAndDedupe(suggestions: Suggestion[], partial: string): Suggestion[] {
    // Deduplicate by text (keep highest score)
    const deduped = new Map<string, Suggestion>();

    suggestions.forEach(suggestion => {
      const existing = deduped.get(suggestion.text);
      if (!existing || suggestion.matchScore > existing.matchScore) {
        deduped.set(suggestion.text, suggestion);
      }
    });

    // Convert to array and sort by score
    const ranked = Array.from(deduped.values()).sort((a, b) => {
      // First by score
      if (Math.abs(a.matchScore - b.matchScore) > 0.01) {
        return b.matchScore - a.matchScore;
      }

      // Then by type priority (author > series > subject > recent > popular)
      const typePriority = { author: 5, series: 4, subject: 3, recent: 2, popular: 1 };
      const aPriority = typePriority[a.type] || 0;
      const bPriority = typePriority[b.type] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Finally by length (shorter is better)
      return a.text.length - b.text.length;
    });

    return ranked;
  }

  /**
   * Load recent searches from localStorage
   */
  private loadRecentSearches(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[KB Plugin] Error loading recent searches:', error);
      this.recentSearches = [];
    }
  }

  /**
   * Persist recent searches to localStorage
   */
  private persistRecentSearches(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentSearches));
    } catch (error) {
      console.error('[KB Plugin] Error saving recent searches:', error);
    }
  }
}
