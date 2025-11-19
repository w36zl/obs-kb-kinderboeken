// Smoke test for the vocabulary-backed expansion helper used by the plugin.
// This script mirrors the static data in src/vocab-data.json so we can
// experiment with new aliases without running the entire plugin build.

const vocabulary = {
  publishers: new Map([
    ['vier wind', 'De Vier Windstreken'],
    ['lemnis', 'Lemniscaat'],
    ['gottmer', 'Gottmer'],
  ]),
  creators: new Map([
    ['ros park', 'Rosa Parks'],
    ['rosa park', 'Rosa Parks'],
    ['ann frank', 'Anne Frank'],
    ['donaldson', 'Julia Donaldson'],
  ]),
};

function expandQuery(query) {
  const lower = query.toLowerCase();
  const clauses = [];

  const publisher = [...vocabulary.publishers.entries()].find(([alias]) => lower.includes(alias));
  const creator = [...vocabulary.creators.entries()].find(([alias]) => lower.includes(alias));

  if (publisher && creator) {
    clauses.push(`dc.publisher all "${publisher[1]}" AND dc.creator all "${creator[1]}"`);
  } else if (publisher) {
    const remainder = lower.replace(publisher[0], '').trim();
    if (remainder) {
      clauses.push(`dc.publisher all "${publisher[1]}" AND dc.title all "${remainder}"`);
    }
  } else if (creator) {
    clauses.push(`dc.creator all "${creator[1]}"`);
  }

  return clauses.length ? clauses.join(' OR ') : query;
}

const samples = [
  'vier wind ros park',
  'lemnis gruffalo',
  'gottmer',
  'ann frank',
];

console.log('🧪 Vocabulary expansion smoke tests');
console.log('='.repeat(60));

samples.forEach((sample) => {
  console.log(`\nInput : ${sample}`);
  console.log(`Output: ${expandQuery(sample)}`);
});
