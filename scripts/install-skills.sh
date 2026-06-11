#!/usr/bin/env bash
# Chip System — Skills Installer
# Downloads skills from upstream repositories
# Usage: bash scripts/install-skills.sh

set -e

SKILLS_DIR="${1:-$HOME/.claude/skills}"
mkdir -p "$SKILLS_DIR"

echo "========================================"
echo "  Installing Skills"
echo "  Target: $SKILLS_DIR"
echo "========================================"
echo ""

# Main skills repository (mattpocock/skills)
if [ ! -d "/tmp/skills" ]; then
  echo "  [download] Cloning mattpocock/skills..."
  git clone --depth 1 https://github.com/mattpocock/skills.git /tmp/skills
else
  echo "  [download] Updating existing clone..."
  cd /tmp/skills && git pull --ff-only
fi

echo "  [install] Copying skills..."
cp -r /tmp/skills/skills/* "$SKILLS_DIR/"

echo ""
echo "  Skills installed: $(ls -d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l) packages"
echo "========================================"
echo ""
