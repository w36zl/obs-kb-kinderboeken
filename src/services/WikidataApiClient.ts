import { requestUrl } from "obsidian";

export interface WikidataAuthorInfo {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  birthDate?: string;
  deathDate?: string;
  wikipediaUrl?: string;
  notableWorks?: string[];
  occupation?: string[];
}

export interface WikidataBookInfo {
  id: string;
  title: string;
  authors?: WikidataAuthorInfo[];
  publicationDate?: string;
  isbn?: string;
  genre?: string[];
  characters?: WikidataCharacterInfo[];
}

export interface WikidataCharacterInfo {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  wikipediaUrl?: string;
}

export interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  url: string;
}

export class WikidataApiClient {
  private readonly BASE_URL = "https://www.wikidata.org/w/api.php";
  private readonly SPARQL_URL = "https://query.wikidata.org/sparql";
  private readonly ENTITY_URL = "https://www.wikidata.org/wiki/Special:EntityData";

  /**
   * Search Wikidata entities by text query
   */
  async searchEntities(query: string, language: string = "nl", limit: number = 5): Promise<WikidataSearchResult[]> {
    try {
      const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: language,
        limit: limit.toString(),
        format: "json",
        uselang: language,
      });

      const response = await requestUrl({
        url: `${this.BASE_URL}?${params}`,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianKBPlugin/3.0.3",
        },
      });

      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata search failed:", response.status);
        return [];
      }

      const data = response.json;
      if (!data.search || !Array.isArray(data.search)) {
        return [];
      }

      return data.search.map((item: any) => ({
        id: item.id,
        label: item.label || item.display?.label?.value,
        description: item.description || item.display?.description?.value,
        url: `https://www.wikidata.org/wiki/${item.id}`,
      }));
    } catch (error) {
      console.error("[KB Plugin] Wikidata search error:", error);
      return [];
    }
  }

  /**
   * Get detailed information about a Wikidata entity
   */
  async getEntityData(entityId: string): Promise<any> {
    try {
      const response = await requestUrl({
        url: `${this.ENTITY_URL}/${entityId}.json`,
        method: "GET",
        headers: {
          "User-Agent": "ObsidianKBPlugin/3.0.3",
        },
      });

      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata entity fetch failed:", response.status, entityId);
        return null;
      }

      return response.json;
    } catch (error) {
      console.error("[KB Plugin] Wikidata entity error:", error, entityId);
      return null;
    }
  }

  /**
   * Get author information from Wikidata
   */
  async getAuthorInfo(authorName: string): Promise<WikidataAuthorInfo | null> {
    try {
      console.log("[KB Plugin] Searching Wikidata for author:", authorName);

      // Search for the author
      const searchResults = await this.searchEntities(authorName, "nl", 3);
      if (searchResults.length === 0) {
        console.log("[KB Plugin] No Wikidata results for author:", authorName);
        return null;
      }

      // Get the first result (usually the most relevant)
      const entityId = searchResults[0].id;
      const entityData = await this.getEntityData(entityId);

      if (!entityData?.entities?.[entityId]) {
        console.log("[KB Plugin] No entity data for:", entityId);
        return null;
      }

      const entity = entityData.entities[entityId];
      const claims = entity.claims || {};

      // Extract author information
      const authorInfo: WikidataAuthorInfo = {
        id: entityId,
        name: entity.labels?.nl?.value || entity.labels?.en?.value || searchResults[0].label,
        description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value,
      };

      // Birth date
      if (claims.P569 && claims.P569[0]?.mainsnak?.datavalue?.value?.time) {
        const birthTime = claims.P569[0].mainsnak.datavalue.value.time;
        authorInfo.birthDate = this.parseWikidataDate(birthTime);
      }

      // Death date
      if (claims.P570 && claims.P570[0]?.mainsnak?.datavalue?.value?.time) {
        const deathTime = claims.P570[0].mainsnak.datavalue.value.time;
        authorInfo.deathDate = this.parseWikidataDate(deathTime);
      }

      // Image
      if (claims.P18 && claims.P18[0]?.mainsnak?.datavalue?.value) {
        const imageFile = claims.P18[0].mainsnak.datavalue.value;
        authorInfo.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
      }

      // Occupation
      if (claims.P106) {
        authorInfo.occupation = claims.P106
          .map((claim: any) => claim?.mainsnak?.datavalue?.value?.id)
          .filter((id: string) => id)
          .map((id: string) => this.getOccupationLabel(id));
      }

      // Notable works (P800)
      if (claims.P800) {
        authorInfo.notableWorks = claims.P800
          .map((claim: any) => claim?.mainsnak?.datavalue?.value?.id)
          .filter((id: string) => id);
      }

      // Wikipedia link
      const sitelinks = entity.sitelinks || {};
      const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
      if (nlWiki) {
        authorInfo.wikipediaUrl = `https://nl.wikipedia.org/wiki/${encodeURIComponent(nlWiki.title)}`;
      }

      console.log("[KB Plugin] Found Wikidata author info:", authorInfo);
      return authorInfo;
    } catch (error) {
      console.error("[KB Plugin] Error getting author info:", error);
      return null;
    }
  }

  /**
   * Get character information for popular books
   */
  async getCharacterInfo(characterName: string): Promise<WikidataCharacterInfo | null> {
    try {
      console.log("[KB Plugin] Searching Wikidata for character:", characterName);

      const searchResults = await this.searchEntities(characterName, "nl", 3);
      if (searchResults.length === 0) {
        return null;
      }

      const entityId = searchResults[0].id;
      const entityData = await this.getEntityData(entityId);

      if (!entityData?.entities?.[entityId]) {
        return null;
      }

      const entity = entityData.entities[entityId];
      const claims = entity.claims || {};

      const characterInfo: WikidataCharacterInfo = {
        id: entityId,
        name: entity.labels?.nl?.value || entity.labels?.en?.value || searchResults[0].label,
        description: entity.descriptions?.nl?.value || entity.descriptions?.en?.value,
      };

      // Image
      if (claims.P18 && claims.P18[0]?.mainsnak?.datavalue?.value) {
        const imageFile = claims.P18[0].mainsnak.datavalue.value;
        characterInfo.imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(imageFile)}`;
      }

      // Wikipedia link
      const sitelinks = entity.sitelinks || {};
      const nlWiki = sitelinks.nlwiki || sitelinks.enwiki;
      if (nlWiki) {
        characterInfo.wikipediaUrl = `https://nl.wikipedia.org/wiki/${encodeURIComponent(nlWiki.title)}`;
      }

      console.log("[KB Plugin] Found Wikidata character info:", characterInfo);
      return characterInfo;
    } catch (error) {
      console.error("[KB Plugin] Error getting character info:", error);
      return null;
    }
  }

  /**
   * Search for books by author
   */
  async searchBooksByAuthor(authorName: string): Promise<WikidataBookInfo[]> {
    try {
      // First find the author
      const authorInfo = await this.getAuthorInfo(authorName);
      if (!authorInfo) {
        return [];
      }

      // Use SPARQL to find books by this author
      const sparqlQuery = `
        SELECT ?book ?bookLabel ?isbn WHERE {
          ?book wdt:P50 wd:${authorInfo.id} .
          OPTIONAL { ?book wdt:P212 ?isbn }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "nl,en". }
        }
        LIMIT 20
      `;

      const response = await requestUrl({
        url: this.SPARQL_URL,
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "ObsidianKBPlugin/3.0.3",
        },
        body: `query=${encodeURIComponent(sparqlQuery)}`,
      });

      if (response.status !== 200) {
        console.warn("[KB Plugin] Wikidata SPARQL failed:", response.status);
        return [];
      }

      const data = response.json;
      const bindings = data.results?.bindings || [];

      return bindings.map((binding: any) => ({
        id: binding.book?.value?.split('/').pop(),
        title: binding.bookLabel?.value,
        authors: [authorInfo],
        isbn: binding.isbn?.value,
      })).filter((book: WikidataBookInfo) => book.title);
    } catch (error) {
      console.error("[KB Plugin] Error searching books by author:", error);
      return [];
    }
  }

  /**
   * Parse Wikidata date format (+YYYY-MM-DDTHH:mm:ssZ)
   */
  private parseWikidataDate(wikidataDate: string): string {
    if (!wikidataDate || !wikidataDate.startsWith('+')) {
      return wikidataDate;
    }

    // Extract just the date part (YYYY-MM-DD)
    const dateMatch = wikidataDate.match(/\+(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[1] : wikidataDate;
  }

  /**
   * Get human-readable occupation label from Wikidata QID
   */
  private getOccupationLabel(qid: string): string {
    const occupationMap: { [key: string]: string } = {
      'Q36180': 'writer',
      'Q482980': 'author',
      'Q49757': 'poet',
      'Q28389': 'screenwriter',
      'Q6625963': 'novelist',
      'Q4853732': 'children\'s writer',
      'Q333634': 'translator',
      'Q12144794': 'illustrator',
      'Q644687': 'illustrator',
      'Q1028181': 'painter',
    };

    return occupationMap[qid] || qid;
  }
}