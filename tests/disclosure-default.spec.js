const {test,expect,siteData}=require('./fixtures');

test('historical backfills do not outrank newer disclosures by default',async({page})=>{
 const data=siteData();
 const main=c=>c.reveals.filter(r=>!r.minor)[0];
 await page.goto('/?tags=all');
 await expect(page.getByRole('button',{name:'Sort by disclosed, newest first',exact:true})).toHaveAttribute('aria-pressed','true');
 const ids=await page.locator('#view [data-inc-row]').evaluateAll(es=>es.map(e=>e.dataset.incRow));
 expect(ids.length).toBe(data.incidents.length);
 const dates=ids.map(id=>main(data.incidents.find(c=>c.id===id))).filter(r=>r.date_basis!=='report-updated').map(r=>r.d);
 expect(dates).toEqual([...dates].sort().reverse());
 const older='claude-passing-only-safe-tests',recent='claude-read-only-worktree-deletion';
 expect(ids).toContain(older);
 expect(ids).toContain(recent);
 expect(ids.indexOf(recent)).toBeLessThan(ids.indexOf(older));
 expect(Date.parse(data.catalogAdded[older].added_at)).toBeGreaterThan(Date.parse(data.catalogAdded[recent].added_at));
 // The earlier batch was added today but contains historical reports.
 expect(data.catalogAdded[recent]).toBeTruthy();
 await page.getByRole('button',{name:'Sort by disclosed, newest first',exact:true}).click();
 const asc=await page.locator('#view [data-inc-row]').evaluateAll(es=>es.map(e=>e.dataset.incRow));
 const known=arr=>arr.filter(id=>main(data.incidents.find(c=>c.id===id)).date_basis!=='report-updated');
 expect(known(asc)).toEqual(known(ids).reverse());
 await page.reload();
 await expect(page.getByRole('button',{name:'Sort by disclosed, newest first',exact:true})).toHaveAttribute('aria-pressed','true');
});
