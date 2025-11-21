# Code Review Report

This document provides a comprehensive code review of the obs-kb-kinderboeken Obsidian plugin, identifying issues, potential bugs, and improvement opportunities.

## Critical Issues

### 1. Import Path Mismatch in CoverDownloadService.ts (Line 4)
**File:** `src/services/CoverDownloadService.ts:4`
**Issue:** The import path references `../template/TemplateEngine` but the actual file is `../template/engine`.
```typescript
// Current (incorrect):
import type { TemplateEngine } from "../template/TemplateEngine";

// Should be:
import type { TemplateEngine } from "../template/engine";
```
**Severity:** Critical - Build may fail or runtime error

### 2. Unused Variable in modal.ts (Line 309)
**File:** `src/modal.ts:309`
**Issue:** `triedAmazon` is declared as `const` but set to `false` and never reassigned, meaning Amazon fallback never triggers.
```typescript
const triedAmazon = false;  // Should be let triedAmazon = false;
```
**Severity:** High - Amazon cover fallback is broken

### 3. Version Mismatch
**Files:** `package.json` vs `manifest.json`
**Issue:** package.json shows version `3.3.2` while manifest.json shows `3.4.4`. These should be synchronized.
**Severity:** Medium - Can cause confusion during releases

### 4. Hardcoded Version in main.ts (Line 12)
**File:** `src/main.ts:12`
**Issue:** Version is hardcoded as `v0.1.0` in the log message while actual version is `3.4.4`.
```typescript
console.log("[KB Plugin] Loading KB Kinderboeken plugin v0.1.0");
```
**Severity:** Low - Confusing log messages

---

## Security Concerns

### 1. Arbitrary Code Execution in Template Engine
**File:** `src/template/engine.ts:320`
**Issue:** The inline script processing uses `new Function()` which can execute arbitrary code.
```typescript
const fn = new Function(...Object.keys(data), `return ${script};`);
```
**Risk:** If a user's template contains malicious code or if metadata is compromised, arbitrary code could be executed.
**Recommendation:** Consider sandboxing or limiting the scripting capabilities, or clearly document the security implications.

### 2. No Input Sanitization for CQL Queries
**File:** `src/api.ts:427-428`
**Issue:** The `escapeCql` function only escapes double quotes but doesn't prevent CQL injection.
```typescript
private escapeCql(value: string): string {
  return value.replace(/"/g, '\\"');
}
```
**Recommendation:** Implement more comprehensive CQL escaping.

---

## Code Quality Issues

### 1. Unused Import: axios
**File:** `package.json:37`
**Issue:** `axios` is listed as a dependency but the codebase uses Obsidian's `requestUrl` instead.
```json
"axios": "^1.13.2",
```
**Recommendation:** Remove unused dependency to reduce bundle size.

### 2. No Test Files Present
**Issue:** Despite having Vitest configured, there are no actual test files in the codebase.
**Location:** No `tests/` directory or `*.test.ts` files exist.
**Recommendation:** Add unit tests for critical components:
- Template engine
- API response parsing
- Query building

### 3. Excessive Console Logging
**Files:** Multiple files throughout the codebase
**Issue:** Many `console.log` statements that should be removed or made conditional in production.
**Recommendation:** Implement a logging utility with configurable log levels.

### 4. Type Safety Issues
**File:** `src/modal.ts:79`
**Issue:** Using `any` type for searchInput.
```typescript
let searchInput: any;
```
**Recommendation:** Use proper Obsidian types (`TextComponent`).

### 5. Magic Numbers
**File:** `src/api.ts:33`
```typescript
private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
```
**Issue:** Cache TTL and other magic numbers should be configurable settings.

---

## Performance Issues

### 1. Sequential API Enrichment
**File:** `src/modal.ts:155-168`
**Issue:** Bol.com enrichment happens for all results sequentially with `Promise.all`, but each enrichment can make multiple HTTP requests.
```typescript
const enrichedResults = await Promise.all(
  this.results.map(async (book) => {
    return await this.apiClient.enrichFromBol(book);
  })
);
```
**Recommendation:** Consider rate limiting or batching to prevent overwhelming external APIs.

### 2. Cover Fallback Chain Inefficiency
**File:** `src/modal.ts:298-407`
**Issue:** The cover fallback logic creates new image elements for each attempt, which is inefficient.
**Recommendation:** Check URL validity before creating DOM elements.

### 3. No Debouncing on Search
**File:** `src/modal.ts:106-108`
**Issue:** Comment says "Debounce is handled by the search button" but there's no actual debouncing.
```typescript
.onChange(() => {
  // Debounce is handled by the search button
});
```
**Recommendation:** Add proper debouncing for auto-search functionality.

---

## Missing Error Handling

### 1. No Error Boundary in Template Processing
**File:** `src/template/engine.ts:17-32`
**Issue:** If template processing fails partially, users get incomplete results without clear error messages.
**Recommendation:** Add try-catch blocks around each processing step with meaningful error messages.

### 2. Missing Null Checks
**File:** `src/api.ts:598-606`
**Issue:** `extractField` doesn't handle all edge cases for nested XML structures.
```typescript
private extractField(dc: any, fieldName: string): string | undefined {
  const field = dc[fieldName];
  if (!field) return undefined;
  // Missing check for nested structures
}
```

---

## Architectural Improvements

### 1. Service Dependencies
**Issue:** Services are instantiated with concrete dependencies rather than interfaces, making testing difficult.
**Recommendation:** Use dependency injection with interfaces.

### 2. Duplicate Code
**Files:** `src/modal.ts` and `src/services/CoverDownloadService.ts`
**Issue:** Cover fallback logic is duplicated between modal display and download service.
**Recommendation:** Consolidate into a single cover resolution service.

### 3. Mixed Responsibilities
**File:** `src/api.ts`
**Issue:** KBApiClient handles too many responsibilities:
- HTTP requests
- XML parsing
- Caching
- Cover downloads
- Bol.com scraping
- Wikidata enrichment
**Recommendation:** Split into separate service classes.

---

## Documentation Gaps

### 1. Missing JSDoc Comments
**Issue:** Many public methods lack JSDoc documentation.
**Example:** `src/modal.ts:148` - `searchByQuery` has no documentation.

### 2. No API Error Codes Documentation
**Issue:** Error handling returns generic messages without documenting possible error states.

---

## Recommendations Summary

### High Priority
1. Fix the import path in `CoverDownloadService.ts`
2. Fix the `triedAmazon` const bug in `modal.ts`
3. Synchronize version numbers
4. Remove unused `axios` dependency

### Medium Priority
1. Add unit tests for template engine and API parsing
2. Implement proper logging utility
3. Add input validation for CQL queries
4. Fix type annotations (remove `any`)

### Low Priority
1. Add JSDoc comments
2. Implement rate limiting for external API calls
3. Split KBApiClient into smaller services
4. Add configurable cache TTL
5. Update hardcoded version strings

---

## Action Items

- [ ] Fix critical import path issue
- [ ] Fix Amazon cover fallback bug
- [ ] Synchronize versions
- [ ] Remove unused dependencies
- [ ] Add basic test suite
- [ ] Document security considerations for template scripts
