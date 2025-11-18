#!/bin/bash

# Usage: ./push-version.sh "1.6.3" "feat: add smart query expansion" [--github]

VERSION=$1
MESSAGE=$2
PUSH_GITHUB=false
PLUGIN_PATH="/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken"

# Check for --github flag
if [ "$3" = "--github" ] || [ "$2" = "--github" ]; then
  PUSH_GITHUB=true
  # If --github is in position 2, shift message
  if [ "$2" = "--github" ]; then
    MESSAGE=$3
  fi
fi

if [ -z "$VERSION" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./push-version.sh <version> <message> [--github]"
  echo "Example: ./push-version.sh 1.6.3 'feat: add smart query expansion'"
  echo "         ./push-version.sh 1.6.3 'feat: add smart query expansion' --github"
  exit 1
fi

echo "📦 Pushing version $VERSION: $MESSAGE"
echo ""

# 1. Create git commit
echo "1️⃣  Creating git commit..."
git add -A
git commit -m "$MESSAGE" || { echo "❌ Commit failed"; exit 1; }
echo "✅ Committed"
echo ""

# 2. Create git tag
echo "2️⃣  Creating version tag v$VERSION..."
git tag "v$VERSION" || { echo "❌ Tag failed"; exit 1; }
echo "✅ Tagged as v$VERSION"
echo ""

# 3. Copy files to plugin folder
echo "3️⃣  Copying files to plugin folder..."
cp manifest.json "$PLUGIN_PATH/" || { echo "❌ Failed to copy manifest.json"; exit 1; }
cp main.js "$PLUGIN_PATH/" || { echo "❌ Failed to copy main.js"; exit 1; }
cp styles.css "$PLUGIN_PATH/" || { echo "❌ Failed to copy styles.css"; exit 1; }
echo "✅ Files copied"
echo ""

# 4. Push to GitHub (optional)
if [ "$PUSH_GITHUB" = true ]; then
  echo "4️⃣  Pushing to GitHub..."
  git push origin master || { echo "❌ Failed to push commits"; exit 1; }
  git push origin --tags || { echo "❌ Failed to push tags"; exit 1; }
  echo "✅ Pushed to GitHub"
  echo ""
fi

# 5. Summary
echo "🎉 Done! Version $VERSION deployed"
echo ""
echo "Files updated in: $PLUGIN_PATH"
echo "  ✓ manifest.json"
echo "  ✓ main.js"
echo "  ✓ styles.css"
echo ""
if [ "$PUSH_GITHUB" = true ]; then
  echo "GitHub sync: ✅ Pushed (mobile will sync via BRAT)"
else
  echo "GitHub sync: ⚠️  Local only (run with --github to sync mobile)"
fi
echo ""
echo "Git log:"
git log --oneline -1
echo ""
echo "Git tags:"
git tag --sort=-version:refname | head -5
