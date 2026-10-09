import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import {exampleInputDigest, sha256} from './example-integrity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'examples');
const server = await createServer({root, server: {host: '127.0.0.1', port: 0, open: false}});
let browser;

try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: {width: 1440, height: 1100}, deviceScaleFactor: 1,
    locale: 'en-GB', timezoneId: 'Europe/Amsterdam', reducedMotion: 'reduce', colorScheme: 'light',
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Fix Date while leaving rendering, discovery and request timers running.
  await page.clock.setFixedTime(new Date('2026-06-15T12:30:00Z'));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => Boolean(window.demo && window.customCards?.length));
  const cards = await page.evaluate(() => window.customCards.map(({type, name}) => ({type, title: name})));
  const modules = (await readdir(resolve(root, 'src/cards'))).filter(file => file.endsWith('-card.ts')).map(file => `quatt-${file.slice(0, -3)}`);
  expect(cards.map(card => card.type).sort(), 'Every card module must be registered').toEqual(modules.sort());
  for (const {type} of cards) {
    await expect(page.locator(type), `${type} must be present in the demo`).toHaveCount(1);
    await expect(page.locator(type).getByRole('heading', {level: 2})).toBeVisible();
  }
  await expect(page.locator('quatt-heat-pump-card .unit')).toHaveCount(2);
  await expect(page.locator('quatt-chill-card .room')).toHaveCount(2);
  await mkdir(output, {recursive: true});
  const captures = [];

  async function capture(locator, filename) {
    await expect(page.locator('quatt-history-card .chart')).toHaveAttribute('aria-busy', 'false');
    await page.evaluate(async () => {
      await Promise.all([...document.querySelector('.card-grid').children].map(card => card.updateComplete));
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await expect(page.locator('.notice.error')).toHaveCount(0);
    await locator.screenshot({path: resolve(output, filename), animations: 'disabled'});
    captures.push(filename);
    console.log(`examples/${filename}`);
  }

  for (const [name, theme, width] of [['desktop', 'light', 1440], ['mobile', 'dark', 390]]) {
    await page.setViewportSize({width, height: 1100});
    await page.evaluate(theme => window.demo.setTheme(theme), theme);
    await capture(page.locator('.card-grid'), `${name}-${theme}.png`);
  }

  // Crop real components, without demo controls, neighboring cards or stretched grid rows.
  await page.addStyleTag({content: '.demo-header,footer{display:none} main{padding:12px;max-width:none}.card-grid{display:block}.card-grid>*{display:none!important}.card-grid>[data-example]{display:block!important;width:100%}'});
  const variants = [];
  for (const {type, title} of cards) {
    const name = type.replace(/^quatt-/, '').replace(/-card$/, '');
    variants.push({type, name, title, scenario: name === 'chill' ? 'cooling' : 'heating', mobile: false});
    variants.push({type, name: `${name}-mobile`, title: `${title} · phone`, scenario: name === 'chill' ? 'cooling' : 'heating', mobile: true});
    if (['heat-pump', 'chill'].includes(name)) for (const layout of ['stacked', 'compact']) {
      variants.push({type, name: `${name}-${layout}`, title: `${title} · ${layout}`, scenario: name === 'chill' ? 'cooling' : 'heating', config: {layout}, mobile: true});
    }
    if (name === 'overview') variants.push({type, name: 'overview-minimal', title: 'Overview · minimal heat battery', scenario: 'heating', mobile: false, config: {heat_battery_layout: 'minimal', fields: {flowRate: false, 'heatBattery.showerMinutes': false, 'heatBattery.status': false}}});
    if (name === 'heating-circuit') variants.push({type, name: 'heating-circuit-single-mobile', title: 'Heating circuit · single pump, phone', scenario: 'single', mobile: true});
  }
  for (const variant of variants) {
    const {type, name, scenario, config = {}, mobile} = variant;
    const width = mobile ? 390 : ['quatt-history-card', 'quatt-heating-circuit-card'].includes(type) ? 924 : 464;
    await page.setViewportSize({width, height: 1100});
    await page.evaluate(({type, scenario, config}) => {
      document.querySelector('[data-example]')?.removeAttribute('data-example');
      const card = document.querySelector(type);
      card.setAttribute('data-example', '');
      // Reset each variant instead of inheriting a previous variant's field choices.
      card.setConfig({type: `custom:${type}`, ...config});
      window.demo.setScenario(scenario);
    }, {type, scenario, config});
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => window.demo.setTheme(theme), theme);
      await capture(page.locator(type), `${name}-${theme}.png`);
    }
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join('\n')}`);

  // Keep every generated card/variant discoverable, including future registered cards.
  const lines = [
    '<!-- BEGIN GENERATED EXAMPLES -->',
    '![All seven Quatt cards, desktop light theme with synthetic data](examples/desktop-light.png)',
    '', '[Full phone dashboard, dark theme](examples/mobile-dark.png)', '',
    '### Card previews', '',
    'Synthetic readings only. Regenerate these images with `npm run update:examples`.', '',
    '| Card / layout | Light theme | Dark theme |', '| --- | --- | --- |',
    ...variants.filter(v => !v.name.endsWith('-mobile') || v.name.includes('-single-')).map(v => `| ${v.title} | ![${v.title}, light](examples/${v.name}-light.png) | ![${v.title}, dark](examples/${v.name}-dark.png) |`),
    '', 'Phone previews: '+cards.map(({type, title}) => {const name=type.replace(/^quatt-/, '').replace(/-card$/, '');return `${title} ([light](examples/${name}-mobile-light.png), [dark](examples/${name}-mobile-dark.png))`;}).join(' · '),
    '<!-- END GENERATED EXAMPLES -->',
  ];
  lines[1] = lines[1].replace('seven', String(cards.length));
  const readmePath = resolve(root, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const block = /<!-- BEGIN GENERATED EXAMPLES -->[\s\S]*?<!-- END GENERATED EXAMPLES -->/;
  if (!block.test(readme)) throw new Error('README is missing the generated examples markers.');
  await writeFile(readmePath, readme.replace(block, lines.join('\n')));
  const pngSha256 = Object.fromEntries(await Promise.all(captures.map(async file => [file, sha256(await readFile(resolve(output, file)))])));
  await writeFile(resolve(output, 'screenshots.json'), JSON.stringify({clock: '2026-06-15T12:30:00Z', locale: 'en-GB', timezone: 'Europe/Amsterdam', cards: cards.map(c => c.type), files: captures, inputDigest: await exampleInputDigest(), pngSha256}, null, 2)+'\n');
  console.log(`Updated ${captures.length} PNGs and the README gallery.`);
} finally {
  try { await browser?.close(); }
  finally { await server.close(); }
}
