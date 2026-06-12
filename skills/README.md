# Skills

The Chip system uses 130+ skills from the [mattpocock/skills](https://github.com/mattpocock/skills) repository and other sources.

## Installing Skills

### One-command setup (Unix):
```bash
ALL_PROXY=socks5://127.0.0.1:7897 git clone --depth 1 \
  https://github.com/mattpocock/skills.git /tmp/skills && \
  cp -r /tmp/skills/skills/* ~/.claude/skills/
```

Or use the Chip installer (recommended):
```bash
# Run the setup script after installing Chip
bash scripts/setup.sh
```

## Skill Categories

- **engineering/** - TDD, debugging, architecture, code review, etc.
- **productivity/** - Handoff, note-taking, workflow management
- **root** - Individual technology skills (I2C, SPI, UART, FreeRTOS, etc.)
- **misc/** - Miscellaneous utilities

## Custom Skills

Chip-specific skills are bundled in the workflows/ directory as workflow scripts,
not as SKILL.md files. These include:
- requirements-alignment
- safety-layer
- agent-orchestration
- memory-layer
- tool-layer
- ops-layer
