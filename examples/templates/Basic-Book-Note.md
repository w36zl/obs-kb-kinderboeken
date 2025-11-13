---
title: "{{title}}"
author: "{{author}}"
isbn: "{{isbn}}"
publishYear: "{{publishYear}}"
dateAdded: "{{DATE:YYYY-MM-DD}}"
status: "to-read"
tags:
  - books
---

# {{title}}

{{#if localCoverImage}}
![[{{localCoverImage}}|200]]
{{/if}}

**By:** {{authorsString}}
{{#if publishYear}}**Published:** {{publishYear}}{{/if}}
{{#if publisher}}**Publisher:** {{publisher}}{{/if}}
{{#if isbn}}**ISBN:** {{isbn}}{{/if}}

## Description

{{#if description}}
{{description}}
{{else}}
No description available.
{{/if}}

## My Notes



## Reading Progress

- [ ] Started reading
- [ ] Finished reading
- [ ] Added rating

---

*Added via KB Nederlandse Kinderboeken plugin on {{DATE:YYYY-MM-DD}}*
