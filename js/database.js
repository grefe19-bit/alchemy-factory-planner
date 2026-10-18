/* Data access and structural validation for the user-provided calculator dataset. */
(function () {
  "use strict";
  const DB_URL = "./data/alchemy_db.json";
  async function loadDatabase() {
    const response = await fetch(DB_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load database (" + response.status + ").");
    const db = await response.json();
    const issues = [];
    if (!db || typeof db !== "object") throw new Error("Database root is not an object.");
    for (const key of ["items", "machines", "recipes", "settings"]) {
      if (!db[key]) issues.push("Missing top-level section: " + key);
    }
    const machineNames = new Set(Object.keys(db.machines || {}));
    const itemNames = new Set(Object.keys(db.items || {}));
    const recipeIds = new Set();
    let duplicateRecipeIds = 0, missingMachines = 0, missingItemRefs = 0;
    for (const recipe of db.recipes || []) {
      if (recipeIds.has(recipe.id)) duplicateRecipeIds++;
      recipeIds.add(recipe.id);
      if (!machineNames.has(recipe.machine)) missingMachines++;
      for (const field of ["inputs", "outputs", "buildCost"]) {
        const refs = recipe[field];
        if (refs && typeof refs === "object" && !Array.isArray(refs)) {
          for (const name of Object.keys(refs)) if (!itemNames.has(name)) missingItemRefs++;
        } else if (field === "buildCost" && typeof refs === "string" && !itemNames.has(refs)) {
          missingItemRefs++;
        }
      }
    }
    return {
      db,
      report: {
        itemCount: itemNames.size,
        machineCount: machineNames.size,
        recipeCount: (db.recipes || []).length,
        duplicateRecipeIds,
        missingMachines,
        missingItemRefs,
        issues
      }
    };
  }
  window.AlchemyDatabase = { loadDatabase };
})();