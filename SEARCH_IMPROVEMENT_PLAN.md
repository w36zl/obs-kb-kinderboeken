# KB Kinderboeken Plugin - Search Improvement Implementation Plan

**Created:** 2025-11-26
**Status:** Ready for Implementation

## Executive Summary

This plan outlines a phased approach to dramatically improve the search capabilities of the KB Kinderboeken Obsidian plugin. The improvements focus on making search more intuitive, powerful, and user-friendly through natural language processing, intelligent suggestions, faceted filtering, and contextual search features.

---

## Current State Analysis

### Existing Search Methods

1. **Basic Search (`modal.ts`)** - Lines 148-179
   - Simple text input with dropdown for "Title/Author" vs "ISBN"
   - Direct query submission to KB API
   - No query preprocessing or expansion
   - Results displayed as vertical list with covers

2. **Advanced Search (`advanced-modal.ts`)** - Lines 81-428
   - Form-based with 9+ fields (title, author, ISBN, series, subject, publisher, year range, language)
   - Builds CQL queries manually
   - Match mode: ALL (AND) or ANY (OR)
   - Query preview feature
   - Children's books filter

3. **Browse View (`browse-view.ts`)** - Lines 76-563
   - Grid-based exploration with infinite scroll
   - Author link navigation (clickable author names)
   - Subject search navigation
   - Linked data URI search (partial implementation)
   - Navigation history with back button
   - Visual badges for data enrichment status

### Current Search Flow

```
User Input → buildSearchQuery() → KB SRU API → parseXMLResponse()
  → enrichWithBol() [optional] → Display Results
```

### Existing Infrastructure

**Strengths:**
- XML parsing infrastructure (`XMLParser` from fast-xml-parser)
- Vocabulary matching system (`vocab.ts`) with 70+ authors, publishers, series
- Linked data enrichment capability
- Wikidata integration (`WikidataApiClient`)
- Template system for note generation
- Cover image fallback chain (Open Library → Google Books → Amazon)
- Settings system for user preferences

**Gaps:**
- No query analysis or intent detection
- No search history persistence
- No auto-complete/suggestions
- No faceted filtering after results
- Limited query expansion (only vocabulary-based)
- No contextual search from existing notes
- Results not deduplicated across sources

---

## Implementation Phases

### Phase 1: Foundation - Query Analysis & Intent Detection ⭐ HIGH PRIORITY

**Goal:** Build intelligent query understanding layer

**Files to Create:**
- `src/search/QueryAnalyzer.ts` - Main analysis engine
- `src/search/IntentClassifier.ts` - Classify search intent
- `src/search/types.ts` - Search-specific type definitions

**Files to Modify:**
- `src/api.ts` - Integrate QueryAnalyzer into `buildSearchQuery()`
- `src/types.ts` - Add search-related types

**Implementation Details:**

```typescript
// src/search/QueryAnalyzer.ts
export class QueryAnalyzer {
  // Extract year ranges: "after 2015", "before 2020", "between 2010-2020"
  detectYearRange(input: string): YearRange | null

  // Extract age ranges: "ages 4-6", "for toddlers", "early readers"
  detectAgeRange(input: string): AgeRange | null

  // Detect author intent: "by Donaldson", capitalized words
  detectAuthor(input: string): string | null

  // Detect series: "Little People series", known series names
  detectSeries(input: string): string | null

  // Extract topics/subjects: common keywords
  detectSubjects(input: string): string[]

  // Classify intent: 'find-books' | 'explore-series' | 'author-works'
  classifyIntent(input: string): SearchIntent

  // Main entry point
  parseQuery(input: string): ParsedQuery
}
```

**Example Queries to Handle:**
- "books by Donaldson about friendship" → author + subject
- "Little People Big Dreams series after 2015" → series + year range
- "Dutch picture books for ages 4-6" → language + age range + format
- "Gruffalo" → title search (keep simple)

**Testing:**
- Unit tests for each detection method
- Integration test with existing `buildSearchQuery()`
- Real-world query samples

**Estimated Effort:** 2-3 days

---

### Phase 2: Smart Suggestions & Auto-complete ⭐ HIGH PRIORITY

**Goal:** Provide real-time search suggestions as user types

