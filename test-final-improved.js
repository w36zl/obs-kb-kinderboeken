console.log('\n=== ADVANCED SEARCH - HOW IT NOW WORKS ===\n');

console.log('SCENARIO: Searching for Little People Big Dreams books by Vegara\n');

console.log('✗ OLD QUERY (0 results):');
console.log('  dc.creator all "Maria Isabel Sánchez Vegara"');
console.log('  AND dc.relation all "Little People, BIG DREAMS"');
console.log('  AND dc.title all "Little People, BIG DREAMS"');  
console.log('  AND dc.publisher all "De vier windstreken"');
console.log('');
console.log('  Problems:');
console.log('  1. Full author name doesn\'t match (KB uses "Sánchez Vegara, Maria Isabel")');
console.log('  2. Series NOT in dc.relation field');
console.log('  3. Series NOT in individual book titles (titles are "Aretha Franklin", etc.)');
console.log('  4. Publisher includes location prefix');
console.log('');

console.log('✓ NEW QUERY (25 results):');
console.log('  dc.creator all "Vegara"  ← Extracted last name');
console.log('  AND dc.publisher all "vier windstreken"  ← Removed "De" article');
console.log('  (Series field skipped in AND mode to avoid 0 results)');
console.log('');

console.log('HOW TO USE:\n');
console.log('Option 1 - Find by Author + Publisher (RECOMMENDED):');
console.log('  Author: Maria Isabel Sánchez Vegara  → Searches "Vegara"');
console.log('  Publisher: De vier windstreken  → Searches "vier windstreken"');
console.log('  Match mode: ALL (AND)');
console.log('  Series: (leave empty)  → Skipped to avoid filtering out results');
console.log('  Result: All LPBD books by Vegara from this publisher\n');

console.log('Option 2 - Find by Series Only:');
console.log('  Series: Little People');
console.log('  (all other fields empty)');
console.log('  Result: Books with "Little People" in the title\n');

console.log('Option 3 - Use OR mode:');
console.log('  Author: Vegara');
console.log('  Series: Little People');
console.log('  Match mode: ANY (OR)');
console.log('  Result: Books by Vegara OR with "Little People" in title\n');

console.log('TIPS:');
console.log('  • For authors: Just enter any name format - last name is extracted');
console.log('  • For series: Use alone OR with OR mode');
console.log('  • For publisher: Main name is extracted (location/articles removed)');
console.log('  • Use fewer criteria for broader results\n');
