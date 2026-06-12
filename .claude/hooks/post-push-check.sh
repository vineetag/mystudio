#!/usr/bin/env bash
# Checks E2E test status on the current branch's PR after a git push.
# Runs as a Claude Code PostToolUse hook.

# Only act when the tool input was a git push command
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
if ! echo "$TOOL_INPUT" | grep -q "git push"; then
  exit 0
fi

GH="${HOME}/.local/bin/gh"
if ! command -v gh &>/dev/null && [ ! -x "$GH" ]; then
  echo "ℹ️  gh CLI not found — skipping PR test status check." >&2
  exit 0
fi
command -v gh &>/dev/null || alias gh="$GH"

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$BRANCH" ] || [ "$BRANCH" = "main" ]; then
  exit 0
fi

# Check if a PR exists for this branch targeting main
PR_JSON=$(gh pr view "$BRANCH" --json number,url,statusCheckRollup 2>/dev/null)
if [ -z "$PR_JSON" ]; then
  echo ""
  echo "  ℹ️  No PR found for branch '$BRANCH'."
  echo "  Run 'gh pr create' to open one and trigger E2E tests."
  echo ""
  exit 0
fi

PR_URL=$(echo "$PR_JSON" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
PR_NUMBER=$(echo "$PR_JSON" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)

# Find the E2E check named "Playwright E2E"
E2E_STATUS=$(echo "$PR_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
checks = data.get('statusCheckRollup', [])
for c in checks:
    name = c.get('name', '') or c.get('context', '')
    if 'playwright' in name.lower() or 'e2e' in name.lower():
        print(c.get('conclusion') or c.get('state') or 'PENDING')
        sys.exit(0)
print('NOT_FOUND')
" 2>/dev/null)

echo ""
case "$E2E_STATUS" in
  SUCCESS|success)
    echo "  ✅ E2E tests PASSED on PR #${PR_NUMBER}. Safe to merge."
    ;;
  FAILURE|failure|ERROR|error)
    echo "  ❌ E2E tests FAILED on PR #${PR_NUMBER}. Do NOT merge until fixed."
    echo "  Report: ${PR_URL}/checks"
    ;;
  PENDING|IN_PROGRESS|QUEUED|pending|in_progress|queued)
    echo "  ⏳ E2E tests RUNNING on PR #${PR_NUMBER}. Wait for results before merging."
    echo "  Watch: gh run watch"
    ;;
  NOT_FOUND)
    echo "  ℹ️  E2E check not yet found on PR #${PR_NUMBER}. Tests may still be queued."
    echo "  PR: ${PR_URL}"
    ;;
  *)
    echo "  ℹ️  E2E status: ${E2E_STATUS} on PR #${PR_NUMBER}."
    echo "  PR: ${PR_URL}"
    ;;
esac
echo ""
