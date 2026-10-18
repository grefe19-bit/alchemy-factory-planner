/* Run with: node tests/validate-data.js */
const fs = require("node:fs");
const path = require("node:path");
const dbPath = path.join(__dirname, "..", "data", "alchemy_db.json");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const assert = require("node:assert/strict");
assert.equal(typeof db.version, "number", "version metadata exists");
assert.ok(db.items && typeof db.items === "object", "items map exists");
assert.ok(db.machines && typeof db.machines === "object", "machines map exists");
assert.ok(Array.isArray(db.recipes), "recipes array exists");
const items = new Set(Object.keys(db.items));
const machines = new Set(Object.keys(db.machines));
const recipeIds = new Set();
let errors = [];
for (const recipe of db.recipes) {
  if (recipeIds.has(recipe.id)) errors.push("duplicate recipe id: " + recipe.id);
  recipeIds.add(recipe.id);
  if (!machines.has(recipe.machine)) errors.push("missing machine: " + recipe.machine + " (" + recipe.id + ")");
  for (const field of ["inputs", "outputs", "buildCost"]) {
    const value = recipe[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const item of Object.keys(value)) if (!items.has(item)) errors.push("missing item: " + item + " (" + recipe.id + ")");
    } else if (field === "buildCost" && typeof value === "string" && !items.has(value)) {
      errors.push("missing build-cost item: " + value + " (" + recipe.id + ")");
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Structural checks passed:", items.size, "items,", machines.size, "machines,", db.recipes.length, "recipes. Game-value accuracy is not independently verified.");