**Files to Create:**
- `src/search/SearchSuggester.ts` - Main suggestion engine
- `src/search/SuggestionRanker.ts` - Rank suggestions by relevance
- `src/components/SearchSuggestionsUI.ts` - UI component

**Files to Modify:**
- `src/modal.ts` - Add suggestion dropdown to search input
- `src/browse-view.ts` - Add suggestions to browse search
- `src/settings.ts` - Add setting to enable/disable suggestions

**Implementation Details:**

```typescript
// src/search/SearchSuggester.ts
export class SearchSuggester {
  private recentSearches: string[] = []; // From localStorage
  private popularQueries: string[] = []; // Hardcoded top queries

  async getSuggestions(partial: string): Promise<Suggestion[]>

  // Detect if input looks like author query
  private looksLikeAuthorQuery(input: string): boolean

  // Suggest authors from vocab.ts matching partial input
  private suggestAuthors(partial: string): Suggestion[]

  // Suggest series from vocab.ts
  private suggestSeries(partial: string): Suggestion[]

  // Suggest subjects from KB thesaurus
  private suggestSubjects(partial: string): Suggestion[]

  // Get recent searches from localStorage
  private getRecentSearches(): Suggestion[]

  // Rank suggestions by relevance
  private rankSuggestions(suggestions: Suggestion[], partial: string): Suggestion[]
}
```

**UI Design:**

```
┌────────────────────────────────────────┐
│ 🔍 [books by Donald_____________]      │
│     ▼                                   │
│     💡 Suggestions:                    │
│     ▸ Books by Julia Donaldson         │
│     ▸ Books by Donald Duck              │
│     ▸ The Gruffalo (series)            │
│     📜 Recent:                          │
│     ▸ books about friendship           │
└────────────────────────────────────────┘
```

**Data Sources:**
1. `vocabulary` from `src/vocab.ts` - 70+ known entities
2. Recent searches from `localStorage`
3. Hardcoded popular queries (top 20-30)
4. KB thesaurus API (if available)

**Persistence:**
- Store recent searches in `localStorage` (max 50)
- Store popular queries from plugin settings

**Estimated Effort:** 3-4 days

---

### Phase 3: Faceted Search with Live Filtering ⭐ HIGH PRIORITY

**Goal:** Allow users to refine results after searching without re-querying

**Files to Create:**
- `src/search/FacetedSearch.ts` - Facet extraction and filtering
- `src/components/FacetPanel.ts` - UI component for facets
- `src/search/FacetTypes.ts` - Type definitions

**Files to Modify:**
- `src/browse-view.ts` - Add facet panel to browse view
- `src/modal.ts` - Optionally add simple facets to modal
- `styles.css` - Facet panel styles

**Implementation Details:**

```typescript
// src/search/FacetedSearch.ts
export class FacetedSearch {
  private results: KBBookMetadata[];
  private activeFacets: Map<string, Set<string>>;

  // Extract facets from current results
  buildFacets(): SearchFacets {
    return {
      authors: this.extractFacet('authors', 20),
      publishers: this.extractFacet('publisher', 15),
      years: this.buildYearHistogram(), // Visual histogram
      subjects: this.extractFacet('subjects', 30),
      series: this.extractFacet('series', 10),
      languages: this.extractFacet('language', 5),
      // Advanced facets from linked data
      themes: this.extractLinkedDataThemes(),
      ageGroups: this.inferAgeGroups() // From subjects/metadata
    };
  }

  // Apply a facet filter
  applyFacet(facetType: string, value: string): void

  // Remove a facet filter
  removeFacet(facetType: string, value: string): void

  // Clear all facets
  clearAllFacets(): void

  // Get filtered results
  getFilteredResults(): KBBookMetadata[]
}
```

**UI Layout (Browse View):**

