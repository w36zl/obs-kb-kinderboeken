/**
 * QueryAnalyzer - Natural language query understanding for book searches
 *
 * Extracts structured information from natural language queries:
 * - Year ranges: "after 2015", "before 2020", "between 2010 and 2020"
 * - Age ranges: "ages 4-6", "for toddlers", "early readers"
 * - Authors: "by Donaldson", capitalized names
 * - Series: known series names from vocabulary
 * - Subjects: topic keywords
 */

import { ParsedQuery, QueryFilters, YearRange, AgeRange, SearchIntent } from './types';
import { vocabulary } from '../vocab';

export class QueryAnalyzer {
  private readonly AGE_KEYWORDS: Record<string, AgeRange> = {
    'baby': { min: 0, max: 1, label: 'baby' },
    'babies': { min: 0, max: 1, label: 'babies' },
    'toddler': { min: 1, max: 3, label: 'toddler' },
    'toddlers': { min: 1, max: 3, label: 'toddlers' },
    'peuter': { min: 1, max: 3, label: 'peuter' },
    'peuters': { min: 1, max: 3, label: 'peuters' },
    'preschool': { min: 3, max: 5, label: 'preschool' },
    'kleuter': { min: 3, max: 5, label: 'kleuter' },
    'kleuterleeftijd': { min: 3, max: 5, label: 'kleuterleeftijd' },
    'early reader': { min: 5, max: 7, label: 'early reader' },
    'early readers': { min: 5, max: 7, label: 'early readers' },
    'beginning reader': { min: 5, max: 7, label: 'beginning reader' },
    'jonge lezer': { min: 5, max: 7, label: 'jonge lezer' },
    'middle grade': { min: 8, max: 12, label: 'middle grade' },
    'young adult': { min: 13, max: 18, label: 'young adult' },
    'ya': { min: 13, max: 18, label: 'YA' },
    'tiener': { min: 13, max: 18, label: 'tiener' },
  };

  /**
   * Main entry point: Parse a natural language query into structured data
   */
  parseQuery(query: string): ParsedQuery {
    const normalized = this.normalizeQuery(query);

    const filters: QueryFilters = {
      author: this.detectAuthor(query),
      series: this.detectSeries(query),
      yearRange: this.detectYearRange(query),
      ageRange: this.detectAgeRange(query),
      subjects: this.detectSubjects(query),
      language: this.detectLanguage(query),
    };

    const keywords = this.extractKeywords(query, filters);
    const intent = this.classifyIntent(query, filters);

    return {
      originalQuery: query,
      normalized,
      keywords,
      filters,
      intent,
    };
  }

  /**
   * Normalize query: lowercase, trim, remove extra spaces
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Detect year ranges from natural language
   * Examples:
   * - "after 2015" → { from: 2015 }
   * - "before 2020" → { to: 2020 }
   * - "between 2010 and 2020" → { from: 2010, to: 2020 }
   * - "2015-2020" → { from: 2015, to: 2020 }
   * - "last 5 years" → { from: currentYear - 5 }
   */
  detectYearRange(input: string): YearRange | null {
    const normalized = input.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Pattern: "after YYYY", "since YYYY", "from YYYY"
    const afterMatch = normalized.match(/(?:after|since|from)\s+(\d{4})/);
    if (afterMatch) {
      return { from: parseInt(afterMatch[1]) };
    }

    // Pattern: "before YYYY", "until YYYY"
    const beforeMatch = normalized.match(/(?:before|until|tot)\s+(\d{4})/);
    if (beforeMatch) {
      return { to: parseInt(beforeMatch[1]) };
    }

    // Pattern: "between YYYY and YYYY"
    const betweenMatch = normalized.match(/between\s+(\d{4})\s+and\s+(\d{4})/);
    if (betweenMatch) {
      return {
        from: parseInt(betweenMatch[1]),
        to: parseInt(betweenMatch[2]),
      };
    }

    // Pattern: "YYYY-YYYY" or "YYYY–YYYY" (en dash)
    const rangeMatch = normalized.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      return {
        from: parseInt(rangeMatch[1]),
        to: parseInt(rangeMatch[2]),
      };
    }

    // Pattern: "last N years", "past N years"
    const lastYearsMatch = normalized.match(/(?:last|past)\s+(\d+)\s+years?/);
    if (lastYearsMatch) {
      const yearsAgo = parseInt(lastYearsMatch[1]);
      return { from: currentYear - yearsAgo };
    }

    // Pattern: "in YYYY" (exact year)
    const exactYearMatch = normalized.match(/(?:in|uit)\s+(\d{4})/);
    if (exactYearMatch) {
      const year = parseInt(exactYearMatch[1]);
      return { from: year, to: year };
    }

