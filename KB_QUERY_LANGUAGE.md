# KB SRU Query Language Reference

The Koninklijke Bibliotheek (KB) uses **SRU 1.2** (Search/Retrieve via URL) with **CQL** (Contextual Query Language).

## Official Documentation
- Protocol: SRU 1.2
- Query Language: CQL (Contextual Query Language)
- Base URL: `https://jsru.kb.nl/sru/sru`
- Collection: GGC (Gemeenschappelijk Geautomatiseerd Catalogussysteem)
- Documentation: http://jsru.kb.nl/

## Query Syntax

### 1. Simple Searches

```cql
"gruffalo"           # Searches ALL fields (title, author, subject, etc.)
gruffalo             # Same as above (quotes optional for single word)
"Little People"      # Multi-word phrase search
```

**Use case**: Best for general queries where you don't know if it's a title or author.

### 2. Field-Specific Searches

#### Exact Match
```cql
dc.title="De Gruffalo"              # Exact title
dc.creator="Donaldson, Julia"       # Exact author name
dc.subject="Jeugd"                  # Exact subject
dc.publisher="Lemniscaat"           # Exact publisher
```

#### Fuzzy Match (all operator)
```cql
dc.title all "gruffalo"             # All words appear in title (any order)
dc.creator all "Julia Donaldson"    # All words in creator field
dc.relation all "kikker"            # All words in relation (series)
```

**Important**: `all` MUST be preceded by a field name. `all "query"` alone is **invalid**.

#### Any Match (any operator)
```cql
dc.title any "gruffalo julia"       # Any of these words in title
```

### 3. Boolean Operators

```cql
# AND - Both conditions must match
"gruffalo" AND dc.subject=Jeugd

# OR - Either condition must match  
dc.title="gruffalo" OR dc.creator="donaldson"

# NOT - Must not match
dc.title="gruffalo" NOT dc.subject="Volwassenen"

# Complex combinations
("gruffalo" OR "kikker") AND (dc.subject=Jeugd OR dc.subject="Prentenboeken")
```

### 4. Dublin Core Fields

The KB uses Dublin Core metadata standard:

| Field | Description | Example |
|-------|-------------|---------|
| `dc.title` | Book title | De Gruffalo, Nijntje |
| `dc.creator` | Author/creator | Donaldson, Julia |
| `dc.subject` | Subject keywords | Jeugd, Prentenboeken, Vriendschap |
| `dc.publisher` | Publisher | Lemniscaat, Gottmer |
| `dc.date` | Publication date | 2000, 2021 |
| `dc.identifier` | ISBN, PPN, etc. | ISBN 9789047704539 |
| `dc.language` | Language | Nederlands, Engels |
| `dc.relation` | Related works, series | Muizenhuis serie |
| `dc.description` | Description text | Full text description |
| `dcterms:issued` | Issue date | 2000-01-01 |
| `dcterms:isPartOf` | Part of (series) | Little People Big Dreams |

## Plugin Query Strategies

### Current Implementation (v1.5.4+)

```typescript
// 1. AUTHOR - Only "Lastname, Firstname" with comma
if (/^[A-Z][a-z]+,\s*[A-Z]/.test(query)) {
    query = `dc.creator="${query}" OR dc.creator all "${query}"`;
}

// 2. SERIES - Contains serie/reeks/verzameling
else if (/\b(serie|reeks|verzameling)\b/i.test(query)) {
    const seriesName = query.replace(/\b(serie|reeks|verzameling)\b/gi, '').trim();
    query = `dc.title all "${seriesName}" OR dc.relation all "${seriesName}"`;
}

// 3. GENERAL - Everything else (BEST for most queries)
else {
    query = `"${query}"`;  // Let KB search everywhere
}

// 4. Children's book filter (optional)
if (prioritizeChildrensBooks) {
    query = `(${query}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
}
```

### Why Simple Quoted Search Works Best

The simple quoted search `"query"` lets the KB API:
- ✅ Search across ALL fields (title, creator, subject, description, etc.)
- ✅ Use its own relevance ranking
- ✅ Handle multi-lingual queries
- ✅ Find results even with minor variations
- ✅ Work for titles, authors, series - everything!

**Example:**
```cql
"Julia Donaldson"
```
Finds books where "Julia Donaldson" appears in:
- Title (if the book is titled after her)
- Creator (her authored books)
- Subject (books about her)
- Description (books mentioning her)

### When to Use Field-Specific Searches

**Use field-specific only when:**

1. **Explicit author format**: User types "Donaldson, Julia" with comma
   ```cql
   dc.creator="Donaldson, Julia" OR dc.creator all "Donaldson, Julia"
   ```

2. **Series keyword**: User types "kikker serie"
   ```cql
   dc.title all "kikker" OR dc.relation all "kikker"
   ```

3. **ISBN lookup**: User types ISBN
   ```cql
   dc.identifier=9789047704539
   ```

## Common Mistakes

### ❌ Invalid Queries

```cql
all "gruffalo"                    # ERROR: 'all' needs a field
"Little People Big Dreams" serie  # ERROR: 'serie' not a keyword, use AND
dc.creator Julia Donaldson        # ERROR: Missing quotes or operator
```

### ✅ Corrected Queries

```cql
dc.title all "gruffalo"                           # ✓ Field specified
"Little People Big Dreams" AND dc.relation=serie  # ✓ Proper boolean
dc.creator="Julia Donaldson"                      # ✓ Quoted value
```

## Testing Queries

You can test queries directly in your browser:

```
https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=YOUR_QUERY&maximumRecords=10
```

Example:
```
https://jsru.kb.nl/sru/sru?x-collection=GGC&version=1.2&operation=searchRetrieve&query=%22gruffalo%22&maximumRecords=10
```

## Performance Tips

1. **Use simple quoted searches for general queries** - Fastest and most accurate
2. **Add children's filter only when needed** - Improves specificity
3. **Cache results** - The plugin caches for 10 minutes
4. **Limit results** - Use `maximumRecords` parameter appropriately

## References

- SRU 1.2 Specification: http://www.loc.gov/standards/sru/
- CQL Specification: https://www.loc.gov/standards/sru/cql/
- Dublin Core: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
- KB SRU API: http://jsru.kb.nl/

## History of Plugin Query Evolution

| Version | Query Strategy | Issue |
|---------|---------------|-------|
| v1.3.0 | Simple `"query"` | ✅ Worked great |
| v1.4.0 | Field-specific `dc.title="query"` | ❌ Too restrictive |
| v1.4.1 | Back to `"query"` | ✅ Fixed |
| v1.5.0 | `all "query"` without field | ❌ Invalid syntax |
| v1.5.2 | `dc.title all "query"` | ⚠️ Better but restrictive |
| v1.5.4 | Back to `"query"` for general | ✅ Optimal |

**Lesson learned**: The simple quoted search is the best default strategy!
