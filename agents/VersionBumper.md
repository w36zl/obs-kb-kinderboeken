# Agent: VersionBumper

## Purpose
Update version numbers in manifest.json and package.json, and add entry to CHANGELOG.md.

## Input Parameter
- `new_version`: Version string (e.g., "3.3.3")

## Commands
```bash
# Update manifest.json
jq ".version = \"$new_version\"" manifest.json | sponge manifest.json

# Update package.json
jq ".version = \"$new_version\"" package.json | sponge package.json

# Add CHANGELOG entry
echo "## v$new_version - $(date +"%Y-%m-%d")" >> CHANGELOG.md
echo "- Automated release" >> CHANGELOG.md
echo "" >> CHANGELOG.md
```

## Files Modified
- ✅ manifest.json
- ✅ package.json
- ✅ CHANGELOG.md (created if doesn't exist)

## Output
"✅ Version updated to v<new_version>"

## Failure Conditions
- ❌ jq not installed
- ❌ manifest.json not found or invalid JSON
- ❌ package.json not found or invalid JSON
- ❌ Cannot write to CHANGELOG.md

## On Failure
Report which file couldn't be updated and why.
Stop the release workflow immediately.
