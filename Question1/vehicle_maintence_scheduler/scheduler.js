require("dotenv").config();
const axios = require("axios");
const { Log } = require("../logging_middleware");

const DEPOT_API    = process.env.DEPOT_API;
const VEHICLES_API = process.env.VEHICLES_API;
const AUTH_TOKEN   = process.env.AUTH_TOKEN;

const api = axios.create({
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Fetch all depots — each has an ID and a MechanicHours budget
async function fetchDepots() {
  await Log("backend", "info", "service", "Fetching depots");
  const response = await api.get(DEPOT_API);
  const depots = response.data.depots;
  await Log("backend", "info", "service", `Fetched ${depots.length} depots`);
  return depots;
}

// Fetch all vehicles/tasks — fields: TaskID, Duration, Impact
async function fetchVehicles() {
  await Log("backend", "info", "service", "Fetching vehicles");
  const response = await api.get(VEHICLES_API);
  const vehicles = response.data.vehicles;
  await Log("backend", "info", "service", `Fetched ${vehicles.length} vehicles`);
  return vehicles;
}

// 0/1 Knapsack — maximise total Impact within mechanicHours budget
function knapsack(vehicles, mechanicHours) {
  const n = vehicles.length;
  const capacity = mechanicHours;

  // dp[h] = max impact achievable with exactly h hours available
  const dp = new Array(capacity + 1).fill(0);
  // track which vehicles were picked for each capacity
  const chosen = Array.from({ length: capacity + 1 }, () => []);

  for (let i = 0; i < n; i++) {
    const { TaskID, Duration, Impact } = vehicles[i];

    // iterate backwards to avoid using same item twice
    for (let h = capacity; h >= Duration; h--) {
      const candidate = dp[h - Duration] + Impact;
      if (candidate > dp[h]) {
        dp[h] = candidate;
        chosen[h] = [...chosen[h - Duration], vehicles[i]];
      }
    }
  }

  const selected = chosen[capacity];
  const totalHours = selected.reduce((sum, v) => sum + v.Duration, 0);

  return {
    maxImpact: dp[capacity],
    totalHoursUsed: totalHours,
    selectedVehicles: selected,
  };
}

async function runScheduler() {
  try {
    await Log("backend", "info", "handler", "Scheduler started");

    if (!AUTH_TOKEN) {
      await Log("backend", "fatal", "config", "Missing AUTH_TOKEN");
      throw new Error("AUTH_TOKEN is required");
    }

    const [depots, vehicles] = await Promise.all([fetchDepots(), fetchVehicles()]);

    const results = [];

    for (const depot of depots) {
      const { ID: depotId, MechanicHours: mechanicHours } = depot;

      await Log("backend", "debug", "domain", `Depot ${depotId}: ${mechanicHours}hrs budget`);

      const result = knapsack(vehicles, mechanicHours);

      results.push({
        depotId,
        mechanicHours,
        totalVehiclesAvailable: vehicles.length,
        maxImpactScore: result.maxImpact,
        totalHoursUsed: result.totalHoursUsed,
        selectedVehicles: result.selectedVehicles,
      });

      await Log(
        "backend",
        "info",
        "service",
        `Depot ${depotId}: impact=${result.maxImpact}`
      );
    }

    await Log("backend", "info", "handler", "Scheduling completed");

    // Summary table
    console.log("\n===== VEHICLE MAINTENANCE SCHEDULE SUMMARY =====");
    console.table(
      results.map((r) => ({
        DepotID:           r.depotId,
        BudgetHours:       r.mechanicHours,
        UsedHours:         r.totalHoursUsed,
        MaxImpactScore:    r.maxImpactScore,
        VehiclesSelected:  r.selectedVehicles.length,
      }))
    );

    // Full detail per depot
    for (const r of results) {
      console.log(`\n--- Depot ${r.depotId} selected vehicles ---`);
      console.table(
        r.selectedVehicles.map((v) => ({
          TaskID:   v.TaskID,
          Duration: v.Duration,
          Impact:   v.Impact,
        }))
      );
    }

    console.log("\nFull JSON output:");
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    await Log("backend", "fatal", "handler", `Scheduler failed`.substring(0, 48));
    console.error("Scheduler error:", error.message);
    process.exit(1);
  }
}

runScheduler();
