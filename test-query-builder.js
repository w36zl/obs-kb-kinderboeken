/**
 * Test the improved query builder logic
 * Shows how different search types are detected and constructed
 */

class QueryBuilder {
    buildSearchQuery(query, useChildrensFilter = true) {
        const trimmedQuery = query.trim();

        // Detect if query looks like an author name
        const titleWords = /\b(de|het|een|van|voor|kleine|grote)\b/i;
        const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z]/.test(trimmedQuery) || // "Lastname, Firstname" format
                               (/^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmedQuery) && 
                                !titleWords.test(trimmedQuery) && 
                                trimmedQuery.split(' ').length >= 2);

        // Detect if query is a series search
        const isLikelySeries = trimmedQuery.includes('"') || 
                               /serie|reeks|verzameling/i.test(trimmedQuery);

        let baseQuery;

        if (isLikelyAuthor) {
            baseQuery = `dc.creator="${trimmedQuery}" OR dc.creator all "${trimmedQuery}"`;
        } else if (isLikelySeries) {
            const cleanQuery = trimmedQuery.replace(/"/g, '');
            baseQuery = `dc.title="${cleanQuery}" OR dc.relation="${cleanQuery}" OR dc.title all "${cleanQuery}"`;
        } else {
            baseQuery = `dc.title="${trimmedQuery}" OR dc.title all "${trimmedQuery}"`;
        }

        if (useChildrensFilter) {
            return `(${baseQuery}) AND (dc.subject=Jeugd OR dc.subject="Jeugdliteratuur" OR dc.subject="Prentenboeken")`;
        }

        return baseQuery;
    }

    detectQueryType(query) {
        const trimmedQuery = query.trim();
        const titleWords = /\b(de|het|een|van|voor|kleine|grote)\b/i;
        const isLikelyAuthor = /^[A-Z][a-z]+,\s*[A-Z]/.test(trimmedQuery) ||
                               (/^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmedQuery) && 
                                !titleWords.test(trimmedQuery) && 
                                trimmedQuery.split(' ').length >= 2);
        const isLikelySeries = trimmedQuery.includes('"') || /serie|reeks|verzameling/i.test(trimmedQuery);

        if (isLikelyAuthor) return 'AUTHOR';
        if (isLikelySeries) return 'SERIES';
        return 'TITLE';
    }
}

// Test cases
const testQueries = [
    // Title searches (should NOT be detected as author)
    "De Gruffalo",
    "Het Muizenhuis",
    "Kleine IJsbeer",
    "Nijntje",
    "Het kleine huis",
    "De regenboogvis",
    
    // Author searches (should be detected as author)
    "Julia Donaldson",
    "Annie M.G. Schmidt",
    "Roald Dahl",
    "Donaldson, Julia",
    "Dick Bruna",
    "Max Velthuijs",
    
    // Series searches (should be detected as series)
    "Little People Big Dreams serie",
    "Kikker serie",
    "Sam & Julia reeks",
    '"Little People Big Dreams"',
    
    // Ambiguous cases
    "Pluk van de Petteflet",
    "Jip en Janneke",
];

const builder = new QueryBuilder();

console.log("🧪 Query Builder Test - Improved Detection\n");
console.log("=" .repeat(80));

testQueries.forEach(query => {
    const type = builder.detectQueryType(query);
    const searchQuery = builder.buildSearchQuery(query, false); // Without children's filter for clarity
    
    console.log(`\n📝 Query: "${query}"`);
    console.log(`   Type: ${type}`);
    console.log(`   Generated: ${searchQuery.substring(0, 120)}${searchQuery.length > 120 ? '...' : ''}`);
});

console.log("\n" + "=".repeat(80));
console.log("\n✅ Query Detection Summary:\n");

const typeCount = { TITLE: 0, AUTHOR: 0, SERIES: 0 };
testQueries.forEach(q => {
    typeCount[builder.detectQueryType(q)]++;
});

console.log(`Title searches:  ${typeCount.TITLE} queries`);
console.log(`Author searches: ${typeCount.AUTHOR} queries`);
console.log(`Series searches: ${typeCount.SERIES} queries`);

console.log("\n🎯 Key Improvements:");
console.log("  ✓ Detects Dutch title words (de, het, een, etc.)");
console.log("  ✓ Requires 2+ words for author detection");
console.log("  ✓ Handles 'Lastname, Firstname' format");
console.log("  ✓ Recognizes series keywords (serie, reeks)");
console.log("  ✓ Supports quoted series names");
console.log("  ✓ Title-only search for general queries");
console.log("\n");
