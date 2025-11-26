# Agent: GitPublisher

## Purpose
Commit all changes, push to GitHub, create version tag, and publish GitHub release.

## Input Parameter
- `new_version`: Version string (e.g., "3.3.3")

## Commands (Sequential)

### 1. Stage Files
```bash
git add manifest.json
git add package.json
git add CHANGELOG.md
git add src/
git add main.js
git add styles.css
```

### 2. Commit
```bash
git commit -m "release: v$new_version"
```

### 3. Push to GitHub
```bash
git push origin master
```

### 4. Create and Push Tag
```bash
git tag "v$new_version"
git push origin "v$new_version"
```

### 5. Create GitHub Release
```bash
gh release create "v$new_version" \
  --title "v$new_version" \
  --notes "Release v$new_version" \
  manifest.json main.js styles.css
```

## Output
"✅ Published v<new_version> to GitHub"

## Failure Conditions
- ❌ git commit fails
- ❌ git push fails
- ❌ git tag fails
- ❌ GitHub CLI (gh) not installed
- ❌ Not authenticated with GitHub
- ❌ Cannot create GitHub release

## On Failure
Report which step failed and the error.
Don't attempt subsequent steps.

## Safety Notes
- ✅ Only runs AFTER all prior checks pass
- ✅ Commits and pushes the version update
- ✅ Creates version tag
- ✅ Publishes release with artifacts to GitHub
- ✅ Mobile clients will sync via BRAT

## GitHub Configuration
Requires `gh` CLI installed and authenticated:
```bash
gh auth login
```
