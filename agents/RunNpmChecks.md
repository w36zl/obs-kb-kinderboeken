# Agent: RunNpmChecks

## Purpose
Run all dependency, linting, and unit test checks to ensure code quality before building.

## Commands (Sequential)
```bash
npm install              # Install/update dependencies
npm run lint            # Run ESLint checks
npm test                # Run Vitest unit tests
```

## Output
On success: "✅ NPM checks passed."

## Failure Conditions
- ❌ npm install fails
- ❌ eslint finds errors
- ❌ vitest unit tests fail

## On Failure
Report which step failed and show the error output.
Stop the release workflow immediately.
