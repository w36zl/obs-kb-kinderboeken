# Release Agents Setup - Complete Integration

## Overview

Your Obsidian KB Kinderboeken plugin now has a **complete release automation system** with 1 parent agent and 6 specialized sub-agents. This replaces the manual `push-version.sh` script with a comprehensive, safety-first release workflow.

## Architecture

```
ReleaseManager (Parent)
├── RepoInspector (validates repository)
├── RunNpmChecks (validates code quality)
├── RunSmokeTests (validates API connectivity)
├── VersionBumper (updates version numbers)
├── PluginBuilder (builds and deploys locally)
└── GitPublisher (publishes to GitHub)
```

## File Locations

### Agent Definitions (Claude Code Configuration)
Located in `.claude/agents/`:
- `release-manager.md` — Orchestration logic (already existed)
- `repo-inspector.md` — Repository validation
- `run-npm-checks.md` — Code quality checks
- `run-smoke-tests.md` — API connectivity tests
- `version-bumper.md` — Version updates
- `plugin-builder.md` — Build and local deployment
- `git-publisher.md` — GitHub publishing

### Agent Specifications (Documentation)
Located in `agents/`:
- `ReleaseManager.md` — Full workflow specification
- `RepoInspector.md` — Repo validation spec
- `RunNpmChecks.md` — npm checks spec
- `RunSmokeTests.md` — Smoke test spec
- `VersionBumper.md` — Version bump spec
- `PluginBuilder.md` — Build spec
- `GitPublisher.md` — Publishing spec
- `workflow_diagram.md` — Visual workflow

### Test Files
Located in `tests/`:
- `smoke.test.ts` — Basic API connectivity and parsing tests

## How to Use

### Option 1: Via Claude Code Task System

In Claude Code, you can invoke the release workflow by asking:

```
I'm ready to release version 3.3.3
```

Claude will:
1. Use the release-manager agent to orchestrate
2. Call each sub-agent in sequence
3. Stop immediately on any failure
4. Report progress at each step

### Option 2: Manual Step-by-Step

You can also invoke individual agents via the Task tool. For example:

```
Launch RepoInspector to validate repository state
Launch RunNpmChecks to run lint and tests
```

## Release Workflow (Step-by-Step)

### Before Release
```bash
# Make your changes and commit locally
git add .
git commit -m "fix: [description]"
```

### Trigger Release
Ask Claude Code:
```
I'm ready to release version X.Y.Z
```

### What Happens Automatically

**Step 1: RepoInspector**
- Checks you're on master branch
- Verifies no unexpected uncommitted changes
- Validates git repository is accessible

**Step 2: RunNpmChecks**
- Runs `npm install`
- Runs `npm run lint`
- Runs `npm test`
- Stops if any check fails

**Step 3: RunSmokeTests**
- Tests KB API connectivity
- Verifies XML parsing works
- Ensures basic search functionality works
- Stops if tests fail

**Step 4: VersionBumper**
- Updates `manifest.json` version
- Updates `package.json` version
- Adds entry to `CHANGELOG.md`

**Step 5: PluginBuilder**
- Runs `npm run build`
- Verifies `main.js` was created
- Copies files to: `/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/`
- Obsidian auto-reloads the plugin

**Step 6: GitPublisher**
- Commits version bump changes
- Pushes to master branch
- Creates git tag `v{version}`
- Creates GitHub release with artifacts

### After Release

- Plugin is live on GitHub
- Mobile users can sync via BRAT plugin
- Local Obsidian vault has new version

## Safety Features

✅ **Sequential Execution**: Steps run in strict order
✅ **Fail Fast**: Stops immediately on any error
✅ **Comprehensive Validation**: Code quality, API connectivity, git state all checked
✅ **No Manual File Touching**: All operations delegated to specialized agents
✅ **Atomic Commits**: Single commit per release
✅ **Version Control**: Full git history and tags preserved

## Important Notes

### Smoke Tests
The new smoke test suite (`tests/smoke.test.ts`) performs basic connectivity tests:
- Verifies KB API endpoint responds
- Tests XML parsing
- Confirms book search works

Run manually if needed:
```bash
npm test -- tests/smoke.test.ts
```

### Requirements for Publishing
- `gh` CLI must be installed (`brew install gh` or similar)
- Must be authenticated: `gh auth login`
- Must have push access to the repository

### Version Format
Use semantic versioning: `X.Y.Z` (e.g., `3.3.3`)
Pre-release versions also work: `3.3.3-beta.1`

### Plugin Deployment Path
Files are copied to:
```
/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/
```

If this path changes, update:
- `.claude/agents/plugin-builder.md`
- `agents/PluginBuilder.md`

## Troubleshooting

### "Repository not on master branch"
```bash
git checkout master
git pull origin master
```

### "Uncommitted changes detected"
```bash
git status  # See what's changed
git commit -m "your message"  # Commit them
```

### "npm tests fail"
```bash
npm test  # Run tests locally
npm run lint  # Check linting
# Fix errors, then retry release
```

### "KB API unreachable"
- Check your network connection
- Verify KB API status (https://jsru.kb.nl/)
- May be temporary; can retry

### "GitHub push fails"
- Verify `gh auth login` is authenticated
- Check: `gh auth status`
- Verify push access to repository

## Migration from push-version.sh

The new release system replaces `push-version.sh` with:

| Feature | push-version.sh | Release Agents |
|---------|-----------------|-----------------|
| Code quality checks | ❌ No | ✅ Yes (lint + test) |
| API validation | ❌ No | ✅ Yes (smoke tests) |
| Fail-safe | ❌ Manual | ✅ Automatic halt on error |
| Git validation | ❌ No | ✅ Yes (branch, status) |
| Version file updates | ❌ Manual | ✅ Automatic |
| CHANGELOG update | ❌ No | ✅ Yes (automatic) |
| Local deployment | ✅ Yes | ✅ Yes |
| GitHub publish | ✅ Optional | ✅ Always |

You can keep `push-version.sh` for reference or remove it once you're comfortable with the new system.

## Next Steps

1. **Try a test release**: Ask Claude Code to perform a release (can use any version number)
2. **Monitor the workflow**: Watch each step execute
3. **Verify the result**: Check that files were updated correctly
4. **Confirm GitHub**: Visit the releases page to verify

## Command Reference

All of these are handled by the agents automatically, but useful to know:

```bash
# Build locally
npm run build

# Run tests
npm test

# Run smoke tests
npm test -- tests/smoke.test.ts

# Run linting
npm run lint

# Check git status
git status

# View git log
git log --oneline -5

# View tags
git tag --sort=-version:refname | head -5
```

---

**Last Updated**: November 21, 2024
**Release Agent Version**: 1.0
**Status**: ✅ Ready for use
