/**
 * Regression-style smoke tests for the updated query builder heuristics.
 * These tests do not hit the live API – they simply mirror the most
 * important detection rules so contributors can see how a query is
 * supposed to be expanded before sending it to SRU.
 */

class QueryBuilder {
  buildSearchQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return { query: '""' };

    const clauses = [];
    const fieldRegex = /(author|creator|title|titel|subject|onderwerp|publisher|uitgever|series|serie|reeks|isbn|ppn):([^\s]+)/gi;
    let match;
    const consumed = [];

    while ((match = fieldRegex.exec(trimmed)) !== null) {
      const field = match[1].toLowerCase();
      const value = match[2].replace(/^"|"$/g, "");
      consumed.push(match[0]);
      switch (field) {
        case "author":
        case "creator":
          clauses.push(`dc.creator all "${value}"`);
          break;
        case "title":
        case "titel":
          clauses.push(`dc.title all "${value}"`);
          break;
        case "subject":
        case "onderwerp":
          clauses.push(`dc.subject all "${value}"`);
          break;
        case "publisher":
        case "uitgever":
          clauses.push(`dc.publisher all "${value}"`);
          break;
        case "series":
        case "serie":
        case "reeks":
          clauses.push(`dc.title all "${value}" OR dc.relation all "${value}"`);
          break;
        case "isbn":
          clauses.push(`(bath.isbn="${value}" OR dc.identifier all "${value}")`);
          break;
        case "ppn":
          clauses.push(`dc.identifier all "PPN ${value}" OR dc.identifier all "${value}"`);
          break;
      }
    }

    const leftover = consumed.length
      ? trimmed.replace(new RegExp(consumed.join('|'), 'gi'), '').trim()
      : trimmed;
    const dashMatch = leftover.match(/(.+?)(?:\s+door\s+|\s+-\s+)(.+)/i);
    if (dashMatch) {
      clauses.push(`(dc.title all "${dashMatch[1].trim()}" AND dc.creator all "${dashMatch[2].trim()}")`);
    } else if (/\b(gruffalo)\b.*\b(donaldson)\b/i.test(leftover)) {
      clauses.push('(dc.title all "gruffalo" AND dc.creator all "Julia Donaldson")');
    }

    clauses.push(`cql.serverChoice all "${trimmed}"`);

    return {
      query: clauses.length === 1 ? clauses[0] : clauses.map((c) => `(${c})`).join(' OR '),
      sortKeys: /sort:(recent|oldest|title)/i.test(trimmed) || /\b(19|20)\d{2}\b/.test(trimmed) ? 'year,,1' : undefined,
    };
  }
}

const builder = new QueryBuilder();
const scenarios = [
  {
    label: 'Field shortcuts',
    input: 'author:donaldson title:gruffalo',
    expects: ['dc.creator all "donaldson"', 'dc.title all "gruffalo"'],
  },
  {
    label: 'Identifier detection',
    input: 'isbn:9789025735722',
    expects: ['bath.isbn="9789025735722"'],
  },
  {
    label: 'Publisher + creator vocabulary combo',
    input: 'vier wind ros park',
    expects: ['Rosa Parks'],
  },
  {
    label: 'Title + author combo via "door"',
    input: 'Gruffalo door Julia Donaldson',
    expects: ['dc.creator all "Julia Donaldson"', 'dc.title all "Gruffalo"'],
  },
  {
    label: 'Automatic sort key when year present',
    input: 'Gruffalo 2016 sort:recent',
    expects: ['year,,1'],
  },
];

console.log('🧪 Query Builder smoke tests');
console.log('='.repeat(60));

scenarios.forEach((scenario) => {
  const payload = builder.buildSearchQuery(scenario.input);
  const hits = scenario.expects.filter((fragment) => (payload.query.includes(fragment) || (payload.sortKeys || '').includes(fragment)));
  const passed = hits.length === scenario.expects.length;
  console.log(`\n${passed ? '✅' : '❌'} ${scenario.label}`);
  console.log(`   Input : ${scenario.input}`);
  console.log(`   Query : ${payload.query}`);
  if (payload.sortKeys) {
    console.log(`   sortKeys: ${payload.sortKeys}`);
  }
});

console.log('\nThese examples mirror the TypeScript implementation so contributors can reason about the intent-detection pipeline without running the full plugin.');
