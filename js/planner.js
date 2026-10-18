/* UI, recipe browsing, per-minute base-rate planner, and editable skill allocation. */
(function () {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  let db, report;
  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "—";
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const recipesFor = (item) => (db.recipes || []).filter(r => r.outputs && Object.prototype.hasOwnProperty.call(r.outputs, item));
  const outputQty = (recipe, item) => Number(recipe.outputs?.[item] || 0);
  const seconds = (recipe) => Number(recipe.baseTime || 0);
  const perMinute = (recipe, item) => seconds(recipe) > 0 ? outputQty(recipe, item) * 60 / seconds(recipe) : 0;

  function initTabs() {
    document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + btn.dataset.tab));
    }));
  }
  function initHeader() {
    $("#db-version").textContent = "v" + (db.version ?? "?") + " · " + (db.gameVersion || "game version n/a");
    $("#item-count").textContent = report.itemCount;
    $("#recipe-count").textContent = report.recipeCount;
  }
  function initPlanner() {
    const items = Object.keys(db.items || {}).sort((a,b)=>a.localeCompare(b));
    $("#target-item").innerHTML = items.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join("");
    const defaults = db.settings || {};
    const target = defaults.targetItem && db.items[defaults.targetItem] ? defaults.targetItem : (items.includes("Charcoal") ? "Charcoal" : items[0]);
    $("#target-item").value = target;
    $("#target-rate").value = Number(defaults.targetRate || 120);
    $("#target-item").addEventListener("change", populateRecipeOptions);
    $("#recipe-select").addEventListener("change", calculate);
    $("#target-rate").addEventListener("input", calculate);
    $("#calculate").addEventListener("click", calculate);
    populateRecipeOptions();
  }
  function populateRecipeOptions() {
    const target = $("#target-item").value;
    const recipes = recipesFor(target);
    $("#recipe-select").innerHTML = recipes.map((r,i)=>'<option value="'+i+'">'+esc(r.id)+' — '+esc(r.machine)+'</option>').join("");
    if (!recipes.length) $("#recipe-select").innerHTML = '<option value="">No recipe produces this item</option>';
    calculate();
  }
  function calculate() {
    const target = $("#target-item").value;
    const targetRate = Number($("#target-rate").value);
    const recipes = recipesFor(target);
    const recipe = recipes[Number($("#recipe-select").value)];
    const table = $("#inputs-table");
    $("#other-outputs").classList.add("hidden");
    if (!recipe || !Number.isFinite(targetRate) || targetRate <= 0) {
      $("#machine-count").innerHTML = '— <small>machines</small>';
      $("#result-summary").textContent = "Choose a recipe and enter a target rate greater than zero.";
      $("#rate-details").innerHTML = "";
      table.className = "table-wrap empty-state"; table.textContent = "No valid recipe/rate selected.";
      return;
    }
    const rate = perMinute(recipe, target);
    const count = rate > 0 ? targetRate / rate : 0;
    $("#machine-count").innerHTML = fmt(Math.ceil(count)) + ' <small>machines</small>';
    $("#result-summary").textContent = recipe.id + " on " + recipe.machine + " · " + fmt(rate) + " " + target + "/min per machine before modifiers.";
    $("#rate-details").innerHTML =
      '<div class="metric"><b>'+fmt(rate)+'</b><span>units / min / machine</span></div>'+
      '<div class="metric"><b>'+fmt(count)+'</b><span>theoretical machines</span></div>'+
      '<div class="metric"><b>'+fmt(Math.ceil(count)*rate)+'</b><span>whole-machine capacity / min</span></div>'+
      '<div class="metric"><b>'+fmt(seconds(recipe))+' s</b><span>base cycle time assumption</span></div>';
    const inputRows = Object.entries(recipe.inputs || {});
    if (!inputRows.length) {
      table.className = "table-wrap empty-state"; table.textContent = "This recipe has no listed material inputs.";
    } else {
      table.className = "table-wrap";
      table.innerHTML = '<table class="data-table"><thead><tr><th>INPUT ITEM</th><th>PER CYCLE</th><th>REQUIRED / MIN</th></tr></thead><tbody>'+
        inputRows.map(([name,qty])=>'<tr><td>'+esc(name)+'</td><td>'+fmt(qty)+'</td><td>'+fmt(Number(qty)*count*60/seconds(recipe))+'</td></tr>').join("")+
        '</tbody></table>';
    }
    const other = Object.entries(recipe.outputs || {}).filter(([name])=>name !== target);
    if (other.length) {
      $("#other-outputs").classList.remove("hidden");
      $("#other-outputs").textContent = "Co-products at this machine count: " + other.map(([name,qty])=>name+" "+fmt(Number(qty)*count*60/seconds(recipe))+"/min").join(" · ");
    }
  }
  function initRecipes() {
    const machines = Object.keys(db.machines || {}).sort((a,b)=>a.localeCompare(b));
    $("#machine-filter").innerHTML += machines.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join("");
    $("#recipe-search").addEventListener("input", renderRecipes);
    $("#machine-filter").addEventListener("change", renderRecipes);
    renderRecipes();
  }
  function renderRecipes() {
    const query = $("#recipe-search").value.trim().toLowerCase();
    const machine = $("#machine-filter").value;
    const rows = (db.recipes || []).filter(r => {
      const text = [r.id,r.machine,...Object.keys(r.inputs||{}),...Object.keys(r.outputs||{})].join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!machine || r.machine === machine);
    });
    $("#recipe-total").textContent = rows.length + " recipes";
    $("#recipe-list").innerHTML = rows.slice(0,250).map(r=>{
      const input = Object.entries(r.inputs||{}).map(([n,q])=>fmt(q)+" "+n).join(" + ") || "No listed inputs";
      const output = Object.entries(r.outputs||{}).map(([n,q])=>fmt(q)+" "+n).join(" + ") || "No listed outputs";
      const time = seconds(r)>0 ? fmt(seconds(r))+" s cycle · "+fmt(Object.entries(r.outputs||{}).reduce((sum,[n,q])=>sum+Number(q)*60/seconds(r),0))+" total output/min" : "No base time";
      return '<article class="recipe-row"><div><div class="recipe-name">'+esc(r.id)+'</div><div class="recipe-machine">'+esc(r.machine)+'</div></div><div class="recipe-io"><div>IN · '+esc(input)+'</div><div>OUT · '+esc(output)+'</div></div><div class="recipe-time">'+esc(time)+'</div></article>';
    }).join("") || '<div class="empty-state">No recipes match this search.</div>';
    if (rows.length > 250) $("#recipe-list").insertAdjacentHTML("beforeend",'<div class="notice">Showing the first 250 matches. Narrow the search to see more.</div>');
  }
  const skillNames = [
    ["productionSpeed","Production speed","Reserved editable field; effect not modeled"],
    ["alchemy","Alchemy","Reserved editable field; effect not modeled"],
    ["fuelEfficiency","Fuel efficiency","Reserved editable field; effect not modeled"],
    ["fertility","Fertility","Reserved editable field; effect not modeled"],
    ["beltSpeed","Belt speed","Reserved editable field; effect not modeled"],
    ["other","Other / custom","Record any additional allocation"]
  ];
  function initSkills() {
    $("#skill-fields").innerHTML = skillNames.map(([id,name,desc])=>'<div class="skill-card"><label for="skill-'+id+'">'+esc(name)+'</label><p>'+esc(desc)+'</p><input id="skill-'+id+'" type="number" min="0" step="1" value="0" aria-label="'+esc(name)+' points"></div>').join("");
    $("#skill-total").addEventListener("input", updateSkillSummary);
    $("#skill-fields").addEventListener("input", updateSkillSummary);
    $("#reset-skills").addEventListener("click",()=>{ $("#skill-total").value=0; $("#skill-fields").querySelectorAll("input").forEach(i=>i.value=0); updateSkillSummary(); });
    updateSkillSummary();
  }
  function updateSkillSummary() {
    const available = Math.max(0,Number($("#skill-total").value)||0);
    const allocated = [...$("#skill-fields").querySelectorAll("input")].reduce((sum,i)=>sum+Math.max(0,Number(i.value)||0),0);
    const remaining = available-allocated;
    $("#skill-summary").textContent = "Allocated: "+fmt(allocated)+" · Available: "+fmt(available)+" · "+(remaining>=0 ? fmt(remaining)+" points unallocated" : fmt(Math.abs(remaining))+" points over budget")+". Values are editable in this page and are not yet persisted between visits.";
    $("#skill-summary").style.borderColor = remaining < 0 ? "#854b41" : "";
  }
  function initHealth() {
    const checks = [
      ["Items",report.itemCount],["Machines",report.machineCount],["Recipes",report.recipeCount],
      ["Duplicate recipe IDs",report.duplicateRecipeIds],["Missing machine references",report.missingMachines],["Missing item references",report.missingItemRefs]
    ];
    const healthy = report.duplicateRecipeIds===0 && report.missingMachines===0 && report.missingItemRefs===0 && report.issues.length===0;
    $("#health-status").textContent = healthy ? "Structural checks passed" : "Issues detected";
    $("#health-status").style.color = healthy ? "var(--green)" : "var(--red)";
    $("#health-grid").innerHTML = checks.map(([label,value])=>'<div class="health-card"><b>'+fmt(value)+'</b><span>'+esc(label.toUpperCase())+'</span></div>').join("");
  }
  async function start() {
    try {
      const loaded = await window.AlchemyDatabase.loadDatabase();
      db = loaded.db; report = loaded.report;
      initHeader(); initTabs(); initPlanner(); initRecipes(); initSkills(); initHealth();
    } catch (error) {
      document.querySelector("main").innerHTML = '<section class="notice"><strong>Database load failed.</strong><p>'+esc(error.message)+'</p><p>Confirm that <code>data/alchemy_db.json</code> is committed and served from the repository root.</p></section>';
      console.error(error);
    }
  }
  start();
})();