```
┌─────────────────────────────────────────────────────┐
│ [Search input________________] [Search]             │
├──────────────┬──────────────────────────────────────┤
│ 📊 Refine by │ Grid of book covers (48 results)     │
│              │ ┌────┐ ┌────┐ ┌────┐                 │
│ Authors:     │ │    │ │    │ │    │                 │
│ ☑ Donaldson  │ └────┘ └────┘ └────┘                 │
│   (12)       │                                       │
│ ☐ Scheffler  │ ┌────┐ ┌────┐ ┌────┐                 │
│   (8)        │ │    │ │    │ │    │                 │
│ ☐ Ross (5)   │ └────┘ └────┘ └────┘                 │
│              │                                       │
│ Years:       │ [Load More]                           │
│ ▃▅▇▇█▇▅▃     │                                       │
│ 2015   2024  │                                       │
│              │                                       │
│ Series:      │                                       │
│ ☐ Gruffalo   │                                       │
│   (3)        │                                       │
│ ☐ Room Broom │                                       │
│   (2)        │                                       │
└──────────────┴──────────────────────────────────────┘
```

**Features:**
- Collapsible facet groups
- Show counts for each facet value
- Multi-select facets (AND logic within group, OR across groups)
- Visual year histogram
- "Show more" for facets with many values
- Active filters displayed as removable chips

**Estimated Effort:** 4-5 days

---

### Phase 4: Visual Query Builder (Tags) 🔷 MEDIUM PRIORITY

**Goal:** Tag-based query building (GitHub-style)

**Files to Create:**
- `src/search/VisualQueryBuilder.ts` - Query builder logic
- `src/components/QueryTagsUI.ts` - Tag UI component

**Files to Modify:**
- `src/advanced-modal.ts` - Add visual query builder mode
- `src/browse-view.ts` - Add tag builder to browse search

**Implementation:**

```typescript
// src/search/VisualQueryBuilder.ts
export class VisualQueryBuilder {
  private tags: SearchTag[] = [];

  addTag(tag: SearchTag): void
  removeTag(index: number): void
  reorderTags(fromIndex: number, toIndex: number): void

  // Convert tags to CQL query
  toCQLQuery(): string

  // Parse existing query into tags
  fromCQLQuery(query: string): void
}

interface SearchTag {
  type: 'author' | 'series' | 'subject' | 'year' | 'language' | 'age';
  value: string;
  operator?: 'AND' | 'OR' | 'NOT';
  removable: boolean;
}
```

**UI Example:**

```
┌──────────────────────────────────────────────────┐
│ Build your search:                                │
│ [author:Donaldson ×] AND [subject:Friendship ×]  │
│ OR [subject:Adventure ×]                          │
│                                                   │
│ Add filter: [Author ▾] [Series ▾] [Subject ▾]   │
│                                                   │
│ 💡 Preview: (dc.creator all "Donaldson") AND ... │
│                                                   │
│ [Search] [Clear]                                  │
└──────────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop reordering
- Click to remove tags
- Dropdown menus for adding new tags
- Real-time query preview
- Save/load query presets

**Estimated Effort:** 3-4 days

---

### Phase 5: Search History & Saved Searches 🔷 MEDIUM PRIORITY

**Goal:** Persistent search history with favorites

**Files to Create:**
- `src/search/SearchHistory.ts` - History management
- `src/components/SearchHistoryPanel.ts` - UI component

**Files to Modify:**
- `src/modal.ts` - Track searches
- `src/browse-view.ts` - Track searches
- `src/settings.ts` - History settings (max items, auto-clean)

**Implementation:**

```typescript
// src/search/SearchHistory.ts
export class SearchHistory {
  private history: SavedSearch[] = [];

  async saveSearch(query: string, resultCount: number): Promise<void>
  deleteSearch(id: string): void
  nameSearch(id: string, name: string): void
  toggleFavorite(id: string): void
  addTags(id: string, tags: string[]): void

  // Get history filtered by various criteria
  getRecent(limit: number): SavedSearch[]
  getFavorites(): SavedSearch[]
  searchHistory(query: string): SavedSearch[]

  // Persistence
  private async persist(): Promise<void>
  private async load(): Promise<void>
}

