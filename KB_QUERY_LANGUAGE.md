# KB SRU Query Language Reference

The Koninklijke Bibliotheek (KB) exposes its catalogue through **SRU 1.2** (Search/Retrieve via URL) using **CQL** (Contextual Query Language). This document summarises the query language itself and documents how the Obsidian plugin builds requests on top of it.

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

**Use case**: Best for general queries where you do not know whether the string is a title, author, or subject. SRU searches all indexed fields and applies its own relevance ranking.

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

> `all` must be preceded by a field name. `all "query"` by itself is **invalid**.

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

### Updated Implementation (v2.3+)

The query builder now composes searches in layers:

1. **Field shortcuts** – tokens such as `author:julia donaldson` or `publisher:lemnis` become explicit `dc.creator` / `dc.publisher` clauses.
2. **Identifier detection** – bare ISBN/PPN strings or `isbn:`/`ppn:` shortcuts produce `(bath.isbn="…" OR dc.identifier all "…")` clauses.
3. **Vocabulary-backed hints** – shorthands defined in `src/vocab-data.json` (publishers, creators, series, subjects) expand to canonical labels and emit combined clauses.
4. **Series heuristics** – words like `serie`, `reeks`, or quoted series names search both `dc.title` and `dc.relation`.
5. **Multi-field combinations** – phrases that mention both a title fragment and an author (e.g., `Gruffalo Donaldson`, `Gruffalo door Julia Donaldson`, or `Gruffalo - Julia Donaldson`) generate `(dc.title all "…" AND dc.creator all "…")` clauses.
6. **Fallback** – every structured clause is OR-ed with `cql.serverChoice all "original query"` so recall is never reduced.

When the children's-books toggle is enabled the whole query is wrapped in `(dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`.

### Field Shortcuts Supported by the Plugin

| Shortcut | Example input | Generated clause |
|----------|---------------|------------------|
| `author:` / `creator:` | `author:donaldson` | `dc.creator all "donaldson"` |
| `title:` / `titel:` | `title:gruffalo` | `dc.title all "gruffalo"` |
| `subject:` / `onderwerp:` | `subject:vriendschap` | `dc.subject all "vriendschap"` |
| `publisher:` / `uitgever:` | `publisher:lemnis` | `dc.publisher all "lemnis"` |
| `series:` / `serie:` / `reeks:` | `series:kikker` | `dc.title all "kikker" OR dc.relation all "kikker"` |
| `isbn:` | `isbn:9789047704539` | `(bath.isbn="9789047704539" OR dc.identifier all "9789047704539")` |
| `ppn:` | `ppn:123456789` | `dc.identifier all "PPN 123456789" OR dc.identifier all "123456789"` |
| `sort:` | `sort:recent`, `sort:oldest`, `sort:title` | Sets SRU `sortKeys` to `year,,1`, `year,,0`, or `title,,1` |

Any four-digit year in the free-text query also adds `sortKeys=year,,1` so recent editions float to the top.

### Vocabulary-Backed Expansions

The plugin uses JSON vocabularies to normalize common aliases:

* `vier wind ros park` → `(dc.publisher all "De Vier Windstreken" AND dc.creator all "Rosa Parks")`
* `lemnis gruffalo` → `(dc.publisher all "Lemniscaat" AND dc.title all "gruffalo")`
* `kikker serie` → `dc.relation all "Kikker"`

All such clauses are appended alongside the `cql.serverChoice` fallback, so no recall is lost.

### Linked Data Enrichment

When **Fetch KB linked data** is enabled (Settings → Search Preferences) each record with a PPN gains:

* `metadata.ppn` and `metadata.ppnUri`
* `metadata.linkedData.creators`, `.subjects`, and `.series` with URI/label pairs from `https://data.bibliotheken.nl/doc/nbt/{ppn}.json`

Templates can use these URIs to build backlinks to KB linked-data resources or to pivot into other datasets.

## Common Mistakes

### ❌ Invalid Queries

```cql
all "gruffalo"                    # ERROR: 'all' needs a field
"Little People Big Dreams" serie  # ERROR: 'serie' not a keyword, use AND or field
```

### ✅ Corrected Queries

```cql
dc.title all "gruffalo"                           # ✓ Field specified
"Little People Big Dreams" AND dc.relation=serie  # ✓ Proper boolean
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

1. **Use simple quoted searches for general queries** – Fastest and most accurate baseline.
2. **Add the children's filter only when needed** – Improves specificity without harming recall for adult titles.
3. **Cache results** – The plugin caches SRU responses for 10 minutes.
4. **Limit results** – Use `maximumRecords` to avoid unnecessary payloads.

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
| v2.3.0 | Layered detection + vocab expansions + linked data | ✅ Rich + safe |

**Lesson learned**: Keep the broad fallback query, but opportunistically add structure when intent is clear.
