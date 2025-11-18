// Test the improved query logic

function buildImprovedQuery(author, series, publisher) {
  const parts = [];
  
  // Author - extract last name
  if (author) {
    if (!author.includes(',')) {
      const words = author.split(/\s+/);
      const lastName = words[words.length - 1];
      parts.push(`dc.creator all "${lastName}"`);
      console.log(`Author: "${author}" → searching for last name: "${lastName}"`);
    } else {
      parts.push(`dc.creator all "${author}"`);
      console.log(`Author: "${author}" → using as-is`);
    }
  }
  
  // Series - title only
  if (series) {
    parts.push(`dc.title all "${series}"`);
    console.log(`Series: "${series}" → searching in titles`);
  }
  
  // Publisher - remove location and articles
  if (publisher) {
    let publisherQuery = publisher.replace(/^\[.*?\]\s*:\s*/, '');
    publisherQuery = publisherQuery.replace(/^(De|Het)\s+/i, '');
    parts.push(`dc.publisher all "${publisherQuery}"`);
    console.log(`Publisher: "${publisher}" → cleaned: "${publisherQuery}"`);
  }
  
  return parts.join(' AND ');
}

console.log('\n=== Test Case 1: User input ===');
const query1 = buildImprovedQuery(
  'Maria Isabel Sánchez Vegara',
  'Little People, BIG DREAMS',
  'De vier windstreken'
);
console.log('\nGenerated query:', query1);

console.log('\n=== Test Case 2: Already formatted ===');
const query2 = buildImprovedQuery(
  'Donaldson, Julia',
  'Gruffalo',
  'Lemniscaat'
);
console.log('\nGenerated query:', query2);

console.log('\n=== Test Case 3: With location prefix ===');
const query3 = buildImprovedQuery(
  'Roald Dahl',
  null,
  '[Amsterdam] : De Fontein'
);
console.log('\nGenerated query:', query3);