interface SavedSearch {
  id: string;
  query: string;
  name?: string; // User-assigned name
  timestamp: number;
  resultCount: number;
  isFavorite: boolean;
  tags?: string[]; // User-assigned tags
  parsedQuery?: ParsedQuery; // Structured query
}
```

**UI Design:**

```
┌────────────────────────────────────────┐
│ 🔍 Search History                      │
├────────────────────────────────────────┤
│ ⭐ Favorites:                          │
│   • Children's book series [Edit] [×]  │
│     (42 results, Jan 15)               │
│   • Dutch picture books [Edit] [×]     │
│     (156 results, Jan 10)              │
│                                        │
│ 📜 Recent:                             │
│   • books by Donaldson [★] [×]        │
│     (18 results, 5 min ago)            │
│   • Little People series [★] [×]       │
│     (23 results, 1 hour ago)           │
│                                        │
│ [Clear History]                        │
└────────────────────────────────────────┘
```

**Features:**
- Auto-save every search
- Max 50 recent searches (configurable)
- Star to favorite
- Edit to add name/tags
- Click to re-run search
- Export/import history

**Persistence:**
- Store in plugin data file (`data.json`)
- Auto-clean old searches (> 30 days)

**Estimated Effort:** 2-3 days

---

### Phase 6: Contextual Search (Find Similar) 🔷 MEDIUM PRIORITY

**Goal:** "Find books like this one" from current note

**Files to Create:**
- `src/search/ContextualSearch.ts` - Similarity search logic

**Files to Modify:**
- `src/main.ts` - Add command "Find books similar to current note"
- `src/book-detail-modal.ts` - Add "Find similar" button

**Implementation:**

```typescript
// src/search/ContextualSearch.ts
export class ContextualSearch {
  async findSimilarBooks(currentNote: TFile): Promise<KBBookMetadata[]> {
    const metadata = await this.extractBookMetadata(currentNote);

    // Build multi-faceted similarity query
    const queries: string[] = [];

    // 1. Same series (highest priority)
    if (metadata.series) {
      queries.push(`dc.relation all "${metadata.series}"`);
    }

    // 2. Similar subjects (top 3)
    if (metadata.subjects?.length > 0) {
      queries.push(
        metadata.subjects
          .slice(0, 3)
          .map(s => `dc.subject all "${s}"`)
          .join(' OR ')
      );
    }

    // 3. Same author
    if (metadata.authors?.length > 0) {
      queries.push(`dc.creator all "${metadata.authors[0]}"`);
    }

    // 4. Similar age range (from subjects)
    if (metadata.ageRange) {
      queries.push(this.buildAgeRangeQuery(metadata.ageRange));
    }

    return this.searchWithQueries(queries);
  }

  // Extract metadata from note frontmatter + content
  private async extractBookMetadata(note: TFile): Promise<BookMetadata>
}
```

**Command:**
- ID: `find-similar-books`
- Name: "Find books similar to current note"
- Hotkey: Configurable (suggest: `Ctrl+Shift+F`)

**UI Flow:**
1. User opens book note
2. User runs "Find similar books" command
3. Plugin analyzes note metadata
4. Opens browse view with similar books
5. Shows similarity score/reason badges

**Features:**
- Similarity score (0-100%)
- Reason badges ("Same series", "Similar subjects", "Same author")
- Exclude current book from results
- Sort by similarity score

**Estimated Effort:** 2-3 days

---

### Phase 7: Query Expansion Engine 🔵 LOW PRIORITY

**Goal:** Automatic query expansion using synonyms, related terms

**Files to Create:**
- `src/search/QueryExpander.ts` - Expansion logic
- `src/search/Thesaurus.ts` - Dutch-English thesaurus

**Files to Modify:**
- `src/api.ts` - Integrate expansion into search flow
- `src/settings.ts` - Setting to enable/disable expansion

**Implementation:**

```typescript
// src/search/QueryExpander.ts
export class QueryExpander {
  async expandQuery(query: string): Promise<string[]> {
    const expansions: string[] = [query]; // Original always included

    // 1. Synonym expansion (Dutch ↔ English)
    const synonyms = await this.findSynonyms(query);
    expansions.push(...synonyms);

    // 2. Related subjects from KB thesaurus
    if (this.containsSubject(query)) {
      const related = await this.getRelatedSubjects(query);
      expansions.push(...related);
    }

    // 3. Spell check and corrections
    const corrected = this.spellCheck(query);
    if (corrected !== query) {
      expansions.push(corrected);
    }

    // 4. Translate Dutch ↔ English for international books
    if (this.isEnglish(query)) {
      const dutch = await this.translate(query, 'nl');
      expansions.push(dutch);
    } else {
      const english = await this.translate(query, 'en');
      expansions.push(english);
    }

    return this.dedupeAndRank(expansions);
  }

