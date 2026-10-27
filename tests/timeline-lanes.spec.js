const { test, expect, siteData } = require('./fixtures');
const data = siteData();

test('activity shapes preserve each recorded date range and reports occupy a separate lane', async ({ page }) => {
  await page.goto('/?tags=all');
  await expect(page.locator('[data-inc-row]')).toHaveCount(data.incidents.length);
  const rows = await page.locator('[data-inc-row]').evaluateAll(rows => rows.map(row => {
    const activity = row.querySelector('[data-lane="activity"]');
    const reports = row.querySelector('[data-lane="reports"]');
    return {
      id: row.dataset.incRow,
      marks: [...activity.querySelectorAll('[data-activity-start]')].map(g => ({
        start: g.dataset.activityStart, end: g.dataset.activityEnd,
        point: !!g.querySelector('circle.act'), bar: !!g.querySelector('rect.act')
      })),
      unknown: activity.textContent.includes('Date unknown'),
      activityBottom: activity.getBoundingClientRect().bottom,
      reportTop: reports.getBoundingClientRect().top,
      reportBottom: reports.getBoundingClientRect().bottom,
      rowBottom: row.getBoundingClientRect().bottom,
      reportCircles: reports.querySelectorAll('circle.rev').length,
      reportCount: [...reports.querySelectorAll('.date-cluster')].reduce((n,g) => n + Number(g.dataset.count),0)
    };
  }));
  for (const row of rows) {
    const incident = data.incidents.find(i => i.id === row.id);
    expect(row.marks, row.id).toEqual(incident.activity.map(a => ({ start:a.s, end:a.e, point:a.s===a.e, bar:a.s!==a.e })));
    expect(row.unknown, row.id).toBe(incident.activity.length === 0);
    expect(row.reportCount, row.id).toBe(incident.reveals.length + Number(!!incident.knew));
    expect(row.reportCircles, row.id).toBe(0);
    expect(row.reportTop - row.activityBottom, row.id).toBeGreaterThanOrEqual(8);
    expect(row.reportBottom, row.id).toBeLessThanOrEqual(row.rowBottom);
  }
});

test('the Qwen disclosure never becomes activity and separate May tasks stay separate points', async ({ page }) => {
  await page.goto('/?tags=all');
  const qwen = page.locator('[data-inc-row="cohere-qwen-unrequested-upload"]');
  await expect(qwen.locator('[data-lane="activity"] .act')).toHaveCount(0);
  await expect(qwen.locator('[data-lane="activity"]')).toHaveText('Date unknown');
  const report = qwen.locator('[data-lane="reports"] .date-cluster');
  expect(JSON.parse(await report.getAttribute('data-markers')).map(m=>m.date)).toEqual(['2026-10-26']);
  const may = page.locator('[data-inc-row="hugging-face-may-tokens"] [data-lane="activity"]');
  await expect(may.locator('circle.act')).toHaveCount(2);
  await expect(may.locator('rect.act, line')).toHaveCount(0);
});

test('a same-day activity and disclosure share an exact date anchor but stay vertically separate', async ({ page }) => {
  await page.goto('/?tags=all');
  const sample = data.incidents.find(e=>e.activity.some(a=>a.s===a.e&&e.reveals.some(r=>r.d===a.s)));
  const date = sample.activity.find(a=>a.s===a.e&&sample.reveals.some(r=>r.d===a.s)).s;
  const positions = await page.locator(`[data-inc-row="${sample.id}"]`).evaluate((row,date) => {
    const point = row.querySelector(`[data-activity-start="${date}"] circle.act`);
    const marker = [...row.querySelectorAll('.date-cluster')].flatMap(g=>JSON.parse(g.dataset.markers)).find(p=>p.date===date);
    return {activityX:Number(point.getAttribute('cx')),reportX:marker.x};
  },date);
  expect(positions.activityX).toBeCloseTo(positions.reportX,5);
});

test('response-card mini timelines retain legible activity and report lanes', async ({ page }) => {
  const response = data.responses.find(r => r.inc.some(id => data.incidents.find(e=>e.id===id)?.activity.some(a=>a.s===a.e)));
  await page.goto('/?tags=all#response/'+response.id);
  const chart = page.locator('#det .rel-inc svg').first();
  await expect(chart).toBeVisible();
  await expect(chart.locator('.lane-label')).toHaveText(['Activity','Reports']);
  expect((await chart.boundingBox()).height).toBeGreaterThanOrEqual(60);
  await expect(chart.locator('path.rev')).toHaveCount(1);
  await expect(chart.locator('circle.rev')).toHaveCount(0);
});
