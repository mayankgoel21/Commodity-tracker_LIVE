import { getStore } from "@netlify/blobs";

const SEED_USD_INR = [
  83.110, 82.974, 83.036, 83.406, 83.354, 83.480,
  83.593, 83.880, 83.802, 84.029, 84.385, 84.971,
  86.230, 86.961, 86.619, 85.602, 85.197, 85.926,
  86.068, 87.516, 88.272, 88.371, 88.881, 89.997,
  90.785, 90.742, 92.490
];

const SEED_CNY_INR = [
  11.652, 11.547, 11.530, 11.525, 11.525, 11.509,
  11.510, 11.729, 11.843, 11.866, 11.717, 11.673,
  11.810, 11.963, 11.946, 11.740, 11.800, 11.963,
  12.001, 12.196, 12.389, 12.411, 12.511, 12.772,
  12.980, 13.050, 13.410
];

const SEED_MONTHS = [
  "Jan'24","Feb'24","Mar'24","Apr'24","May'24","Jun'24",
  "Jul'24","Aug'24","Sep'24","Oct'24","Nov'24","Dec'24",
  "Jan'25","Feb'25","Mar'25","Apr'25","May'25","Jun'25",
  "Jul'25","Aug'25","Sep'25","Oct'25","Nov'25","Dec'25",
  "Jan'26","Feb'26","Mar'26"
];

async function fetchLiveRate(base, target) {
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${base}&to=${target}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const data = await res.json();
  return parseFloat(data.rates[target].toFixed(3));
}

async function fetchMonthlyHistory(base, target) {
  const start = "2024-01-01";
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://api.frankfurter.app/${start}..${today}?from=${base}&to=${target}`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`Frankfurter history HTTP ${res.status}`);
  const data = await res.json();

  // Group daily rates by YYYY-MM and compute monthly average
  const byMonth = {};
  for (const [date, rates] of Object.entries(data.rates)) {
    const ym = date.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(rates[target]);
  }

  const sorted = Object.keys(byMonth).sort();
  return sorted.map(ym => {
    const vals = byMonth[ym];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { ym, avg: parseFloat(avg.toFixed(3)) };
  });
}

function formatLabel(ym) {
  const [year, mon] = ym.split("-");
  const name = ["Jan","Feb","Mar","Apr","May","Jun",
                 "Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(mon) - 1];
  return `${name}'${year.slice(2)}`;
}

export default async function handler() {
  console.log("[fetch-fx] Starting…");
  const store = getStore("fx-rates");
  const log = {};

  let months, usdInrHistory, cnyInrHistory, usdLive, cnyLive, source;

  try {
    const [usdHist, cnyHist, usdLiveRate, cnyLiveRate] = await Promise.all([
      fetchMonthlyHistory("USD", "INR"),
      fetchMonthlyHistory("CNY", "INR"),
      fetchLiveRate("USD", "INR"),
      fetchLiveRate("CNY", "INR"),
    ]);

    // Align on USD month keys
    const cnyMap = Object.fromEntries(cnyHist.map(r => [r.ym, r.avg]));

    months = usdHist.map(r => formatLabel(r.ym));
    usdInrHistory = usdHist.map(r => r.avg);
    cnyInrHistory = usdHist.map(r => cnyMap[r.ym] ?? null);

    usdLive = usdLiveRate;
    cnyLive = cnyLiveRate;

    // Override current month with live rate
    usdInrHistory[usdInrHistory.length - 1] = usdLive;
    cnyInrHistory[cnyInrHistory.length - 1] = cnyLive;

    source = "live";
    log.usd = `✓ ${usdHist.length} months · current ₹${usdLive}`;
    log.cny = `✓ ${cnyHist.length} months · current ₹${cnyLive}`;

  } catch (err) {
    console.error("[fetch-fx] Falling back to seed:", err.message);
    months = SEED_MONTHS;
    usdInrHistory = SEED_USD_INR;
    cnyInrHistory = SEED_CNY_INR;
    usdLive = SEED_USD_INR[SEED_USD_INR.length - 1];
    cnyLive = SEED_CNY_INR[SEED_CNY_INR.length - 1];
    source = "seed";
    log.error = err.message;
  }

  const usdCnyHistory = usdInrHistory.map((u, i) =>
    cnyInrHistory[i] ? parseFloat((u / cnyInrHistory[i]).toFixed(3)) : null
  );

  const payload = {
    months,
    usdInr: { history: usdInrHistory, current: usdLive },
    cnyInr: { history: cnyInrHistory, current: cnyLive },
    usdCny: {
      history: usdCnyHistory,
      current: parseFloat((usdLive / cnyLive).toFixed(3))
    },
    fetchedAt: new Date().toISOString(),
    nextFetch: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    source,
    log,
  };

  await store.setJSON("latest", payload);
  console.log("[fetch-fx] Done:", log);

  return new Response(JSON.stringify({ ok: true, source, log }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = {
  schedule: "0 6 1,15 * *",
};