  // Find synonyms from local thesaurus
  private findSynonyms(query: string): string[]

  // Check spelling and suggest corrections
  private spellCheck(query: string): string

  // Translate using external API (DeepL/Google Translate)
  private async translate(text: string, targetLang: string): Promise<string>
}
```

**Thesaurus (Partial Example):**

```typescript
// src/search/Thesaurus.ts
export const DUTCH_ENGLISH_THESAURUS: Record<string, string[]> = {
  'vriendschap': ['friendship', 'friends', 'vriendje'],
  'avontuur': ['adventure', 'quest', 'reis'],
  'dieren': ['animals', 'beesten', 'wildlife'],
  'familie': ['family', 'gezin', 'ouders'],
  // ... 200+ common terms
};
```

**UI Indicator:**

```
┌────────────────────────────────────────┐
│ Searching for: "vriendschap"           │
│ 💡 Also searching: friendship, friends │
│                                        │
│ Found 42 results                       │
└────────────────────────────────────────┘
```

**Estimated Effort:** 3-4 days

---

### Phase 8: Unified Multi-Source Search 🔵 LOW PRIORITY

**Goal:** Search KB, Wikidata, and Bol.com simultaneously, dedupe results

**Files to Create:**
- `src/search/UnifiedSearch.ts` - Multi-source orchestration
- `src/search/ResultMerger.ts` - Deduplication logic

**Files to Modify:**
- `src/api.ts` - Add unified search method
- `src/settings.ts` - Per-source enable/disable toggles

**Implementation:**

```typescript
// src/search/UnifiedSearch.ts
export class UnifiedSearch {
  async search(query: string): Promise<UnifiedResult[]> {
    // Parallel search across all enabled sources
    const [kbResults, wikidataBooks, bolResults] = await Promise.all([
      this.searchKB(query),
      this.plugin.settings.enableWikidataEnrichment
        ? this.searchWikidataBooks(query)
        : Promise.resolve([]),
      this.plugin.settings.enrichFromBol
        ? this.searchBol(query)
        : Promise.resolve([])
    ]);

    // Merge and deduplicate by ISBN
    return this.mergeResults(kbResults, wikidataBooks, bolResults);
  }

  private mergeResults(
    kb: KBBookMetadata[],
    wikidata: WikidataBook[],
    bol: BolBook[]
  ): UnifiedResult[] {
    const merged = new Map<string, UnifiedResult>();

    // KB as base (confidence: 1.0)
    kb.forEach(book => {
      const key = book.isbn || book.title.toLowerCase();
      merged.set(key, {
        ...book,
        sources: ['KB'],
        confidence: 1.0
      });
    });

    // Enrich with Wikidata
    wikidata.forEach(book => {
      const key = book.isbn || book.title.toLowerCase();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        Object.assign(existing, book);
        existing.sources.push('Wikidata');
      } else {
        merged.set(key, {
          ...book,
          sources: ['Wikidata'],
          confidence: 0.8
        });
      }
    });

