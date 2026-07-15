#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Renaming jext -> yexp across entire codebase..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Replace in file contents (all case variations)
echo "${BLUE}Step 1: Replacing content in files...${NC}"

# Find all text files (excluding node_modules, .git, dist, build, etc.)
find . -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/bun.lock" \
  -not -path "*/.turbo/*" \
  -not -path "*/rename-jext-to-yexp.sh" \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
  -o -name "*.json" -o -name "*.md" -o -name "*.mdx" \
  -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" \
  -o -name "*.config.*" -o -name ".*rc" -o -name "*.lock" \) \
  -print0 | while IFS= read -r -d '' file; do

  # Check if file contains any variant of jext
  if grep -qi "jext" "$file" 2>/dev/null; then
    echo "  📝 $file"

    # Use sed with backup, then remove backup
    # Handle all case variations:
    # - @jext/ -> @yexp/
    # - jext (lowercase) -> yexp
    # - Jext (PascalCase) -> Yexp
    # - JEXT (uppercase) -> YEXP
    sed -i.bak \
      -e 's/@jext\//@yexp\//g' \
      -e 's/@jext"/@yexp"/g' \
      -e 's/jext-editor/yexp-editor/g' \
      -e 's/JEXT/YEXP/g' \
      -e 's/Jext/Yexp/g' \
      -e 's/jext/yexp/g' \
      "$file"

    rm "${file}.bak"
  fi
done

echo ""
echo "${BLUE}Step 2: Renaming files and directories...${NC}"

# Step 2: Rename files (from deepest to shallowest to avoid path issues)
find . -depth \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/.turbo/*" \
  -not -name "rename-jext-to-yexp.sh" \
  \( -name "*jext*" -o -name "*Jext*" -o -name "*JEXT*" \) \
  -print0 | while IFS= read -r -d '' path; do

  dir=$(dirname "$path")
  base=$(basename "$path")

  # Replace all case variations in filename
  newbase="${base//jext/yexp}"
  newbase="${newbase//Jext/Yexp}"
  newbase="${newbase//JEXT/YEXP}"

  if [ "$base" != "$newbase" ]; then
    newpath="$dir/$newbase"
    echo "  📦 $path -> $newpath"
    mv "$path" "$newpath"
  fi
done

echo ""
echo "${GREEN}✅ Rename complete!${NC}"
echo ""
echo "Summary of changes:"
echo "  • jext -> yexp (lowercase)"
echo "  • Jext -> Yexp (PascalCase)"
echo "  • JEXT -> YEXP (UPPERCASE)"
echo "  • @jext -> @yexp (npm scopes)"
echo "  • File and directory names updated"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test the build: bun run build"
echo "  3. Run tests: bun run test"
echo "  4. Commit: git add -A && git commit -m 'refactor: rename jext to yexp'"
