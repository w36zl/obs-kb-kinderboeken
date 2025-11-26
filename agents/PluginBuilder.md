# Agent: PluginBuilder

## Purpose
Build the plugin using npm and copy built artifacts to the local Obsidian plugin folder for immediate testing.

## Commands (Sequential)
```bash
npm run build                          # Build with tsup

# Verify build succeeded
test -f main.js || exit 1

# Copy built files to local Obsidian plugin folder
cp manifest.json "/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/"
cp main.js "/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/"
cp styles.css "/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken/"
```

## Files Copied (Not Copied)
**Copied to plugin folder**:
- ✅ manifest.json
- ✅ main.js
- ✅ styles.css

**Not copied** (keeps folder clean):
- ❌ Source files (src/)
- ❌ main.js.map
- ❌ main.d.ts
- ❌ Configuration files
- ❌ Test files

## Output
"✅ Build successful. Files copied to Obsidian plugin folder."

## Failure Conditions
- ❌ npm run build fails
- ❌ main.js not generated
- ❌ Cannot copy to plugin folder
- ❌ Plugin folder doesn't exist

## On Failure
Report the specific build or copy error.
Stop the release workflow immediately.

## Post-Build
Obsidian auto-reloads the plugin when files are updated in the plugin folder.
