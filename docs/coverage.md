# Test coverage

Measured for v0.6.3 on 9 October 2026 with 100 unit tests and 57 Chromium browser tests.

## Enforced minimum

CI and tagged release builds run `npm run test:coverage`. Every card must reach **81%** for each of lines, statements, functions and branches. The same four thresholds apply to the complete browser runtime aggregate and the shared-data unit-test aggregate. Card modules are enumerated from `src/cards`; a new card without coverage fails the gate. No card is excluded and no coverage-ignore annotations are used.

The Chill state interpreter additionally requires **100%** on all four unit-coverage metrics. Its independent [known-state contract](chill-states.md) tests actual adapter behavior and browser rendering, not just line execution.

Browser tests exercise the actual Lit components, editors, state updates, keyboard/touch interaction and responsive layouts using synthetic Home Assistant fixtures. Shared-data unit tests independently cover discovery, conversion, history and state interpretation. Test code and demo fixtures are excluded from measured source. Coverage measures execution, not correctness by itself; behavior assertions and the exact reported Chill regression accompany the gate.

## Results

| Scope | Lines | Statements | Functions | Branches |
|---|---:|---:|---:|---:|
| chill-card.ts | 100% | 96.87% | 100% | 92.06% |
| heat-battery-card.ts | 100% | 100% | 100% | 95.45% |
| heat-pump-card.ts | 100% | 100% | 100% | 87.5% |
| heating-circuit-card.ts | 100% | 100% | 100% | 100% |
| history-card.ts | 98.36% | 93.54% | 94.64% | 89.74% |
| overview-card.ts | 100% | 100% | 100% | 93.05% |
| status-card.ts | 100% | 100% | 100% | 83.33% |
| Browser runtime aggregate | 96.14% | 88.41% | 94.02% | 82.12% |
| Shared-data aggregate | 99.12% | 93.44% | 100% | 88.87% |
| Chill state interpreter (unit) | 100% | 100% | 100% | 100% |

The Chill regression covers **On working + Cooling** producing an active blue snowflake instead of a question mark. Further cases cover raw `ON_WORKING`, case and whitespace, heating, idle/off, offline precedence, missing mode and unfamiliar status values. Browser assertions also check live transitions and accessible status descriptions.

The target-reached regression covers **On target temperature reached** and raw `ON_TARGET_TEMPERATURE_REACHED`, including case/whitespace normalization, cooling/heating/missing mode, and offline precedence. Browser checks assert the enabled/maintaining blue cooling or red heating badge, no question mark, preserved accessible report, and transitions back to working. Unit assertions keep maintaining activity neutral rather than implying active output.

## Reproduce

Run `npm ci`, `npx playwright install chromium`, then `npm run test:coverage`. The runner uses a separate instrumented preview on port 4175 and a unique directory for each run to avoid merging stale results. Source maps attribute counters back to TypeScript.

Open `coverage/browser/index.html` and `coverage/data/index.html` for detailed reports. CI uploads both as a `test-coverage` artifact retained for 14 days. Generated reports are ignored by Git. The normal production build contains no coverage instrumentation or coverage runtime dependencies.
