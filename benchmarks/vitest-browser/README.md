# Throwaway browser-runner comparison

Question: does replacing Playwright Test with native Vitest Browser Mode improve runtime or reduce dependencies?

This branch is an experiment, not a proposed production migration. It leaves the production test configuration and package lock unchanged.

The generator reuses all 13 test bodies from `tests/browser/heat-battery-slim.spec.ts`. A small browser-side adapter translates the Playwright-shaped calls into Vitest locators, native DOM access, and Vitest's real browser interactions. No Playwright Test runtime executes the Vitest cases. Each case has its own isolated test file so both runners can execute four cases in parallel.

Both paths use the same locked Chromium, Vite and Istanbul instrumentation, four workers, no retries, and traces retained on failure. Each runner starts its own server and browser. Three alternating runs measure total process time, including startup and coverage capture. Each run must pass all 13 tests, collect 13 coverage files, and match the first run's Heat Battery statement, branch, function and line coverage. This sample does not meet or replace the full suite's coverage gates.

Reproduce from the repository root:

```sh
npm ci
npm install --no-save @vitest/browser-playwright@5.0.3
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/benchmark-browsers"
npx playwright install --only-shell chromium
node benchmarks/vitest-browser/generate.mjs
node benchmarks/vitest-browser/benchmark.mjs
```

Local Windows medians: Playwright Test 7.48s; Vitest Browser Mode 4.93s (34% faster, 2.55s saved). Individual measurements are in `local-results.json`.

The [single Ubuntu 24.04 runner benchmark](https://github.com/thomasvt1/quatt-cards/actions/runs/39851611649) passed in 1m 23s including setup and all six measurements. Runner medians: Playwright Test 11.17s; Vitest Browser Mode 6.83s (38.9% faster, 4.34s saved). Individual measurements are in `runner-results.json`. All 78 test executions passed and all six Heat Battery coverage summaries matched exactly. The workflow verified that Vite, Vitest, Playwright Test, Playwright and Playwright Core stayed at their lockfile versions.

Verdict: native Vitest Browser Mode is faster for this representative sample, but does not reduce dependencies. A full migration would need to port and validate the remaining browser cases before claiming a whole-CI saving. Keep this experiment separate from production CI.

Installing the browser provider added 15 packages without changing locked runtime versions. Removing `@playwright/test` would remove a 28 KiB wrapper, while `playwright` remains required by the provider. The screenshot-generation scripts also currently import Playwright Test assertions. This is not a dependency reduction.

Limitations: only the Heat Battery suite was ported. Results combine runner startup differences with moving assertions and DOM reads into the browser; they do not isolate runner overhead. Native Vitest browser tests use iframes, unlike the existing page-level tests. Do not extrapolate this sample's percentage to all 101 tests or the entire CI job. No production tests are removed or weakened.

References: [Vitest browser requirements](https://vitest.dev/guide/browser/), [Playwright provider](https://vitest.dev/config/browser/playwright).
