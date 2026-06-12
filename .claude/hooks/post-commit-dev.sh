#!/usr/bin/env bash
# After git commit: start dev server for current app (skips if port 3000 already in use).

TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
echo "$TOOL_INPUT" | grep -q "git commit" || exit 0

# Detect app from CWD (e.g. .../apps/kids-stories/... → kids-stories)
CWD=$(pwd)
echo "$CWD" | grep -q '/apps/' || exit 0
APP_NAME=$(echo "$CWD" | sed 's|.*/apps/||' | cut -d'/' -f1)
[ -z "$APP_NAME" ] && exit 0

# Once per session: skip if port 3000 already bound
if lsof -ti:3000 >/dev/null 2>&1; then
  echo ""
  echo "  ℹ️  Dev server already running at http://localhost:3000"
  echo ""
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$REPO_ROOT" ] && exit 0

echo ""
echo "  🚀 Starting $APP_NAME dev server..."
(cd "$REPO_ROOT" && pnpm --filter "$APP_NAME" dev >>/tmp/claude-dev-server.log 2>&1) &
(sleep 5 && open "http://localhost:3000") &
echo "  🌐 Opening http://localhost:3000  (log: /tmp/claude-dev-server.log)"
echo ""
