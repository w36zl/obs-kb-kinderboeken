import vocabData from "./vocab-data.json";

export interface VocabularyMatch {
  canonical: string;
  alias: string;
}

interface VocabularyEntry {
  canonical: string;
  aliases: string[];
}

interface VocabularyData {
  publishers: VocabularyEntry[];
  creators: VocabularyEntry[];
  series: VocabularyEntry[];
  titleStopWords: string[];
  subjectKeywords: VocabularyEntry[];
}

class Vocabulary {
  private publisherIndex: Map<string, VocabularyEntry> = new Map();
  private creatorIndex: Map<string, VocabularyEntry> = new Map();
  private seriesIndex: Map<string, VocabularyEntry> = new Map();
  private subjectIndex: Map<string, VocabularyEntry> = new Map();
  private stopWords: Set<string> = new Set();

  constructor(data: VocabularyData) {
    data.publishers.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.publisherIndex.set(alias.toLowerCase(), entry);
      });
    });

    data.creators.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.creatorIndex.set(alias.toLowerCase(), entry);
      });
    });

    data.series.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.seriesIndex.set(alias.toLowerCase(), entry);
      });
    });

    data.subjectKeywords.forEach((entry) => {
      entry.aliases.forEach((alias) => {
        this.subjectIndex.set(alias.toLowerCase(), entry);
      });
    });

    this.stopWords = new Set(data.titleStopWords.map((w) => w.toLowerCase()));
  }

  matchPublishers(query: string): VocabularyMatch[] {
    return this.matchEntries(query, this.publisherIndex);
  }

  matchCreators(query: string): VocabularyMatch[] {
    return this.matchEntries(query, this.creatorIndex);
  }

  matchSeries(query: string): VocabularyMatch[] {
    return this.matchEntries(query, this.seriesIndex);
  }

  matchSubjects(query: string): VocabularyMatch[] {
    return this.matchEntries(query, this.subjectIndex);
  }

  isStopWord(word: string): boolean {
    return this.stopWords.has(word.toLowerCase());
  }

  private matchEntries(query: string, index: Map<string, VocabularyEntry>): VocabularyMatch[] {
    const lowered = query.toLowerCase();
    const matches: VocabularyMatch[] = [];

    for (const [alias, entry] of index.entries()) {
      if (lowered.includes(alias)) {
        matches.push({ canonical: entry.canonical, alias });
      }
    }

    return matches;
  }
}

export const vocabulary = new Vocabulary(vocabData as VocabularyData);
