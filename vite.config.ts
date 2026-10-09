import istanbul from 'vite-plugin-istanbul';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
export default defineConfig({
  plugins: process.env.QUATT_COVERAGE === 'true' ? [istanbul({include:['src/**/*.ts'],exclude:['src/demo/**'],checkProd:true})] : [],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'quatt-cards.js' },
    target: 'es2022', sourcemap: process.env.QUATT_COVERAGE === 'true',
    rolldownOptions: { output: { banner: `/*! Quatt Cards — AGPL-3.0-or-later\nDerived from Omnibattery Cards: https://github.com/thomasvt1/omnibattery-cards\n\nBundled Lit libraries:\n${readFileSync(new URL('./THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8')}\n*/` } },
  },
});
