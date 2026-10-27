/* Published catalog history, loaded only when a reader asks to see it. */
let cardHistoryDialog = null, cardHistoryReturnFocus = null, cardHistoryOverflow = '';
let cardHistoryRequest = 0, cardHistoryPromise = null;
const historyDate = stamp => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(stamp));
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
};
function catalogUpdated(e) {
  const updated = DATA.catalogUpdated?.[e.id];
  if (!updated) return null;
  return h('div', { class: 'catalog-updated' }, 'Updated ',
    h('time', { datetime: updated.published, text: fmtY(updated.date) }),
    h('span', { 'aria-hidden': 'true', text: ' · ' }),
    h('button', { type: 'button', class: 'mini-link card-history-trigger', 'aria-haspopup': 'dialog',
      text: 'View changes', onclick: ev => openCardHistory(e, ev.currentTarget) }));
}
function publishedCardHistory() {
  if (!cardHistoryPromise) {
    cardHistoryPromise = fetch('updates.json', { cache: 'no-cache' }).then(response => {
      if (!response.ok) throw new Error('History unavailable');
      return response.json();
    }).then(data => {
      if (!Array.isArray(data.updates)) throw new Error('History unavailable');
      return data.updates;
    }).catch(error => { cardHistoryPromise = null; throw error; });
  }
  return cardHistoryPromise;
}
function cardHistoryEntry(update) {
  const kind = { 'New incident': 'Added to catalog', Update: 'Updated', Correction: 'Correction' }[update.type];
  const detail = h('div', { class: 'card-history-diff' });
  const expand = h('details', { class: 'card-history-change' }, h('summary', { text: 'What changed' }), detail);
  let rendered = false;
  expand.addEventListener('toggle', () => {
    if (expand.open && !rendered) { detail.append(...updateChanges(update)); rendered = true; }
  });
  return h('li', { class: 'card-history-entry', 'data-history-update': update.id },
    h('div', { class: 'card-history-date' }, h('time', { datetime: update.published, text: fmtY(historyDate(update.published)) }),
      h('span', { class: 'card-history-kind', text: kind || update.type })),
    h('h3', { text: update.title }), h('p', { class: 'card-history-summary', text: update.summary }),
    update.history?.reconstructed ? h('p', { class: 'card-history-provenance',
      text: 'Reconstructed history · repository date; publication time unverified.' }) : null,
    expand);
}
async function openCardHistory(e, trigger) {
  if (!cardHistoryDialog) {
    cardHistoryDialog = h('dialog', { id: 'card-history-dialog', class: 'card-history-dialog',
      'aria-labelledby': 'card-history-title', 'aria-describedby': 'card-history-incident' });
    cardHistoryDialog.addEventListener('close', () => {
      if (cardHistoryDialog.open) return;
      cardHistoryRequest++;
      document.body.style.overflow = cardHistoryOverflow;
      const focus = cardHistoryReturnFocus?.isConnected ? cardHistoryReturnFocus : document.querySelector('#det .card-history-trigger');
      focus?.focus({ preventScroll: true });
    });
    cardHistoryDialog.addEventListener('click', ev => {
      if (ev.target !== cardHistoryDialog) return;
      const r = cardHistoryDialog.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) cardHistoryDialog.close();
    });
    document.body.append(cardHistoryDialog);
  }
  const request = ++cardHistoryRequest;
  cardHistoryReturnFocus = trigger;
  const body = h('div', { class: 'card-history-body', 'aria-busy': 'true' },
    h('p', { class: 'card-history-note', role: 'status', text: 'Loading card history…' }));
  cardHistoryDialog.replaceChildren(h('div', { class: 'source-dialog-top' },
    h('div', {}, h('h2', { id: 'card-history-title', tabindex: '-1', text: 'Card history' }),
      h('p', { id: 'card-history-incident', text: e.title })),
    h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Close card history', text: '✕', onclick: () => cardHistoryDialog.close() })), body);
  if (!cardHistoryDialog.open) {
    cardHistoryOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardHistoryDialog.showModal();
  }
  cardHistoryDialog.scrollTop = 0;
  $('#card-history-title').focus({ preventScroll: true });
  try {
    const updates = (await publishedCardHistory()).filter(update => update.incident === e.id)
      .sort((a, b) => Date.parse(b.published) - Date.parse(a.published) || a.id.localeCompare(b.id));
    if (!cardHistoryDialog.open || request !== cardHistoryRequest) return;
    body.replaceChildren(h('p', { class: 'card-history-note', role: 'status', text: 'Published catalog changes, newest first. Dates are in Los Angeles time.' }),
      updates.length ? h('ol', { class: 'card-history-list', 'aria-label': 'Published changes' }, updates.map(cardHistoryEntry))
        : h('p', { class: 'card-history-note', text: 'No published changes are available for this card yet.' }));
  } catch (_) {
    if (!cardHistoryDialog.open || request !== cardHistoryRequest) return;
    cardHistoryPromise = null;
    body.replaceChildren(h('p', { class: 'card-history-note', role: 'status', text: 'Card history could not be loaded.' }),
      h('button', { type: 'button', class: 'btn', text: 'Try again', onclick: () => openCardHistory(e, cardHistoryReturnFocus) }));
  } finally {
    body.setAttribute('aria-busy', 'false');
  }
}
window.addEventListener('hashchange', () => { if (cardHistoryDialog?.open) cardHistoryDialog.close(); });
