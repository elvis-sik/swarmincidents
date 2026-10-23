// @ts-check
const {test, expect, load, siteData} = require('./fixtures');
const data = siteData();

test('compact source card opens full collection without changing incident or losing focus', async ({page}) => {
  await load(page, 'aisi-cyber-range');
  const record = data.publicSources.incidents['aisi-cyber-range'];
  const total = record.curated.length + record.additional.length;
  const section = page.locator('#det .compact-sources');
  await expect(section.locator('li')).toHaveCount(Math.min(3, record.curated.length));
  const button = section.getByRole('button', {name:`Show all ${total} sources`, exact:true});
  await button.click();
  const dialog = page.getByRole('dialog', {name:`Sources (${total})`, exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.source-browser-row')).toHaveCount(total);
  await expect(dialog.getByText('Selected citations are the card’s references.', {exact:false})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(button).toBeFocused();
  await expect(page.locator('#det-title')).toHaveText('UK AISI cyber test: agents target a GitHub project');
  await expect(page).toHaveURL(/#aisi-cyber-range$/);
});

test('source filtering is local and preserves distinct evidence roles', async ({page}) => {
  await load(page, 'aisi-cyber-range');
  await page.locator('#det .compact-sources').getByRole('button').click();
  const dialog = page.locator('#source-dialog');
  const record = data.publicSources.incidents['aisi-cyber-range'];
  await dialog.getByRole('button', {name:`Selected citations ${record.curated.length}`, exact:true}).click();
  await expect(dialog.locator('.source-browser-row')).toHaveCount(record.curated.length);
  const input = dialog.getByRole('searchbox', {name:'Filter sources for this incident'});
  await input.fill('no matching source zz999');
  await expect(dialog.locator('.source-browser-row')).toHaveCount(0);
  await expect(dialog.getByText('No sources match this filter.')).toBeVisible();
  await input.fill('');
  await dialog.getByRole('button', {name:`Additional references ${record.additional.length}`, exact:true}).click();
  await expect(dialog.locator('.source-browser-row')).toHaveCount(record.additional.length);
  expect(await dialog.locator('.source-results').evaluate(el => [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent.trim()).filter(Boolean))).toEqual([]);
  await dialog.getByRole('button', {name:'Close sources'}).click();
  await expect(dialog).not.toBeVisible();
});

test('explicit event associations link reports and activity while private notice stays plain', async ({page}) => {
  await load(page, 'aisi-cyber-range');
  const e = data.incidents.find(e => e.id === 'aisi-cyber-range');
  const refs = data.publicSources.incidents[e.id];
  for (const ref of refs.reveals.filter(r=>r.source_ids.length)) {
    const url = data.publicSources.sources[ref.source_ids[0]].url;
    await expect(page.locator('#incident-timeline').getByRole('link', {name:ref.text, exact:true})).toHaveAttribute('href', url);
  }
  for (const ref of refs.activity || []) {
    if (!ref.source_ids.length) continue;
    const activity = e.activity.find(a=>a.s===ref.s && a.e===ref.e && a.label===ref.label);
    const text = activity.sub ? activity.label : `Agents active (${activity.label})`;
    await expect(page.locator('#incident-timeline').getByRole('link', {name:text, exact:true})).toHaveAttribute('href', data.publicSources.sources[ref.source_ids[0]].url);
  }
  if (refs.knew?.source_ids.length) {
    await expect(page.locator('#incident-timeline').getByRole('link', {name:refs.knew.text, exact:true})).toHaveAttribute('href', data.publicSources.sources[refs.knew.source_ids[0]].url);
  }
  const privateIncident = data.incidents.find(e=>e.reveals.some(r=>r.private));
  await page.goto('/#'+privateIncident.id);
  for (const reveal of privateIncident.reveals.filter(r=>r.private)) {
    const row = page.locator('#incident-timeline li').filter({hasText:reveal.text});
    await expect(row).toBeVisible();
    await expect(row.getByRole('link')).toHaveCount(0);
  }
});


test('published sign-in lead pointers stay visibly distinct from public evidence', async ({page}) => {
  const source = Object.entries(data.publicSources.sources).find(([,s])=>s.access==='sign_in_required');
  const [id] = source;
  const incident = data.incidents.find(e=>['curated','additional'].some(role=>data.publicSources.incidents[e.id][role].includes(id)));
  await load(page, incident.id);
  await page.locator('#det .compact-sources').getByRole('button').click();
  const row = page.locator('#source-dialog .source-browser-row[data-source-id="'+id+'"]');
  await expect(row).toContainText('Sign-in required · lead identifier');
  await expect(row.getByRole('link').first()).toHaveAttribute('href', source[1].url);
});
