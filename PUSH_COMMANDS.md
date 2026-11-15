# PUSH_COMMANDS.md — GitHub is NOT logged in here

`gh auth status` on 2026-11-15: "You are not logged into any GitHub hosts."
No repo was created and nothing was pushed. The local git repo is ready.

## What Hadi needs to do (once, ~2 minutes)

```bash
cd ~/workspace/orbitmafia2.0
gh auth login
gh repo create Hadikashif456/orbitmafia2.0 --public --source=. --remote=origin --push
```

Or, if the repo is created on github.com first:

```bash
cd ~/workspace/orbitmafia2.0
git remote add origin https://github.com/Hadikashif456/orbitmafia2.0.git
git branch -M main
git push -u origin main
```

## Current local state

- Git repo initialised, everything committed on branch `main`.
- No remote configured yet (nothing to push to until the repo exists).
- Do NOT push the `backend/.venv/` folder or `frontend/node_modules/` — both are in `.gitignore`.
- The committed `data/orbit_mafia.db` IS meant to be pushed (the app needs it).
