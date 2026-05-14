document.addEventListener("DOMContentLoaded", () => {
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity 0.8s ease-out";
  
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = "1";
    });
  });

  // OUTAGES UI: floating tab + slide-in panel with localStorage-backed CRUD
  const outagesKey = 'helperx_outages_v1';

  function loadOutages() {
    try { return JSON.parse(localStorage.getItem(outagesKey) || '[]'); } catch (e) { return []; }
  }
  function saveOutages(list) { localStorage.setItem(outagesKey, JSON.stringify(list)); }

  // create UI elements
  const overlay = document.createElement('div');
  overlay.className = 'outages-overlay';
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.className = 'outages-panel';
  panel.innerHTML = `
    <h2>Outages</h2>
    <form class="outages-form">
      <input name="title" placeholder="Title (required)" required />
      <input name="service" placeholder="Service (e.g. API)" />
      <label class="outage-meta">Start</label>
      <input type="datetime-local" name="start" />
      <label class="outage-meta">End</label>
      <input type="datetime-local" name="end" />
      <textarea name="description" placeholder="Description"></textarea>
      <select name="status">
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>
      <div class="outages-actions">
        <button type="submit" class="btn primary">Save</button>
        <button type="button" class="btn secondary clear-btn">Clear</button>
        <button type="button" class="btn secondary export-btn">Export</button>
        <button type="button" class="btn secondary import-btn">Import</button>
        <input type="file" accept="application/json" style="display:none" class="import-input" />
      </div>
    </form>
    <div class="outage-list"></div>
  `;
  document.body.appendChild(panel);

  const openBtn = document.createElement('button');
  openBtn.className = 'outages-button';
  openBtn.innerHTML = '<span style="font-weight:700">Outages</span>';
  document.body.appendChild(openBtn);

  let editingId = null;

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

  function renderList() {
    const list = loadOutages();
    const container = panel.querySelector('.outage-list');
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<div class="outage-empty">No outages recorded.</div>';
      return;
    }
    list.slice().reverse().forEach(item => {
      const el = document.createElement('div');
      el.className = 'outage-item';
      el.innerHTML = `
        <div style="flex:1">
          <strong>${escapeHtml(item.title)}</strong>
          <div class="outage-meta">${escapeHtml(item.service || '')} ${item.start ? '• ' + escapeHtml(item.start) : ''}${item.end ? ' → ' + escapeHtml(item.end) : ''}</div>
          <div style="margin-top:8px">${escapeHtml(item.description || '')}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="outage-meta">${escapeHtml(item.status || '')}</div>
          <div class="outage-actions">
            <button data-id="${item.id}" class="edit-btn">Edit</button>
            <button data-id="${item.id}" class="del-btn">Delete</button>
          </div>
        </div>
      `;
      container.appendChild(el);

      // clicking the item (outside the action buttons) opens the full outages page for details
      el.addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn') || e.target.closest('.del-btn') || e.target.closest('.outage-actions')) return;
        const url = new URL('outages.html', window.location.href);
        url.searchParams.set('id', item.id);
        window.location.href = url.href;
      });
    });

    container.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', e => startEdit(b.dataset.id)));
    container.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', e => {
      if (!confirm('Delete this outage?')) return; deleteItem(b.dataset.id);
    }));
  }

  function deleteItem(id) {
    const list = loadOutages().filter(i => i.id !== id);
    saveOutages(list);
    renderList();
  }

  function startEdit(id) {
    const list = loadOutages();
    const item = list.find(i => i.id === id);
    if (!item) return;
    const form = panel.querySelector('form');
    form.title.value = item.title;
    form.service.value = item.service || '';
    form.start.value = item.start || '';
    form.end.value = item.end || '';
    form.description.value = item.description || '';
    form.status.value = item.status || 'open';
    editingId = id;
    openPanel();
  }

  function openPanel() { panel.classList.add('open'); overlay.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); overlay.classList.remove('open'); editingId = null; panel.querySelector('form').reset(); }

  openBtn.addEventListener('click', () => { openPanel(); panel.querySelector('form').title.focus(); });
  overlay.addEventListener('click', closePanel);

  const form = panel.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = loadOutages();
    const payload = {
      id: editingId || String(Date.now()),
      title: form.title.value.trim(),
      service: form.service.value.trim(),
      start: form.start.value || '',
      end: form.end.value || '',
      description: form.description.value.trim(),
      status: form.status.value || 'open'
    };
    if (!payload.title) return alert('Title is required');
    if (editingId) {
      const idx = data.findIndex(i => i.id === editingId);
      if (idx !== -1) data[idx] = payload;
    } else {
      data.push(payload);
    }
    saveOutages(data);
    renderList();
    form.reset();
    editingId = null;
  });

  panel.querySelector('.clear-btn').addEventListener('click', () => { if (confirm('Clear form?')) panel.querySelector('form').reset(); });

  panel.querySelector('.export-btn').addEventListener('click', () => {
    const data = JSON.stringify(loadOutages(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'outages.json'; a.click(); URL.revokeObjectURL(url);
  });

  const importInput = panel.querySelector('.import-input');
  panel.querySelector('.import-btn').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error('Invalid file');
        saveOutages(parsed);
        renderList();
        alert('Imported ' + parsed.length + ' outage(s)');
      } catch (err) { alert('Failed to import file: ' + err.message); }
    };
    reader.readAsText(f);
  });

  // initialize
  renderList();

  // FULL-PAGE OUTAGES VIEW (if the page includes #outages-app)
  const fullApp = document.getElementById('outages-app');
  if (fullApp) {
    fullApp.innerHTML = `
      <div class="outages-page">
        <div class="outage-page-list">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="font-size:18px">Outages</strong>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn secondary import-btn-page">Import</button>
              <button class="btn secondary export-btn-page">Export</button>
              <button class="btn primary new-btn-page">New</button>
            </div>
          </div>
          <input class="outages-filter" placeholder="Filter by title or service" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:transparent;color:var(--text);margin-bottom:12px;" />
          <div class="outage-list-page"></div>
        </div>
        <div class="outage-page-form">
          <h3 id="form-title">Create Outage</h3>
          <form class="outages-form-page">
            <input name="title" placeholder="Title (required)" required />
            <input name="service" placeholder="Service (e.g. API)" />
            <label class="outage-meta">Start</label>
            <input type="datetime-local" name="start" />
            <label class="outage-meta">End</label>
            <input type="datetime-local" name="end" />
            <textarea name="description" placeholder="Description"></textarea>
            <select name="status">
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
            <div style="display:flex;gap:8px;justify-content:space-between;margin-top:12px;">
              <div style="display:flex;gap:8px;">
                <button type="submit" class="btn primary save-btn">Save</button>
                <button type="button" class="btn secondary cancel-btn">Cancel</button>
              </div>
              <button type="button" class="btn secondary del-btn-page" style="display:none">Delete</button>
            </div>
          </form>
          <input type="file" accept="application/json" style="display:none" class="import-input-page" />
        </div>
      </div>
    `;

    let editingFull = null;
    const listPage = fullApp.querySelector('.outage-list-page');
    const formPage = fullApp.querySelector('.outages-form-page');
    const formTitle = fullApp.querySelector('#form-title');
    const filterInput = fullApp.querySelector('.outages-filter');
    const importInputPage = fullApp.querySelector('.import-input-page');

    function renderFullList() {
      const q = (filterInput.value || '').trim().toLowerCase();
      const data = loadOutages();
      listPage.innerHTML = '';
      const items = data.slice().reverse().filter(it => {
        if (!q) return true;
        return (it.title||'').toLowerCase().includes(q) || (it.service||'').toLowerCase().includes(q) || (it.description||'').toLowerCase().includes(q);
      });
      if (!items.length) { listPage.innerHTML = '<div class="outage-empty">No outages found.</div>'; return; }
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'outage-item';
        el.style.cursor = 'pointer';
        el.innerHTML = `
          <div style="flex:1">
            <strong>${escapeHtml(item.title)}</strong>
            <div class="outage-meta">${escapeHtml(item.service||'')} ${item.start ? '• ' + escapeHtml(item.start) : ''}${item.end ? ' → ' + escapeHtml(item.end) : ''}</div>
            <div style="margin-top:8px;color:var(--text-muted);">${escapeHtml(item.description||'')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <div class="outage-meta">${escapeHtml(item.status||'')}</div>
            <div class="outage-actions">
              <button data-id="${item.id}" class="edit-full">Edit</button>
              <button data-id="${item.id}" class="del-full">Delete</button>
            </div>
          </div>
        `;
        el.querySelector('.edit-full').addEventListener('click', (e) => { e.stopPropagation(); startFullEdit(item.id); });
        el.querySelector('.del-full').addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Delete this outage?')) { deleteFull(item.id); } });
        el.addEventListener('click', () => startFullEdit(item.id));
        listPage.appendChild(el);
      });
    }

    function startFullEdit(id) {
      const data = loadOutages(); const item = data.find(i => i.id === id); if (!item) return;
      formPage.title.value = item.title; formPage.service.value = item.service||''; formPage.start.value = item.start||''; formPage.end.value = item.end||''; formPage.description.value = item.description||''; formPage.status.value = item.status||'open';
      editingFull = id; formTitle.textContent = 'Edit Outage'; fullApp.querySelector('.del-btn-page').style.display = 'inline-block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function deleteFull(id) { const list = loadOutages().filter(i => i.id !== id); saveOutages(list); renderFullList(); renderList(); formPage.reset(); editingFull = null; formTitle.textContent = 'Create Outage'; fullApp.querySelector('.del-btn-page').style.display = 'none'; }

    formPage.addEventListener('submit', (e) => {
      e.preventDefault(); const data = loadOutages(); const payload = { id: editingFull || String(Date.now()), title: formPage.title.value.trim(), service: formPage.service.value.trim(), start: formPage.start.value||'', end: formPage.end.value||'', description: formPage.description.value.trim(), status: formPage.status.value||'open' };
      if (!payload.title) return alert('Title is required');
      if (editingFull) { const idx = data.findIndex(i => i.id === editingFull); if (idx !== -1) data[idx] = payload; } else { data.push(payload); }
      saveOutages(data); renderFullList(); renderList(); formPage.reset(); editingFull = null; formTitle.textContent = 'Create Outage'; fullApp.querySelector('.del-btn-page').style.display = 'none';
    });

    fullApp.querySelector('.new-btn-page').addEventListener('click', () => { formPage.reset(); editingFull = null; formTitle.textContent = 'Create Outage'; fullApp.querySelector('.del-btn-page').style.display = 'none'; formPage.title.focus(); });
    fullApp.querySelector('.cancel-btn').addEventListener('click', () => { formPage.reset(); editingFull = null; formTitle.textContent = 'Create Outage'; fullApp.querySelector('.del-btn-page').style.display = 'none'; });
    fullApp.querySelector('.del-btn-page').addEventListener('click', () => { if (!editingFull) return; if (confirm('Delete this outage?')) deleteFull(editingFull); });

    fullApp.querySelector('.export-btn-page').addEventListener('click', () => {
      const data = JSON.stringify(loadOutages(), null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'outages.json'; a.click(); URL.revokeObjectURL(url);
    });

    fullApp.querySelector('.import-btn-page').addEventListener('click', () => importInputPage.click());
    importInputPage.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(reader.result); if (!Array.isArray(parsed)) throw new Error('Invalid file'); saveOutages(parsed); renderFullList(); renderList(); alert('Imported ' + parsed.length + ' outage(s)'); } catch (err) { alert('Failed to import file: ' + err.message); } }; reader.readAsText(f); });

    filterInput.addEventListener('input', () => renderFullList());

    // pre-fill if URL has id
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId) startFullEdit(urlId);

    renderFullList();
  }
});