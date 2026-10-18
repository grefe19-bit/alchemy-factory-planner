# Alchemy Factory Planner

A static, GitHub Pages-friendly planning interface built around the user-provided Alchemy Factory Calculator dataset.

## Features

- Browse the item and recipe database.
- Estimate recipe output rates and machine counts with all displayed rates expressed per minute.
- Show input requirements for a target rate and recipe co-products.
- Record an editable draft of skill-point allocations.
- Run structural database checks.

## Data provenance and assumptions

The checked-in `data/alchemy_db.json` is the supplied calculator dataset (metadata in the file: version 59, date 2026-10-17, game version 1.1.5024). The app does not substitute other game-data sources.

**Rate assumption:** the planner interprets each recipe's `baseTime` as seconds and estimates per-minute output as `output quantity × 60 / baseTime`. Confirm that time unit and any applicable modifiers against the calculator before treating a plan as final. Skill allocation fields are editable but intentionally do not affect the calculation until verified skill formulas are available. Fuel, fertilizer, belt, machine, heat, nutrient, charge, and special-output effects are not comprehensively modeled yet.

Structural validation verifies references and duplicate recipe IDs. It does not prove the dataset matches every current in-game value.

## Run locally

Serve this directory over HTTP (browsers generally block `fetch()` from a `file://` page), for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Validate the dataset

Requires Node.js:

```bash
node tests/validate-data.js
```

## Deploy with GitHub Pages

In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. The workflow file is included as a lightweight alternative for automated Pages deployment if GitHub Pages is configured to use GitHub Actions.

## Planned next steps

1. Validate cycle-time units and production modifiers against the approved calculator source.
2. Implement the dependency-chain/material-flow solver.
3. Add verified skill tree definitions and formula-based effects.
4. Add persistent plan save/load and factory layout visualization.
