---
name: feedback_no_commit_push
description: STRONG rule — never auto-commit or push, always wait for explicit instruction
metadata:
  type: feedback
---

Never commit or push unless the user explicitly says "commit", "push", or equivalent. This applies even after making code changes — just report what changed and stop. The user has flagged this multiple times and is frustrated by proactive commits.

**Why:** User wants full control over when changes are committed. Auto-committing (even after being asked to fix something) feels like overstepping.

**How to apply:** After making code changes, describe what you did and wait. Do not stage, commit, or push unless the user explicitly asks. "Commit and push" or "commit" in the same message as a task is NOT permission to commit future tasks automatically.
