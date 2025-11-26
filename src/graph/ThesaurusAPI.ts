import type { SPARQLResult, ConceptDetails, ConceptRelationship } from './types';

export class ThesaurusAPI {
  private readonly endpoint = 'https://data.bibliotheken.nl/sparql';
  private cache: Map<string, ConceptDetails> = new Map();

  /**
   * Find concept URI by label (Dutch)
   */
  async findConceptByLabel(label: string): Promise<string | null> {
    const query = `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT ?concept WHERE {
        ?concept a skos:Concept .
        ?concept skos:prefLabel ?label .
        FILTER(LCASE(STR(?label)) = LCASE("${this.escapeSPARQL(label)}"))
        FILTER(LANG(?label) = 'nl' || LANG(?label) = '')
      } LIMIT 1
    `;

    const results = await this.executeSPARQL<{ concept: SPARQLResult }>(query);
    return results.length > 0 ? this.getValue(results[0].concept) || null : null;
  }

  /**
   * Get full concept details including all relationships
   */
  async getConceptDetails(labelOrUri: string): Promise<ConceptDetails | null> {
    // Validate input
    if (!labelOrUri || labelOrUri.trim() === '') {
      return null;
    }

    // Check cache first
    const cacheKey = labelOrUri.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Determine if this is a URI or label
    const uri = labelOrUri.startsWith('http')
      ? labelOrUri
      : await this.findConceptByLabel(labelOrUri);

    if (!uri) {
      console.warn(`[ThesaurusAPI] Concept not found: ${labelOrUri}`);
      return null;
    }

    // Get concept label and relationships
    const query = `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT ?label ?type ?relatedUri ?relatedLabel
      WHERE {
        # Get concept label
        <${uri}> skos:prefLabel ?label .
        FILTER(LANG(?label) = 'nl' || LANG(?label) = '')

        # Get relationships
        OPTIONAL {
          {
            <${uri}> skos:broader ?relatedUri .
            BIND('broader' AS ?type)
          } UNION {
            <${uri}> skos:narrower ?relatedUri .
            BIND('narrower' AS ?type)
          } UNION {
            <${uri}> skos:related ?relatedUri .
            BIND('related' AS ?type)
          }
          ?relatedUri skos:prefLabel ?relatedLabel .
          FILTER(LANG(?relatedLabel) = 'nl' || LANG(?relatedLabel) = '')
        }
      }
    `;

    const results = await this.executeSPARQL<{
      label: SPARQLResult;
      type?: SPARQLResult;
      relatedUri?: SPARQLResult;
      relatedLabel?: SPARQLResult;
    }>(query);

    if (results.length === 0) {
      return null;
    }

    // Extract label (same for all rows)
    const label = this.getValue(results[0]?.label);
    if (!label) {
      console.warn('[ThesaurusAPI] Concept has no label:', uri);
      return null;
    }

    // Group relationships by type
    const broader: ConceptRelationship[] = [];
    const narrower: ConceptRelationship[] = [];
    const related: ConceptRelationship[] = [];

    for (const row of results) {
      const type = this.getValue(row.type);
      const relatedUri = this.getValue(row.relatedUri);
      const relatedLabel = this.getValue(row.relatedLabel);

      if (!type || !relatedUri || !relatedLabel) continue;

      const relationship: ConceptRelationship = {
        type: type as 'broader' | 'narrower' | 'related',
        uri: relatedUri,
        label: relatedLabel,
      };

      if (type === 'broader') {
        broader.push(relationship);
      } else if (type === 'narrower') {
        narrower.push(relationship);
      } else if (type === 'related') {
        related.push(relationship);
      }
    }

    const details: ConceptDetails = {
      uri,
      label,
      broader,
      narrower,
      related,
    };

    // Cache the result
    this.cache.set(cacheKey, details);
    this.cache.set(uri.toLowerCase(), details); // Cache by URI too

    return details;
  }

