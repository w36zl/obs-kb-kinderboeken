const fs = require('fs');

// Compare original Little People Big Dreams ISBNs with discovered ones

// Read original list
const originalISBNs = fs.readFileSync('little-people-big-dreams.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

// Read discovered ISBNs
const progressData = JSON.parse(fs.readFileSync('little_people_big_dreams_progress.json', 'utf8'));
const discoveredISBNs = progressData.isbnsFound;

// Convert to sets for comparison
const originalSet = new Set(originalISBNs);
const discoveredSet = new Set(discoveredISBNs);

// Find missing ISBNs (in original but not discovered)
const missingFromDiscovered = originalISBNs.filter(isbn => !discoveredSet.has(isbn));

// Find new ISBNs (discovered but not in original)
const newISBNs = discoveredISBNs.filter(isbn => !originalSet.has(isbn));

// Print results
console.log('📊 ISBN Comparison Results\n');

console.log('📋 Original list (16 ISBNs):');
originalISBNs.forEach((isbn, index) => {
    const status = discoveredSet.has(isbn) ? '✅' : '❌';
    console.log(`   ${index + 1}. ${isbn} ${status}`);
});

console.log('\n🔍 Discovered ISBNs (34 ISBNs):');
discoveredISBNs.forEach((isbn, index) => {
    const inOriginal = originalSet.has(isbn) ? '(original)' : '(new)';
    console.log(`   ${index + 1}. ${isbn} ${inOriginal}`);
});

console.log('\n📈 Summary:');
console.log(`   - Original ISBNs: ${originalISBNs.length}`);
console.log(`   - Discovered ISBNs: ${discoveredISBNs.length}`);
console.log(`   - Missing from discovered: ${missingFromDiscovered.length}`);
console.log(`   - New ISBNs discovered: ${newISBNs.length}`);

if (missingFromDiscovered.length > 0) {
    console.log('\n❌ Missing ISBNs (need to scrape):');
    missingFromDiscovered.forEach(isbn => console.log(`   - ${isbn}`));
}

if (newISBNs.length > 0) {
    console.log('\n✨ New ISBNs discovered:');
    newISBNs.forEach(isbn => console.log(`   - ${isbn}`));
}

// Create updated ISBN list
const allISBNs = [...new Set([...originalISBNs, ...discoveredISBNs])].sort();
const updatedListPath = 'little-people-big-dreams-complete.txt';
fs.writeFileSync(updatedListPath, allISBNs.join('\n'));

console.log(`\n💾 Complete ISBN list saved to: ${updatedListPath}`);
console.log(`📊 Total unique ISBNs: ${allISBNs.length}`);