const raw = process.argv[2] || process.env.SMOKE_BASE_URL;
if (!raw) {
  console.error("Usage: bun run smoke:production -- https://your-domain.com");
  process.exit(2);
}
let base;
try { base = new URL(raw); } catch {
  console.error("Provide a valid absolute base URL.");
  process.exit(2);
}
if (!["http:", "https:"].includes(base.protocol)) {
  console.error("Base URL must use HTTP or HTTPS.");
  process.exit(2);
}
const checks = [
  { path: "/", accepts: (status) => status === 200 },
  { path: "/sign-in", accepts: (status) => status === 200 },
  { path: "/sign-up", accepts: (status) => status === 200 },
  { path: "/api/health", accepts: (status) => status === 200 },
];
let failed = 0;
for (const check of checks) {
  try {
    const response = await fetch(new URL(check.path, base), { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "user-agent": "ChangeRadar-production-smoke-test/1.0" } });
    const ok = check.accepts(response.status);
    console.log(`${ok ? "PASS" : "FAIL"} ${check.path} -> HTTP ${response.status}`);
    if (!ok) failed++;
  } catch (error) {
    console.error(`FAIL ${check.path} -> ${error instanceof Error ? error.message : "request failed"}`);
    failed++;
  }
}
if (failed) {
  console.error(`\nProduction smoke test failed: ${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nProduction smoke test passed: ${checks.length}/${checks.length} checks.`);
