#!/bin/bash

# Usage: ./push-version.sh "1.6.3" "feat: add smart query expansion"

VERSION=$1
MESSAGE=$2
PLUGIN_PATH="/home/winston/pkm/main/.obsidian/plugins/obs-kb-kinderboeken"

if [ -z "$VERSION" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./push-version.sh <version> <message>"
  echo "Example: ./push-version.sh 1.6.3 'feat: add smart query expansion'"
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

# 4. Summary
echo "🎉 Done! Version $VERSION pushed"
echo ""
echo "Files updated in: $PLUGIN_PATH"
echo "  ✓ manifest.json"
echo "  ✓ main.js"
echo "  ✓ styles.css"
echo ""
echo "Git log:"
git log --oneline -1
echo ""
echo "Git tags:"
git tag --sort=-version:refname | head -5
