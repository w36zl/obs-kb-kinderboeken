// Quick test to verify command structure
const fs = require('fs');
const mainContent = fs.readFileSync('main.js', 'utf8');

// Check if BrowseExploreModal class exists
if (mainContent.includes('var BrowseExploreModal = class')) {
  console.log('✓ BrowseExploreModal class found');
} else {
  console.log('✗ BrowseExploreModal class NOT found');
}

// Check if command registration exists
if (mainContent.includes('"browse-explore-kb-kinderboeken"')) {
  console.log('✓ browse-explore command ID found');
} else {
  console.log('✗ browse-explore command ID NOT found');
}

// Check if new BrowseExploreModal is called
if (mainContent.includes('new BrowseExploreModal(this.app, this).open()')) {
  console.log('✓ BrowseExploreModal instantiation found');
} else {
  console.log('✗ BrowseExploreModal instantiation NOT found');
}

// Count all addCommand calls
const commandCount = (mainContent.match(/this\.addCommand\(/g) || []).length;
console.log(`\nTotal addCommand calls: ${commandCount}`);

// Extract all command IDs
const commandIds = [...mainContent.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
console.log('\nCommand IDs found:');
commandIds.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
