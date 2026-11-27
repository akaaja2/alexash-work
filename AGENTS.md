# AGENTS.md

Read CLAUDE.md in this repo first; it holds the project conventions. The rules below are repeated here for agents that only read AGENTS.md (Factory Droid and others).

## Links

Book buy links and social channels live in one file: `claude-skills-landing/links/csfm-links.json` (published at https://claudeskills.co.uk/links/csfm-links.json). They are rendered into every site between `<!-- CSFM-LINKS:START ... -->` and `<!-- CSFM-LINKS:END -->` markers.

- Never hand-edit inside the `CSFM-LINKS` markers; the next sync overwrites it.
- To change a link: edit the JSON, then from `claude-skills-landing` run `node scripts/sync-links.mjs` (defaults to the sibling folders `../csfm-splash` and `../alexash-work`; pass paths if your clones live elsewhere). Commit the result in each repo.
- `node scripts/sync-links.mjs --check` exits non-zero if any block is out of date; CI runs it on every PR to claude-skills-landing.
- A `null` value in the JSON is skipped, never shown as a dead link.
