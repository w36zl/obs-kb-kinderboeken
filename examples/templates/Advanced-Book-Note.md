---
title: "{{title}}"
authors:
{{#if authors}}
{{#each authors}}
  - "{{this}}"
{{/each}}
{{else}}
  - "Unknown Author"
{{/if}}
isbn: "{{isbn}}"
{{#if publishYear}}
publishYear: {{publishYear}}
{{/if}}
{{#if publisher}}
publisher: "{{publisher}}"
{{/if}}
{{#if language}}
language: "{{language}}"
{{/if}}
{{#if pageCount}}
pageCount: {{pageCount}}
{{/if}}
{{#if targetAge}}
targetAge: "{{targetAge}}"
{{/if}}
{{#if series}}
series: "{{series}}"
{{/if}}
subjects:
{{#if subjects}}
{{#each subjects}}
  - "{{this}}"
{{/each}}
{{/if}}
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
rating: ""
{{#if localCoverImage}}
cover: "{{localCoverImage}}"
{{/if}}
tags:
  - books
  - books/dutch
{{#if subjects}}
{{#each subjects}}
  - books/{{this}}
{{/each}}
{{/if}}
{{#if targetAge}}
  - books/age/{{targetAge}}
{{/if}}
---

# {{title}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

## Metadata

{{#if authors}}
**Author(s):** <%= authors.length > 1 ? authors.slice(0, -1).join(", ") + " and " + authors[authors.length - 1] : authors[0] %>
{{/if}}

{{#if publishYear}}**Published:** {{publishYear}}{{/if}}
{{#if publisher}} by {{publisher}}{{/if}}

{{#if isbn}}**ISBN:** {{isbn}}{{/if}}
{{#if language}}**Language:** {{language}}{{/if}}
{{#if pageCount}}**Pages:** {{pageCount}}{{/if}}
{{#if targetAge}}**Target Age:** {{targetAge}}{{/if}}

{{#if series}}
📚 **Series:** {{series}}
{{/if}}

{{#if subjects}}
**Subjects:** {{#each subjects}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

## Description

{{#if description}}
{{description}}
{{else}}
*No description available from KB.*
{{/if}}

## Why I Want to Read This

<!-- Add your personal notes here -->

## My Reading Notes

{{#if pageCount}}
**Progress:** 0 / {{pageCount}} pages
{{/if}}

### Chapter Notes

<!-- Add notes as you read -->

## Quotes

<!-- Favorite quotes from the book -->

## My Review

**Rating:** ⭐⭐⭐⭐⭐

**My Thoughts:**

<!-- Your review here -->

## Reading Progress

- [ ] Started reading
- [ ] 25% complete
- [ ] 50% complete
- [ ] 75% complete
- [ ] Finished reading
- [ ] Added rating
- [ ] Wrote review

{{#if targetAge}}
## Notes for Parents/Teachers

**Recommended Age:** {{targetAge}}

<!-- Notes about age-appropriateness, themes, discussion points -->
{{/if}}

---

*Book added via KB Nederlandse Kinderboeken plugin on {{DATE:YYYY-MM-DD}}*
