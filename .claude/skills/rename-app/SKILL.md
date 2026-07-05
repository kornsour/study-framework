---
name: rename-app
description: Rebrand a fresh copy of this template to a new app name — updates package.json, layout title/metadata, README, and the local dev database name. Use right after copying the template to start a new project.
---

# Rename a fresh template copy

Run once, immediately after copying the template into a new directory, to give
the project its identity.

```bash
bash scripts/rename-app.sh <new-app-name>   # lowercase kebab-case, e.g. recipe-box
```

This updates:
- `package.json` `name`
- `src/app/layout.tsx` metadata title (default + template)
- the local dev database name in `.env` / `.env.example` (`<name>_dev`)

Then review the diff and finish setup:
```bash
git diff
pnpm bootstrap    # creates .env, secret, local DB, pushes schema
pnpm dev
```

Do a repo-wide search for any other literal "TypeScript Template" / "typescript-template"
strings (README prose, docs) and update them to taste — the script covers the
functional references, not every mention.

Next, provision external services with the `provision-app` skill.
