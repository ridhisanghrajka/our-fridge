#!/bin/bash

set -e

echo "Running post-install: Fixing Xcode project objectVersion..."

# Fix objectVersion from 70 to 63 for compatibility
sed -i '' 's/objectVersion = 70;/objectVersion = 63;/g' ios/OurFridge.xcodeproj/project.pbxproj || \
  sed -i 's/objectVersion = 70;/objectVersion = 63;/g' ios/OurFridge.xcodeproj/project.pbxproj

echo "✅ Fixed Xcode objectVersion to 63"