    // Add Bol.com data (lowest confidence for new entries)
    bol.forEach(book => {
      const key = book.isbn || book.title.toLowerCase();
      if (merged.has(key)) {
        const existing = merged.get(key)!;
        // Enrich existing entry
        if (!existing.coverUrl && book.coverUrl) {
          existing.coverUrl = book.coverUrl;
        }
        existing.sources.push('Bol.com');
      } else {
        // New entry (not in KB or Wikidata)
        merged.set(key, {
          ...book,
          sources: ['Bol.com'],
          confidence: 0.6
        });
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.confidence - a.confidence);
  }
}

interface UnifiedResult extends KBBookMetadata {
  sources: string[]; // ['KB', 'Wikidata', 'Bol.com']
  confidence: number; // 0.0 - 1.0
}
```

**UI Badges:**

```
┌─────────────────────────────────────┐
│ 📖 The Gruffalo                     │
│ [KB] [W] [Bol] 🎯95% confidence     │
│                                     │
│ Author: Julia Donaldson             │
│ Publisher: Macmillan (2009)         │
└─────────────────────────────────────┘
```

**Settings:**

```
Search Sources:
☑ KB (Koninklijke Bibliotheek)
☑ Wikidata enrichment
☑ Bol.com metadata
☐ Open Library (future)
☐ Google Books (future)
```

**Estimated Effort:** 4-5 days

---

### Phase 9: UI/UX Polish & Integration 🎨

**Goal:** Cohesive UI across all new features

**Tasks:**
1. Design consistent styling for all new components
2. Add keyboard shortcuts for power users
3. Implement loading states and error handling
4. Add tooltips and help text
5. Mobile/tablet responsive design
6. Accessibility (ARIA labels, keyboard navigation)
7. Dark mode support (if not already present)

**Files to Modify:**
- `styles.css` - All new component styles
- All new components - Accessibility attributes
- `src/settings.ts` - Keyboard shortcut settings

**Estimated Effort:** 2-3 days

---

### Phase 10: Testing & Documentation 📝

**Goal:** Comprehensive testing and user documentation

**Tasks:**

1. **Unit Tests** (using Vitest)
   - `QueryAnalyzer` - All detection methods
   - `SearchSuggester` - Ranking algorithms
   - `FacetedSearch` - Filtering logic
   - `QueryExpander` - Expansion rules
   - `ResultMerger` - Deduplication

2. **Integration Tests**
   - Full search flow with query analysis
   - Faceted filtering with real results
   - History persistence
   - Contextual search from note

3. **Manual Testing**
   - Real-world queries
   - Edge cases (empty results, network errors)
   - Performance with large result sets
   - Cross-browser compatibility

4. **Documentation**
   - Update README.md with new features
   - Create SEARCH_FEATURES.md guide
   - Add inline code documentation
   - Create video tutorial (optional)
   - Add example queries to settings

**Estimated Effort:** 3-4 days

---

## Total Effort Estimate

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| Phase 1: Query Analysis | HIGH | 2-3 days | None |
| Phase 2: Smart Suggestions | HIGH | 3-4 days | Phase 1 |
| Phase 3: Faceted Search | HIGH | 4-5 days | None |
| Phase 4: Visual Query Builder | MEDIUM | 3-4 days | Phase 1 |
| Phase 5: Search History | MEDIUM | 2-3 days | None |
| Phase 6: Contextual Search | MEDIUM | 2-3 days | Phase 1 |
| Phase 7: Query Expansion | LOW | 3-4 days | Phase 1 |
| Phase 8: Unified Search | LOW | 4-5 days | None |
| Phase 9: UI/UX Polish | - | 2-3 days | All phases |
| Phase 10: Testing & Docs | - | 3-4 days | All phases |

**Total:** 28-38 days (5.5-7.5 weeks)

**Recommended Iteration:**
- **Sprint 1 (2 weeks):** Phases 1, 2, 3 - Core improvements
- **Sprint 2 (1.5 weeks):** Phases 4, 5, 6 - Quality of life
- **Sprint 3 (2 weeks):** Phases 7, 8, 9, 10 - Polish & release

---

## Architecture Decisions

### 1. Separation of Concerns

```
src/
├── search/
│   ├── QueryAnalyzer.ts          # Query understanding
│   ├── IntentClassifier.ts       # Intent detection
│   ├── SearchSuggester.ts        # Suggestions
│   ├── SuggestionRanker.ts       # Ranking logic
│   ├── FacetedSearch.ts          # Faceting
│   ├── VisualQueryBuilder.ts     # Tag-based builder
│   ├── SearchHistory.ts          # History management
│   ├── ContextualSearch.ts       # Similarity search
│   ├── QueryExpander.ts          # Query expansion
│   ├── UnifiedSearch.ts          # Multi-source search
│   ├── ResultMerger.ts           # Deduplication
│   ├── Thesaurus.ts              # Synonym dictionary
│   └── types.ts                  # Search types
├── components/
│   ├── SearchSuggestionsUI.ts    # Suggestions dropdown
│   ├── FacetPanel.ts             # Facet UI
│   ├── QueryTagsUI.ts            # Tag builder UI
│   └── SearchHistoryPanel.ts     # History UI
└── api.ts                         # Modified to integrate new logic
```

### 2. Data Flow

```
User Input
    ↓
QueryAnalyzer.parseQuery()
    ↓
SearchSuggester.getSuggestions() [optional]
    ↓
KBApiClient.searchBooks() [with expanded query]
    ↓
FacetedSearch.buildFacets()
    ↓
Display Results + Facet Panel
    ↓
User applies facet filter
    ↓
FacetedSearch.getFilteredResults()
    ↓
Update UI (no new API call)
```

### 3. Persistence Strategy

| Data Type | Storage | TTL |
|-----------|---------|-----|
| Search results | Memory cache | 10 minutes |
| Query expansions | Memory cache | 10 minutes |
| Linked data | Memory cache | 10 minutes |
| Search history | Plugin data.json | 30 days |
| Favorites | Plugin data.json | Permanent |
| Recent searches | localStorage | Session |

### 4. Performance Considerations

- **Debouncing:** Suggestions trigger after 300ms pause
- **Caching:** Aggressive caching for repeated queries
- **Lazy Loading:** Facets computed on-demand
- **Pagination:** Keep existing infinite scroll in browse view
- **Background Enrichment:** Wikidata/Bol fetching happens async

---

## API Endpoints & Data Sources

### KB SRU API
- **Base:** `https://jsru.kb.nl/sru/sru`
- **Collection:** `GGC` (union catalog)
- **Operations:** `searchRetrieve`
- **Fields:** All Dublin Core fields + ISBN

### Wikidata API
- **Already implemented** via `WikidataApiClient`
- Used for author enrichment

### Bol.com API
- **Already implemented** via `enrichFromBol()`
- Used for cover images and descriptions

### Future APIs (Low Priority)
- Google Books API - Cover fallback
- Open Library API - Cover fallback
- KB Thesaurus API - Related subjects

---

## Risk Mitigation

### Risk 1: API Rate Limiting
**Mitigation:**
- Aggressive caching
- Debounce user input
- Batch requests where possible
- Respect API guidelines

### Risk 2: Performance Degradation
**Mitigation:**
- Limit facet values (top 20-30 per facet)
- Virtual scrolling for large result sets
- Web Workers for heavy computation (future)
- Lazy load linked data enrichment

### Risk 3: Complex Query Construction
**Mitigation:**
- Extensive unit tests for QueryAnalyzer
- Query preview in UI
- Fallback to simple search on parse error
- User feedback for query refinement

### Risk 4: User Adoption
**Mitigation:**
- Gradual rollout (feature flags)
- Comprehensive documentation
- Video tutorials
- Preserve existing workflows

---

## Success Metrics

1. **Search Accuracy:** % of queries returning relevant results
2. **Time to Result:** Average time from query to useful result
3. **Feature Adoption:** % of users using new features
4. **Query Refinement:** % of searches using facets
5. **Return Visits:** % of users using search history
6. **Error Rate:** % of failed searches

**Target Improvements:**
- 30% reduction in time to find book
- 50% increase in use of advanced features
- 20% increase in successful searches

---

## Future Enhancements (Beyond This Plan)

1. **AI-Powered Recommendations** - ML model for "You might also like"
2. **Collaborative Filtering** - "Users who liked X also liked Y"
3. **Reading Lists** - Create and share curated book lists
4. **Book Ratings** - Personal rating system
5. **Reading Progress Tracking** - Mark books as read/reading/to-read
6. **Social Features** - Share recommendations with other users
7. **Integration with Other Plugins** - Dataview queries, Templater templates
8. **Export to Bibliography Managers** - Zotero, Mendeley
9. **Bulk Import** - Import lists from CSV/Excel
10. **Mobile App** - Companion app for on-the-go search

---

## Conclusion

This implementation plan provides a clear roadmap to transform the KB Kinderboeken plugin's search capabilities from basic to world-class. By prioritizing high-impact features (query analysis, suggestions, faceted search) and maintaining code quality throughout, we can deliver a dramatically improved user experience while keeping the codebase maintainable and extensible.

**Next Steps:**
1. Review and approve this plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Iterative testing and feedback
5. Gradual rollout to users

---

**Document Version:** 1.0
**Last Updated:** 2025-11-26
**Maintained By:** KB Kinderboeken Dev Team