    return null;
  }

  /**
   * Detect age ranges from natural language
   * Examples:
   * - "ages 4-6" → { min: 4, max: 6 }
   * - "for 5 year olds" → { min: 5, max: 5 }
   * - "toddlers" → { min: 1, max: 3, label: "toddlers" }
   * - "early readers" → { min: 5, max: 7, label: "early readers" }
   */
  detectAgeRange(input: string): AgeRange | null {
    const normalized = input.toLowerCase();

    // Pattern: "ages X-Y", "age X-Y", "X-Y years"
    const rangeMatch = normalized.match(/(?:ages?|leeftijd)\s*(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1]),
        max: parseInt(rangeMatch[2]),
      };
    }

    // Pattern: "for X year olds", "for X-year-olds"
    const yearOldsMatch = normalized.match(/for\s+(\d+)\s*[-\s]*year[-\s]*olds?/);
    if (yearOldsMatch) {
      const age = parseInt(yearOldsMatch[1]);
      return { min: age, max: age };
    }

    // Pattern: "X jaar" (Dutch)
    const jaarMatch = normalized.match(/(\d+)\s+jaar(?:\s|$)/);
    if (jaarMatch) {
      const age = parseInt(jaarMatch[1]);
      return { min: age, max: age };
    }

    // Check for age group keywords
    for (const [keyword, ageRange] of Object.entries(this.AGE_KEYWORDS)) {
      if (normalized.includes(keyword)) {
        return ageRange;
      }
    }

    return null;
  }

  /**
   * Detect author intent from query
   * Examples:
   * - "books by Donaldson" → "Donaldson"
   * - "Julia Donaldson" (capitalized) → "Julia Donaldson"
   * - "Donaldson friendship" → "Donaldson"
   */
  detectAuthor(input: string): string | null {
    // Pattern: "by AUTHOR", "door AUTHOR" (Dutch)
    const byMatch = input.match(/(?:by|door)\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:about|over)|$)/i);
    if (byMatch) {
      return byMatch[1].trim();
    }

    // Pattern: "AUTHOR books", "AUTHOR boeken"
    const authorBooksMatch = input.match(/^([A-Z][a-zA-Z\s]+?)\s+(?:books|boeken)/);
    if (authorBooksMatch) {
      return authorBooksMatch[1].trim();
    }

    // Check vocabulary for known authors
    const normalized = input.toLowerCase();
    const creatorMatches = vocabulary.matchCreators(normalized);
    if (creatorMatches.length > 0) {
      return creatorMatches[0].canonical;
    }

    // Detect capitalized words that might be author names
    // (but not at the start of sentence)
    const words = input.split(/\s+/);
    const capitalizedWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Match capitalized word (not common words like "The", "A", etc.)
      if (/^[A-Z][a-z]{2,}/.test(word) && !this.isCommonWord(word)) {
        capitalizedWords.push(word);
      }
    }

    // If we have 1-2 consecutive capitalized words, assume it's an author
    if (capitalizedWords.length > 0 && capitalizedWords.length <= 2) {
      return capitalizedWords.join(' ');
    }

    return null;
  }

  /**
   * Detect series from query
   */
  detectSeries(input: string): string | null {
    const normalized = input.toLowerCase();

    // Pattern: "SERIES series", "SERIES reeks"
    const seriesMatch = input.match(/([A-Z][a-zA-Z\s]+?)\s+(?:series|reeks)/i);
    if (seriesMatch) {
      return seriesMatch[1].trim();
    }

    // Check vocabulary for known series
    const seriesMatches = vocabulary.matchSeries(normalized);
    if (seriesMatches.length > 0) {
      return seriesMatches[0].canonical;
    }

    return null;
  }

  /**
   * Detect subjects/topics from query
   */
  detectSubjects(input: string): string[] {
    const subjects: string[] = [];
    const normalized = input.toLowerCase();

    // Common subject keywords (Dutch and English)
    const subjectKeywords: Record<string, string> = {
      'friendship': 'Vriendschap',
      'vriendschap': 'Vriendschap',
      'friends': 'Vriendschap',
      'vrienden': 'Vriendschap',
      'adventure': 'Avontuur',
      'avontuur': 'Avontuur',
      'animals': 'Dieren',
      'dieren': 'Dieren',
      'family': 'Familie',
      'familie': 'Familie',
      'gezin': 'Familie',
      'school': 'School',
      'love': 'Liefde',
      'liefde': 'Liefde',
      'fantasy': 'Fantasie',
      'fantasie': 'Fantasie',
      'science': 'Wetenschap',
      'wetenschap': 'Wetenschap',
      'history': 'Geschiedenis',
      'geschiedenis': 'Geschiedenis',
      'nature': 'Natuur',
      'natuur': 'Natuur',
      'emotions': 'Emoties',
      'emoties': 'Emoties',
      'gevoelens': 'Emoties',
    };

    for (const [keyword, subject] of Object.entries(subjectKeywords)) {
      if (normalized.includes(keyword)) {
        subjects.push(subject);
      }
    }

    // Check vocabulary subjects
    const subjectMatches = vocabulary.matchSubjects(normalized);
    subjectMatches.forEach(match => {
      subjects.push(match.canonical);
    });

    // Deduplicate
    return [...new Set(subjects)];
  }

  /**
   * Detect language from query
   */
  detectLanguage(input: string): string | null {
    const normalized = input.toLowerCase();

    const languageMap: Record<string, string> = {
      'dutch': 'Nederlands',
      'nederlands': 'Nederlands',
      'english': 'Engels',
      'engels': 'Engels',
      'german': 'Duits',
      'duits': 'Duits',
      'french': 'Frans',
      'frans': 'Frans',
    };

    for (const [keyword, language] of Object.entries(languageMap)) {
      if (normalized.includes(keyword)) {
        return language;
      }
    }

    return null;
  }

  /**
   * Extract keywords after removing detected filters
   */
  private extractKeywords(query: string, filters: QueryFilters): string[] {
    let remaining = query;

    // Remove author
    if (filters.author) {
      remaining = remaining.replace(new RegExp(`\\b${filters.author}\\b`, 'gi'), '');
    }

    // Remove series
    if (filters.series) {
      remaining = remaining.replace(new RegExp(`\\b${filters.series}\\b`, 'gi'), '');
    }

    // Remove year mentions
    remaining = remaining.replace(/\b\d{4}\b/g, '');

    // Remove age mentions
    remaining = remaining.replace(/\b(?:ages?|year|leeftijd|jaar)\s*\d+[-–]?\d*/gi, '');

    // Remove common filter words
    remaining = remaining.replace(/\b(?:by|door|about|over|for|voor|in|uit)\b/gi, '');

    // Remove subject keywords we already detected
    if (filters.subjects) {
      for (const subject of filters.subjects) {
        remaining = remaining.replace(new RegExp(`\\b${subject}\\b`, 'gi'), '');
      }
    }

    // Split into words, filter empty/short
    const keywords = remaining
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && !this.isCommonWord(w));

    return [...new Set(keywords)];
  }

  /**
   * Classify search intent based on filters
   */
  classifyIntent(query: string, filters: QueryFilters): SearchIntent {
    // ISBN search (if query looks like ISBN)
    if (/^\d{10,13}$/.test(query.replace(/[-\s]/g, ''))) {
      return 'isbn-lookup';
    }

    // Author search
    if (filters.author && !filters.series && (!filters.subjects || filters.subjects.length === 0)) {
      return 'author-works';
    }

    // Series exploration
    if (filters.series) {
      return 'explore-series';
    }

    // Subject browsing
    if (filters.subjects && filters.subjects.length > 0 && !filters.author) {
      return 'subject-browse';
    }

    // Default to general book search
    return 'find-books';
  }

  /**
   * Check if word is a common word (articles, prepositions, etc.)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'about', 'as', 'into', 'like', 'through',
      'after', 'over', 'between', 'out', 'against', 'during', 'without',
      'before', 'under', 'around', 'among',
      // Dutch
      'de', 'het', 'een', 'en', 'of', 'maar', 'in', 'op', 'aan', 'voor',
      'van', 'met', 'door', 'over', 'als', 'naar', 'bij', 'uit', 'om',
      'tot', 'tegen', 'zonder', 'onder', 'tussen', 'tijdens',
    ]);

    return commonWords.has(word.toLowerCase());
  }

  /**
   * Generate a human-readable description of parsed query
   */
  describeQuery(parsed: ParsedQuery): string {
    const parts: string[] = [];

    if (parsed.filters.author) {
      parts.push(`by ${parsed.filters.author}`);
    }

    if (parsed.filters.series) {
      parts.push(`in ${parsed.filters.series} series`);
    }

    if (parsed.filters.subjects && parsed.filters.subjects.length > 0) {
      parts.push(`about ${parsed.filters.subjects.join(', ')}`);
    }

    if (parsed.filters.yearRange) {
      const { from, to } = parsed.filters.yearRange;
      if (from && to) {
        parts.push(`published ${from}-${to}`);
      } else if (from) {
        parts.push(`published after ${from}`);
      } else if (to) {
        parts.push(`published before ${to}`);
      }
    }

    if (parsed.filters.ageRange) {
      const { min, max, label } = parsed.filters.ageRange;
      if (label) {
        parts.push(`for ${label}`);
      } else if (min === max) {
        parts.push(`for age ${min}`);
      } else {
        parts.push(`for ages ${min}-${max}`);
      }
    }

    if (parsed.filters.language) {
      parts.push(`in ${parsed.filters.language}`);
    }

    if (parsed.keywords.length > 0) {
      parts.push(`matching "${parsed.keywords.join(' ')}"`);
    }

    return parts.length > 0
      ? `Books ${parts.join(', ')}`
      : `Books matching "${parsed.originalQuery}"`;
  }
}
