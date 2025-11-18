// Test the query expansion logic

function expandPartialQuery(query) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (words.length <= 2) {
    return query;
  }

  const publisherExpansions = {
    'vier wind': 'vier windstreken',
    'wind': 'windstreken',
    'fontein': 'fontein',
    'lemnis': 'lemniscaat',
  };

  const nameExpansions = {
    'ros park': 'rosa parks',
    'rosa park': 'rosa parks',
    'mari curie': 'marie curie',
    'ann frank': 'anne frank',
  };

  const queryLower = query.toLowerCase();
  
  let publisherTerm = '';
  for (const [abbrev, full] of Object.entries(publisherExpansions)) {
    if (queryLower.includes(abbrev)) {
      publisherTerm = full;
      break;
    }
  }

  let nameTerm = '';
  for (const [abbrev, full] of Object.entries(nameExpansions)) {
    if (queryLower.includes(abbrev)) {
      nameTerm = full;
      break;
    }
  }

  if (publisherTerm && nameTerm) {
    console.log(`Expanded: "${query}" → publisher:"${publisherTerm}" + name:"${nameTerm}"`);
    return `dc.publisher all "${publisherTerm}" AND dc.title all "${nameTerm}"`;
  }

  if (publisherTerm) {
    const remainingWords = words.filter(w => 
      !publisherTerm.toLowerCase().includes(w) && w.length > 2
    ).join(' ');
    
    if (remainingWords) {
      console.log(`Expanded: "${query}" → publisher:"${publisherTerm}" + keywords:"${remainingWords}"`);
      return `dc.publisher all "${publisherTerm}" AND "${remainingWords}"`;
    }
  }

  if (nameTerm) {
    console.log(`Expanded: "${query}" → name:"${nameTerm}"`);
    return `"${nameTerm}"`;
  }

  return query;
}

console.log('\n=== Query Expansion Tests ===\n');

console.log('Test 1: vier wind ros park');
console.log('Result:', expandPartialQuery('vier wind ros park'));

console.log('\nTest 2: fontein harry potter');
console.log('Result:', expandPartialQuery('fontein harry potter'));

console.log('\nTest 3: lemnis gruffalo');
console.log('Result:', expandPartialQuery('lemnis gruffalo'));

console.log('\nTest 4: ros park');
console.log('Result:', expandPartialQuery('ros park'));

console.log('\nTest 5: rosa parks (no expansion - exact match)');
console.log('Result:', expandPartialQuery('rosa parks'));

console.log('\nTest 6: gruffalo (no expansion - single word)');
console.log('Result:', expandPartialQuery('gruffalo'));

console.log('\nTest 7: vier wind anne frank');
console.log('Result:', expandPartialQuery('vier wind ann frank'));
