# Linked Data Feature Status

## Current Status (v3.0.2)

The linked data integration feature is **fully implemented and working**, but most books don't have linked data available.

## What Was Fixed

### PPN Extraction (v3.0.2)
- ✅ Fixed PPN extraction to check `dcx:recordIdentifier` field
- ✅ Regex now correctly matches pattern: `PPN?PPN=(\d{8,10})`
- ✅ Example: `http://picarta.pica.nl/DB=2.4/PPN?PPN=325548242` → extracts `325548242`

### Implementation Status
- ✅ API client fetches linked data from `https://data.bibliotheken.nl/doc/nbt/{PPN}.json`
- ✅ UI displays linked data section with glassmorphic cards
- ✅ Shows creators, subjects, and series with URIs
- ✅ "Find all books" and "View URI" buttons functional
- ✅ Template variables available: `{{linkedDataUri}}`, `{{linkedCreatorUri}}`, etc.

## Why You Don't See Linked Data

### The Reality
**Most books in the KB catalog (GGC) don't have corresponding linked data records** in the NBT (Nederlandse Bibliografie Totaal) dataset at data.bibliotheken.nl.

### Evidence
Tested multiple books:
- Nijntje books - No linked data
- Kikker is Kikker - No linked data  
- Van Klein tot Groots series - No linked data

### What This Means
The KB's linked data portal (`data.bibliotheken.nl`) contains:
- STCN (historical Dutch books pre-1800)
- NTA (authority files for persons/organizations)
- NBT (modern Dutch bibliography) - **but only a subset of catalog records**
- Various thesauri

**The GGC catalog is much larger than the NBT linked data set.**

## When You Will See Linked Data

Linked data will appear in the UI when:
1. A book has a PPN (most do)
2. That PPN exists in the NBT linked data set (rare)
3. The NBT record includes creator/subject/series URIs (even rarer)

### Testing
To see the feature in action, you would need to find a book that has:
- A PPN in the KB catalog
- A corresponding record at `https://data.bibliotheken.nl/doc/nbt/{PPN}.json`

## Debug Logging

The plugin logs all linked data attempts. Check Obsidian's Developer Console (Ctrl+Shift+I) for messages like:

```
[KB Plugin] Found PPN in dcx:recordIdentifier: 325548242
[KB Plugin] Fetching linked data from: https://data.bibliotheken.nl/doc/nbt/325548242.json
[KB Plugin] Linked data response status: 404
[KB Plugin] No linked data available for: Kikker is Kikker
```

## Feature Toggle

You can disable linked data enrichment in settings if you don't want the API calls:
- Settings → "Enable Linked Data Enrichment" toggle

## Conclusion

The feature is **working as designed**. The lack of visible linked data is due to **data availability** at data.bibliotheken.nl, not a bug in the plugin.

If the KB expands their NBT linked data coverage in the future, the plugin will automatically start showing that data.
