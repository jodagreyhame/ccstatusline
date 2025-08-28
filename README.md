# Claude Statusline 🚀

High-performance, customizable statusline for Claude Code with emoji indicators and real-time metrics.

## ✨ Features

- **Processing Timer**: Live tracking of Claude's response time
- **Compact Display**: Clean format with emojis, rounded numbers
- **Real-time Updates**: Instant token and cost tracking
- **Git Integration**: Shows current branch
- **Smart Folder Display**: Shows only folder name, not full path

## 📦 Quick Install

```bash
# Clone this repo
git clone [your-repo-url] claude-statusline-optimized
cd claude-statusline-optimized

# Run installer
chmod +x install.sh
./install.sh
```

## 📊 Statusline Format

```
✨9m32s 🤖Opus 4.1 ⏱️ 2h18m 🪙9M 💰$21 📅$44 🌿master 📁project
```

- `✨` Processing timer (current/last response time)
- `🤖` Model name
- `⏱️` Session duration
- `🪙` Token count
- `💰` Session cost
- `📅` Daily cost
- `🌿` Git branch
- `📁` Folder name

## 🔧 Configuration

Edit `~/.config/ccstatusline/settings.json` to customize the display order, emojis, and spacing.

## 🧪 Testing

```bash
# Test the statusline
echo '{"model":{"display_name":"Test"}}' | ~/.claude/statusline-script.sh
```

## 📝 License

MIT - Free to use and modify.