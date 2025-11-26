# Agent: RunSmokeTests

## Purpose
Run basic smoke tests to verify API connectivity and core functionality before release.

## Tests
The smoke test script (`tests/smoke.test.ts`) verifies:
- KB API endpoints are reachable
- XML parsing works correctly
- Book metadata can be fetched and parsed
- Cover images can be downloaded

## Command
```bash
npm run test -- tests/smoke.test.ts
```

## Output
On success: "✅ Smoke tests passed."

## Failure Conditions
- ❌ KB API unreachable
- ❌ XML parsing fails
- ❌ Cover download fails
- ❌ Core parsing logic fails

## On Failure
Report which test failed and the error details.
Stop the release workflow immediately.

## Notes
- This tests external APIs, so may timeout occasionally
- Runs basic connectivity checks only (not full integration)
