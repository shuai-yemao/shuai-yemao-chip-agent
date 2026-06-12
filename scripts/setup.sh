#!/usr/bin/env bash
# Chip System — Unix / macOS / Linux Setup Script
# Usage: bash scripts/setup.sh [target-dir]

set -e

TARGET="${1:-$HOME/.claude}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "  Chip System Setup"
echo "  Target: $TARGET"
echo "========================================"
echo ""

# Create target directory
mkdir -p "$TARGET"

# Backup existing config
if [ -f "$TARGET/CLAUDE.md" ]; then
  cp "$TARGET/CLAUDE.md" "$TARGET/CLAUDE.md.bak.$(date +%s)"
  echo "  [backup] Existing CLAUDE.md backed up"
fi

# Copy core files
echo "  [install] Core configuration..."
cp "$REPO_DIR/CLAUDE.md" "$TARGET/"
cp "$REPO_DIR/SOUL.md" "$TARGET/"
cp "$REPO_DIR/AGENTS.md" "$TARGET/"
cp "$REPO_DIR/USER.md" "$TARGET/"
cp "$REPO_DIR/config.json" "$TARGET/"

# Copy workflows
echo "  [install] Workflow engine..."
mkdir -p "$TARGET/workflows" "$TARGET/workflows/domains"
cp "$REPO_DIR/workflows/"*.js "$TARGET/workflows/" 2>/dev/null || true
cp "$REPO_DIR/domains/"*.js "$TARGET/workflows/domains/" 2>/dev/null || true

# Copy hooks
echo "  [install] Hooks system..."
mkdir -p "$TARGET/hooks"
cp "$REPO_DIR/hooks/session-start" "$TARGET/hooks/"
chmod +x "$TARGET/hooks/session-start"

# Copy proxy
echo "  [install] DeepSeek proxy..."
mkdir -p "$TARGET/bin"
cp "$REPO_DIR/bin/deepseek-proxy.js" "$TARGET/bin/" 2>/dev/null || true

# Memory directory
mkdir -p "$TARGET/projects"

echo ""
echo "========================================"
echo "  Chip System installed successfully!"
echo "========================================"
echo ""
echo "  Next steps:"
echo "  1. Install skills:    bash $REPO_DIR/scripts/install-skills.sh"
echo "  2. Set API key:       Edit $TARGET/settings.json"
echo "  3. Start Claude Code: claude"
echo ""
