#!/usr/bin/env bash

set -e

echo "🔧 Running post-install: Fixing Xcode project objectVersion..."

# Fix objectVersion from 70 to 63 for compatibility
# Try macOS sed syntax first, then Linux sed syntax
if sed --version 2>&1 | grep -q GNU; then
  # Linux/GNU sed
  sed -i 's/objectVersion = 70;/objectVersion = 63;/g' ios/OurFridge.xcodeproj/project.pbxproj
else
  # macOS sed
  sed -i '' 's/objectVersion = 70;/objectVersion = 63;/g' ios/OurFridge.xcodeproj/project.pbxproj
fi

echo "✅ Fixed Xcode objectVersion to 63"

# Also verify the change was made
if grep -q "objectVersion = 63" ios/OurFridge.xcodeproj/project.pbxproj; then
  echo "✅ Verified: objectVersion is set to 63"
else
  echo "⚠️  Warning: Could not verify objectVersion change"
fi
