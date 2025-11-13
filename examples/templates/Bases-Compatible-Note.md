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
publishYear: {{publishYear}}
publisher: "{{publisher}}"
language: "{{language}}"
pageCount: {{pageCount}}
targetAge: "{{targetAge}}"
subjects:
{{#if subjects}}
{{#each subjects}}
  - "{{this}}"
{{/each}}
{{/if}}
status: "to-read"
rating: 0
progress: 0
dateAdded: "{{DATE:YYYY-MM-DD}}"
dateStarted: ""
dateFinished: ""
cover: "{{localCoverImage}}"
tags:
  - books
{{#if subjects}}
{{#each subjects}}
  - books/{{this}}
{{/each}}
{{/if}}
---

# {{title}}

> [!info] Book Information
> **Authors:** {{authorsString}}
> **ISBN:** {{isbn}}
> **Published:** {{publishYear}} by {{publisher}}
> **Language:** {{language}}
> **Pages:** {{pageCount}}
> **Target Age:** {{targetAge}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

## Description

{{#if description}}
{{description}}
{{else}}
*No description available.*
{{/if}}

## My Notes

<!-- Your reading notes -->

## Progress Tracking

**Status:** {{status}}
**Progress:** {{progress}}%
**Rating:** {{rating}}/5

---

*Added via KB plugin on {{DATE:YYYY-MM-DD}}*

<!--
OBSIDIAN BASES USAGE:
1. Create a new Base view in Obsidian
2. Configure columns:
   - title (text)
   - authors (list)
   - isbn (text)
   - publishYear (number)
   - status (select: to-read, reading, finished)
   - rating (number)
   - progress (number)
   - dateAdded (date)

3. Use filters:
   - status = "reading" → Currently reading
   - rating >= 4 → Highly rated books
   - publishYear >= 2020 → Recent books
   - authors contains "Donaldson" → Books by author

4. Use formulas:
   - Days Since Added: (today() - dateAdded) / 86400000
   - Reading Progress: progress + "%"
   - Age Group: if(targetAge, targetAge, "All Ages")

5. Create grouped views:
   - Group by: status
   - Group by: authors
   - Group by: publishYear
-->
