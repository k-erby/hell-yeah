#!/usr/bin/env bash
# Merges origin/main into $BRANCH and pushes. Used by .github/workflows/update-branch.yml.
# Writes a friendly summary to the Actions run page ($GITHUB_STEP_SUMMARY).
set -euo pipefail

SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
say() { printf '%s\n' "$@" >> "$SUMMARY"; }

if ! git check-ref-format --branch "$BRANCH" >/dev/null 2>&1; then
  say "## ❌ \"$BRANCH\" isn't a valid branch name" "Check the spelling and run it again."
  exit 1
fi
if [ "$BRANCH" = main ]; then
  say "## ❌ Pick your own branch, not main" "This copies main *into* your branch. Run it again with your branch name."
  exit 1
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch --quiet origin

# First run: make the branch.
if ! git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; then
  git push --quiet origin "origin/main:refs/heads/$BRANCH"
  say "## ✨ Made your branch \`$BRANCH\`" \
    "It's a copy of the live app. Pick it in the branch dropdown on GitHub before you edit."
  exit 0
fi

git checkout --quiet -B "$BRANCH" "origin/$BRANCH"

if git merge-base --is-ancestor origin/main HEAD; then
  say "## ✅ Already up to date" "\`$BRANCH\` already has everything from main. Nothing to do."
  exit 0
fi

changes=$(git log --no-merges --format='- %s' HEAD..origin/main)

if git merge --no-edit --quiet origin/main; then
  git push --quiet origin "$BRANCH"
  say "## ✅ \`$BRANCH\` is up to date" "" "Your edits are all still there. New from main:" "" "$changes"
else
  files=$(git diff --name-only --diff-filter=U | sed 's/^/- `/; s/$/`/')
  git merge --abort
  say "## ✋ Needs a human" "" \
    "Some of the same lines were changed on main *and* on \`$BRANCH\`, so the computer can't pick which to keep." \
    "" "**Nothing was changed.** Your branch is exactly as you left it." "" \
    "Files that clash:" "" "$files" "" "Send a link to this page to whoever helps you with the app."
  exit 1
fi
