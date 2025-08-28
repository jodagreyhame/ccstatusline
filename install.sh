#!/bin/bash
# Claude Statusline - Installation Script

set -e

echo "🚀 Installing Claude Statusline..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. Install ccstatusline dependencies
echo -e "${YELLOW}Installing ccstatusline dependencies...${NC}"
cd "$SCRIPT_DIR/ccstatusline"
npm install --legacy-peer-deps --production 2>/dev/null || npm install --legacy-peer-deps

# 2. Install tsx globally if not present
if ! command -v tsx &> /dev/null; then
    echo -e "${YELLOW}Installing tsx (TypeScript executor)...${NC}"
    npm install -g tsx
fi

# 3. Create config directory
echo -e "${YELLOW}Setting up configuration...${NC}"
mkdir -p ~/.config/ccstatusline

# 4. Copy configuration
cp "$SCRIPT_DIR/config/settings.json" ~/.config/ccstatusline/

# 5. Update the statusline script path
echo -e "${YELLOW}Updating statusline script...${NC}"
sed "s|CCSTATUSLINE_DIR=.*|CCSTATUSLINE_DIR=\"$SCRIPT_DIR/ccstatusline\"|g" "$SCRIPT_DIR/scripts/statusline.sh" > "$SCRIPT_DIR/scripts/statusline-configured.sh"
chmod +x "$SCRIPT_DIR/scripts/statusline-configured.sh"

# 6. Backup existing statusline if it exists
if [ -f ~/.claude/statusline-script.sh ]; then
    echo -e "${YELLOW}Backing up existing statusline...${NC}"
    cp ~/.claude/statusline-script.sh ~/.claude/statusline-script.backup-$(date +%Y%m%d-%H%M%S).sh
fi

# 7. Install the new statusline
echo -e "${YELLOW}Installing new statusline...${NC}"
mkdir -p ~/.claude
cp "$SCRIPT_DIR/scripts/statusline-configured.sh" ~/.claude/statusline-script.sh

# 8. Clean up any old ccusage processes
echo -e "${YELLOW}Cleaning up old processes...${NC}"
pkill -f ccusage 2>/dev/null || true

# 9. Clear old cache files
echo -e "${YELLOW}Clearing old cache files...${NC}"
rm -f /tmp/ccusage_*.json 2>/dev/null || true
rm -f /tmp/statusline-errors.log 2>/dev/null || true
rm -f /tmp/claude_*.timestamp 2>/dev/null || true
rm -f /tmp/claude_*.time 2>/dev/null || true

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo "The statusline will update automatically in Claude Code."
echo "Configuration: ~/.config/ccstatusline/settings.json"
echo ""
echo "Test command:"
echo "  echo '{\"model\":{\"display_name\":\"Test\"}}' | ~/.claude/statusline-script.sh"