  /**
   * Get multiple concepts in a single batch query (more efficient)
   */
  async getConceptsBatch(labels: string[]): Promise<Map<string, ConceptDetails>> {
    const results = new Map<string, ConceptDetails>();

    // Filter out null/undefined labels and already cached
    const validLabels = labels.filter((label) => label != null && label !== '');
    const uncached = validLabels.filter(
      (label) => !this.cache.has(label.toLowerCase())
    );

    if (uncached.length === 0) {
      // All cached, return from cache
      for (const label of validLabels) {
        const cached = this.cache.get(label.toLowerCase());
        if (cached) {
          results.set(label, cached);
        }
      }
      return results;
    }

    // Query for uncached concepts
    console.log(`[ThesaurusAPI] Querying ${uncached.length} subjects:`, uncached.slice(0, 10));

    const query = `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT ?concept ?label ?type ?relatedUri ?relatedLabel
      WHERE {
        # Find concepts by label
        ?concept a skos:Concept .
        ?concept skos:prefLabel ?label .
        FILTER(LCASE(STR(?label)) IN (${uncached.map((l) => `LCASE("${this.escapeSPARQL(l)}")`).join(', ')}))
        FILTER(LANG(?label) = 'nl' || LANG(?label) = '')

        # Get relationships
        OPTIONAL {
          {
            ?concept skos:broader ?relatedUri .
            BIND('broader' AS ?type)
          } UNION {
            ?concept skos:narrower ?relatedUri .
            BIND('narrower' AS ?type)
          } UNION {
            ?concept skos:related ?relatedUri .
            BIND('related' AS ?type)
          }
          ?relatedUri skos:prefLabel ?relatedLabel .
          FILTER(LANG(?relatedLabel) = 'nl' || LANG(?relatedLabel) = '')
        }
      }
    `;

    const queryResults = await this.executeSPARQL<{
      concept: SPARQLResult;
      label: SPARQLResult;
      type?: SPARQLResult;
      relatedUri?: SPARQLResult;
      relatedLabel?: SPARQLResult;
    }>(query);

    console.log(`[ThesaurusAPI] Batch query returned ${queryResults.length} rows for ${uncached.length} labels`);

    // Group by concept
    const conceptMap = new Map<string, typeof queryResults>();
    for (const row of queryResults) {
      // Skip rows with invalid concept URI
      const uri = this.getValue(row.concept);
      if (!uri) {
        console.warn('[ThesaurusAPI] Skipping row with no concept URI:', row);
        continue;
      }

      if (!conceptMap.has(uri)) {
        conceptMap.set(uri, []);
      }
      conceptMap.get(uri)!.push(row);
    }

    // Build ConceptDetails for each concept
    for (const [uri, rows] of conceptMap.entries()) {
      // Skip if no valid label
      const label = this.getValue(rows[0]?.label);
      if (!label) {
        console.warn('[ThesaurusAPI] Skipping concept with no label:', uri);
        continue;
      }

      const broader: ConceptRelationship[] = [];
      const narrower: ConceptRelationship[] = [];
      const related: ConceptRelationship[] = [];

      for (const row of rows) {
        const type = this.getValue(row.type);
        const relatedUri = this.getValue(row.relatedUri);
        const relatedLabel = this.getValue(row.relatedLabel);

        if (!type || !relatedUri || !relatedLabel) continue;

        const relationship: ConceptRelationship = {
          type: type as 'broader' | 'narrower' | 'related',
          uri: relatedUri,
          label: relatedLabel,
        };

        if (type === 'broader') {
          broader.push(relationship);
        } else if (type === 'narrower') {
          narrower.push(relationship);
        } else if (type === 'related') {
          related.push(relationship);
        }
      }

      const details: ConceptDetails = { uri, label, broader, narrower, related };

      // Cache and add to results
      this.cache.set(label.toLowerCase(), details);
      this.cache.set(uri.toLowerCase(), details);
      results.set(label, details);
    }

    // Add cached results for labels that were already cached
    for (const label of validLabels) {
      if (!results.has(label)) {
        const cached = this.cache.get(label.toLowerCase());
        if (cached) {
          results.set(label, cached);
        }
      }
    }

    return results;
  }

  /**
   * Execute SPARQL query and return parsed results
   */
  private async executeSPARQL<T extends Record<string, SPARQLResult>>(
    query: string
  ): Promise<T[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('query', query);
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle array response format (simplified bindings)
      if (Array.isArray(data)) {
        return data as T[];
      }

      // Handle standard SPARQL JSON results format
      if (data.results && data.results.bindings) {
        return data.results.bindings as T[];
      }

      // Unexpected format
      console.warn('[ThesaurusAPI] Unexpected SPARQL response format:', data);
      return [];

    } catch (error) {
      console.error('[ThesaurusAPI] SPARQL query error:', error);
      console.error('[ThesaurusAPI] Query was:', query);
      return [];
    }
  }

  /**
   * Extract value from SPARQL binding (handles both simplified and standard formats)
   */
  private getValue(binding: any): string | undefined {
    if (!binding) return undefined;

    // Standard SPARQL JSON format: {type: "uri", value: "..."}
    if (typeof binding === 'object' && binding.value) {
      return binding.value;
    }

    // Simplified format: direct string
    if (typeof binding === 'string') {
      return binding;
    }

    return undefined;
  }

  /**
   * Escape special characters for SPARQL string literals
   */
  private escapeSPARQL(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
