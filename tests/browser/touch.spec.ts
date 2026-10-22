import {test,expect} from './fixtures';
test('touch can inspect recorded measurements',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/");
 const chart=page.locator('quatt-history-card').getByRole('slider');await expect(chart).toBeVisible();await chart.scrollIntoViewIfNeeded();const b=(await chart.boundingBox())!;await page.touchscreen.tap(b.x+b.width*.55,b.y+50);await expect(page.locator('quatt-history-card').locator('.inspector')).toBeVisible();expect(Number(await chart.getAttribute('aria-valuenow'))).toBeGreaterThan(300);
});

