# Development Workflow

## Quick Setup

This project uses a clean local testing workflow.

## Building

```bash
npm run build
```

Generates `main.js` and `main.js.map`.

## Testing Locally

Built plugin is automatically loaded from:
```
/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/
```

Just rebuild and reload Obsidian to test changes.

## Pushing Changes (Committing + Deploying to Plugin Folder)

Use the `push-version.sh` script to:
1. Commit changes to git
2. Tag with version number
3. Copy files to plugin folder

### Usage

```bash
./push-version.sh <version> <message>
```

### Examples

```bash
# Simple feature
./push-version.sh 1.6.3 "feat: add smart query expansion"

# Bug fix
./push-version.sh 1.6.3 "fix: improve author name matching"

# Improvement
./push-version.sh 1.6.3 "perf: optimize search caching"
```

### What It Does

1. ✅ Stages all changes
2. ✅ Creates git commit with your message
3. ✅ Tags commit as `v<version>`
4. ✅ Copies 3 files to plugin folder:
   - `manifest.json`
   - `main.js`
   - `styles.css`
5. ✅ Shows summary of changes

## Workflow Example

```bash
# 1. Make changes to src/api.ts
nano src/api.ts

# 2. Build
npm run build

# 3. Test in Obsidian (should auto-reload)
# ... test the feature ...

# 4. When satisfied, push
./push-version.sh 1.6.3 "feat: add query expansion"

# 5. Check git log
git log --oneline -5
```

## Files Copied to Plugin Folder

Only these 3 files are copied (keeps folder clean):
- `manifest.json` - version & metadata
- `main.js` - compiled plugin code
- `styles.css` - plugin styles

**NOT copied** (to keep folder clean):
- Source files (`src/`)
- Configuration files
- Test files
- `main.js.map` (source map)
- `main.d.ts` (type definitions)

## Git History

All commits and tags stay in the local git repo:
```bash
git log --oneline          # See all commits
git tag                    # See all versions
git show v1.6.3            # See what changed in v1.6.3
```

## Manual Steps (if needed)

If you prefer manual control:

```bash
# 1. Build
npm run build

# 2. Commit
git add -A
git commit -m "feat: your message"

# 3. Tag
git tag v1.6.3

# 4. Copy to plugin folder
cp manifest.json /home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/
cp main.js /home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/
cp styles.css /home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/
```

## Troubleshooting

**"Tag already exists"**
- Version number is already used
- Use a new version number (e.g., 1.6.4 instead of 1.6.3)

**Files not copied**
- Check that `/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/` exists
- Check file permissions

**Plugin not reloading in Obsidian**
- Manually reload: Settings → Community Plugins → Disable/Enable
- Or restart Obsidian

## Version Numbering

Format: `MAJOR.MINOR.PATCH`

- `MAJOR`: Major feature or breaking change
- `MINOR`: New feature or improvement
- `PATCH`: Bug fix

Example progression:
- v1.6.0 - Advanced search feature
- v1.6.1 - Bug fix
- v1.6.2 - Another feature
- v1.7.0 - Next major feature
