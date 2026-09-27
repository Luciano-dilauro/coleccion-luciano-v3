let data = { collections: [] };
let currentId = null;
let editId = null;
let filter = 'all';
let confirmCallback = null;
let specialSections = [];
let editingSpecialIdx = null;
let editSpecialSections = [];
let editingEditSpecialIdx = null;
let coverDataUrl = null;
let editCoverDataUrl = null;

const LS_KEY = 'coleccion_v3';
const LAST_KEY = 'ultima_coleccion';

function load() {
    try { data = JSON.parse(localStorage.getItem(LS_KEY)) || { collections: [] }; }
    catch { data = { collections: [] }; }
}
function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
}
function getCurrent() {
    return data.collections.find(c => c.id === currentId) || null;
}
function getEdit() {
    return data.collections.find(c => c.id === editId) || null;
}
function uid() { return Date.now() + '-' + Math.random().toString(36).slice(2,6); }

function updateStats() {
    const total = data.collections.length;
    let complete = 0, incomplete = 0;
    for (const c of data.collections) {
        const have = c.items.filter(it => it.have).length;
        if (c.items.length > 0 && have === c.items.length) complete++;
        else incomplete++;
    }
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statComplete').textContent = complete;
    document.getElementById('statIncomplete').textContent = incomplete;
}

function showView(name) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('view-' + name);
    if (target) target.classList.add('active');

    if (name !== 'detail') {
        const titles = {
            main: 'Principal',
            collections: 'Mis colecciones',
            manage: 'Gestión',
            'edit-picker': 'Editar colección',
            edit: 'Editar colección',
            delete: 'Eliminar colección',
            create: 'Crear colección',
            backup: 'Backup',
        };
        document.getElementById('headerTitle').textContent = titles[name] || 'Colección';
    }

    const backBtn = document.getElementById('backBtn');
    if (name === 'main') {
        backBtn.classList.add('hidden');
    } else {
        backBtn.classList.remove('hidden');
    }

    if (name === 'main') updateStats();
    if (name === 'collections') renderShelf();
    if (name === 'delete') renderDeleteShelf();
    if (name === 'edit-picker') renderEditShelf();
}

function goMain() {
    currentId = null;
    editId = null;
    localStorage.removeItem(LAST_KEY);
    showView('main');
}

function goDetail(id) {
    currentId = id;
    const col = getCurrent();
    if (!col) return;
    document.getElementById('headerTitle').textContent = col.name;
    renderDetail();
    showView('detail');
    localStorage.setItem(LAST_KEY, id);
}

function renderShelf() {
    const shelf = document.getElementById('shelf');
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const filtered = data.collections.filter(c =>
        search.length < 3 || c.name.toLowerCase().includes(search)
    );
    shelf.innerHTML = '';
    if (filtered.length === 0) {
        shelf.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b7280;padding:20px 0;">No hay colecciones</p>';
        return;
    }
    for (const c of filtered) {
        const have = c.items.filter(it => it.have).length;
        const pct = c.items.length ? Math.round(have / c.items.length * 100) : 0;
        const div = document.createElement('div');
        div.className = 'shelf-card';
        let coverHtml = '📘';
        if (c.cover) coverHtml = `<img src="${c.cover}" alt="Tapa" />`;
        div.innerHTML = `
            <div class="cover">${coverHtml}</div>
            <div class="info">
                <div class="name">${c.name}</div>
                <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
            </div>
        `;
        div.addEventListener('click', () => goDetail(c.id));
        shelf.appendChild(div);
    }
}

function renderDeleteShelf() {
    const shelf = document.getElementById('deleteShelf');
    shelf.innerHTML = '';
    if (data.collections.length === 0) {
        shelf.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b7280;padding:20px 0;">No hay colecciones para eliminar</p>';
        return;
    }
    for (const c of data.collections) {
        const have = c.items.filter(it => it.have).length;
        const pct = c.items.length ? Math.round(have / c.items.length * 100) : 0;
        const div = document.createElement('div');
        div.className = 'shelf-card delete-card';
        let coverHtml = '📘';
        if (c.cover) coverHtml = `<img src="${c.cover}" alt="Tapa" />`;
        div.innerHTML = `
            <div class="cover">${coverHtml}</div>
            <div class="info">
                <div class="name">${c.name}</div>
                <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
            </div>
        `;
        div.addEventListener('click', () => confirmDeleteCollection(c.id));
        shelf.appendChild(div);
    }
}

function renderEditShelf() {
    const shelf = document.getElementById('editShelf');
    shelf.innerHTML = '';
    if (data.collections.length === 0) {
        shelf.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b7280;padding:20px 0;">No hay colecciones para editar</p>';
        return;
    }
    for (const c of data.collections) {
        const have = c.items.filter(it => it.have).length;
        const pct = c.items.length ? Math.round(have / c.items.length * 100) : 0;
        const div = document.createElement('div');
        div.className = 'shelf-card';
        let coverHtml = '📘';
        if (c.cover) coverHtml = `<img src="${c.cover}" alt="Tapa" />`;
        div.innerHTML = `
            <div class="cover">${coverHtml}</div>
            <div class="info">
                <div class="name">${c.name}</div>
                <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
            </div>
        `;
        div.addEventListener('click', () => openEdit(c.id));
        shelf.appendChild(div);
    }
}

function confirmDeleteCollection(id) {
    const col = data.collections.find(c => c.id === id);
    if (!col) return;
    document.getElementById('confirmMsg').textContent = `¿Eliminar "${col.name}"? Esta acción no se puede deshacer.`;
    document.getElementById('confirmModal').classList.remove('hidden');
    confirmCallback = () => {
        data.collections = data.collections.filter(c => c.id !== id);
        if (currentId === id) {
            currentId = null;
            localStorage.removeItem(LAST_KEY);
        }
        save();
        updateStats();
        renderShelf();
        renderDeleteShelf();
        document.getElementById('confirmModal').classList.add('hidden');
        if (document.getElementById('view-delete').classList.contains('active')) {
            renderDeleteShelf();
        }
    };
}

// ============================================================
//  EDITAR COLECCIÓN
// ============================================================

function openEdit(id) {
    editId = id;
    const col = getEdit();
    if (!col) return;

    document.getElementById('editName').value = col.name || '';

    editSpecialSections = col.sections.map(sec => {
        const items = col.items.filter(it => it.sectionId === sec.id);
        const nums = items.map(it => it.num).filter(n => typeof n === 'number' && !isNaN(n));
        const shinyNums = items.filter(it => it.shiny).map(it => it.num);
        return {
            id: sec.id,
            name: sec.name,
            prefix: sec.prefix || '',
            from: nums.length ? Math.min(...nums) : 1,
            to: nums.length ? Math.max(...nums) : 20,
            shinyNumbers: shinyNums
        };
    });

    editCoverDataUrl = col.cover || null;
    paintEditCover();

    renderEditSpecialSections();
    showView('edit');
}

function paintEditCover() {
    const img = document.getElementById('editCoverPreview');
    if (!img) return;
    if (editCoverDataUrl) {
        img.innerHTML = `<img src="${editCoverDataUrl}" alt="Tapa" />`;
        document.getElementById('editCoverClearBtn').style.display = 'inline-block';
    } else {
        img.innerHTML = '📘';
        document.getElementById('editCoverClearBtn').style.display = 'none';
    }
}

function renderEditSpecialSections() {
    const container = document.getElementById('editSpecialList');
    container.innerHTML = '';
    for (const sec of editSpecialSections) {
        const div = document.createElement('div');
        div.className = 'special-item';
        const rango = sec.prefix
            ? `${sec.prefix}${sec.from} a ${sec.prefix}${sec.to}`
            : `${sec.from} a ${sec.to}`;
        div.innerHTML = `
            <span class="special-info" data-idx="${editSpecialSections.indexOf(sec)}" style="cursor:pointer;flex:1;">
                <strong>${sec.name}</strong> → ${rango}
            </span>
            <button class="remove" data-idx="${editSpecialSections.indexOf(sec)}">✕</button>
        `;
        container.appendChild(div);
    }

    container.querySelectorAll('.special-info').forEach(span => {
        span.addEventListener('click', () => {
            const idx = parseInt(span.getAttribute('data-idx'), 10);
            openEditSpecialModal(idx);
        });
    });

    container.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            const sec = editSpecialSections[idx];
            const col = getEdit();
            const marcadas = col ? col.items.filter(it =>
                it.sectionId === sec.id && (it.have || it.rep > 0)
            ).length : 0;

            if (marcadas > 0) {
                document.getElementById('confirmMsg').textContent =
                    `La sección "${sec.name}" tiene ${marcadas} figurita(s) marcada(s). ¿Eliminar igual?`;
                document.getElementById('confirmModal').classList.remove('hidden');
                confirmCallback = () => {
                    editSpecialSections.splice(idx, 1);
                    renderEditSpecialSections();
                    document.getElementById('confirmModal').classList.add('hidden');
                };
            } else {
                editSpecialSections.splice(idx, 1);
                renderEditSpecialSections();
            }
        });
    });
}

function saveEdit() {
    const col = getEdit();
    if (!col) return;

    const name = document.getElementById('editName').value.trim();
    if (!name) { alert('El nombre es obligatorio.'); return; }

    for (const sec of editSpecialSections) {
        if (!sec.name) { alert('Todas las secciones necesitan un nombre.'); return; }
        if (isNaN(sec.from) || isNaN(sec.to) || sec.from > sec.to) {
            alert(`Rango inválido en la sección "${sec.name}".`);
            return;
        }
    }

    if (editSpecialSections.length === 0) {
        document.getElementById('confirmMsg').textContent =
            'No hay ninguna sección. Se guardará la colección vacía. ¿Continuar?';
        document.getElementById('confirmModal').classList.remove('hidden');
        confirmCallback = () => {
            document.getElementById('confirmModal').classList.add('hidden');
            aplicarCambios(col, name);
        };
        return;
    }

    aplicarCambios(col, name);
}

function aplicarCambios(col, name) {
    const oldBySecNum = new Map();
    for (const it of col.items) {
        const num = (typeof it.num === 'number') ? it.num : parseInt(it.label.replace(/^[^\d]*/, ''), 10);
        if (!isNaN(num)) {
            oldBySecNum.set(`${it.sectionId}|${num}`, it);
        }
    }

    col.name = name;
    col.cover = editCoverDataUrl || null;

    const newSections = [];
    const newItems = [];

    for (const sec of editSpecialSections) {
        const sectionId = sec.id || uid('sec');
        const section = {
            id: sectionId,
            name: sec.name,
            prefix: sec.prefix || '',
            ownNumbering: !!sec.prefix,
            format: sec.prefix ? 'alfa' : 'num',
            specials: []
        };
        newSections.push(section);

        const shinySet = new Set(sec.shinyNumbers || []);
        for (let i = sec.from; i <= sec.to; i++) {
            const old = oldBySecNum.get(`${sectionId}|${i}`);
            const label = sec.prefix ? `${sec.prefix}${i}` : String(i);
            newItems.push({
                id: old?.id || uid('it'),
                sectionId,
                num: i,
                label,
                have: old?.have || false,
                rep: old?.rep || 0,
                special: !!sec.prefix,
                section: sec.name,
                shiny: shinySet.has(i)
            });
        }
    }

    col.sections = newSections;
    col.items = newItems;

    save();
    updateStats();
    renderShelf();
    alert('Cambios guardados ✅');
    showView('edit-picker');
    renderEditShelf();
}

function openEditSpecialModal(idx) {
    editingEditSpecialIdx = (typeof idx === 'number') ? idx : null;
    const modal = document.getElementById('editSpecialModal');
    const title = modal.querySelector('h3');

    if (editingEditSpecialIdx !== null) {
        const sec = editSpecialSections[editingEditSpecialIdx];
        title.textContent = 'Editar sección';
        document.getElementById('editSpecialName').value = sec.name;
        document.getElementById('editSpecialPrefix').value = sec.prefix || '';
        document.getElementById('editSpecialFrom').value = sec.from;
        document.getElementById('editSpecialTo').value = sec.to;
        document.getElementById('editSpecialShiny').value = (sec.shinyNumbers || []).join(', ');
    } else {
        title.textContent = 'Agregar sección';
        document.getElementById('editSpecialName').value = '';
        document.getElementById('editSpecialPrefix').value = '';
        document.getElementById('editSpecialFrom').value = 1;
        document.getElementById('editSpecialTo').value = 20;
        document.getElementById('editSpecialShiny').value = '';
    }

    modal.classList.remove('hidden');
}

function closeEditSpecialModal() {
    document.getElementById('editSpecialModal').classList.add('hidden');
    editingEditSpecialIdx = null;
}

function addEditSpecialSection() {
    const name = document.getElementById('editSpecialName').value.trim();
    const prefix = document.getElementById('editSpecialPrefix').value.trim().toUpperCase();
    const from = parseInt(document.getElementById('editSpecialFrom').value, 10);
    const to = parseInt(document.getElementById('editSpecialTo').value, 10);
    const shinyRaw = document.getElementById('editSpecialShiny').value.trim();
    const shinyNumbers = shinyRaw ? shinyRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];

    if (!name) { alert('El nombre es obligatorio.'); return; }
    if (isNaN(from) || isNaN(to) || from > to) {
        alert('Rango inválido.');
        return;
    }

    if (editingEditSpecialIdx !== null) {
        const sec = editSpecialSections[editingEditSpecialIdx];
        sec.name = name;
        sec.prefix = prefix;
        sec.from = from;
        sec.to = to;
        sec.shinyNumbers = shinyNumbers;
    } else {
        editSpecialSections.push({
            id: uid('sec'),
            name, prefix, from, to,
            shinyNumbers
        });
    }

    renderEditSpecialSections();
    closeEditSpecialModal();
}

// ============================================================
//  DETALLE
// ============================================================

function renderDetail() {
    const col = getCurrent();
    if (!col) return;
    const items = col.items;
    const have = items.filter(it => it.have).length;
    const total = items.length;
    const pct = total ? Math.round(have / total * 100) : 0;

    document.getElementById('dTotal').textContent = total;
    document.getElementById('dHave').textContent = have;
    document.getElementById('dMissing').textContent = total - have;
    document.getElementById('dPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';

    const coverEl = document.getElementById('detailCover');
    if (col.cover) {
        coverEl.innerHTML = `<img src="${col.cover}" alt="Tapa" />`;
    } else {
        coverEl.textContent = '📘';
    }

    const grid = document.getElementById('detailGrid');
    grid.innerHTML = '';

    for (const section of col.sections) {
        let filteredItems = col.items.filter(it => it.sectionId === section.id);
        if (filter === 'miss') filteredItems = filteredItems.filter(it => !it.have);
        if (filter === 'rep') filteredItems = filteredItems.filter(it => it.rep > 0);

        if (filteredItems.length === 0) continue;

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section.name;
        grid.appendChild(sectionTitle);

        const sectionGrid = document.createElement('div');
        sectionGrid.className = 'grid-4';

        for (const it of filteredItems) {
            const div = document.createElement('div');
            div.className = 'sticker';
            if (it.have) div.classList.add('have');
            if (it.rep > 0) {
                div.classList.add('rep');
                div.setAttribute('data-rep', it.rep > 99 ? '99+' : it.rep);
            }
            if (it.shiny) div.classList.add('shiny');
            div.textContent = it.label;

            let startX = 0, startY = 0, isSwiping = false;
            let longPressTimer = null;
            let longPressFired = false;

            const onTouchStart = (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                isSwiping = false;
                longPressFired = false;
                longPressTimer = setTimeout(() => {
                    longPressFired = true;
                    handleLongPress(it);
                }, 500);
            };

            const onTouchMove = (e) => {
                if (!startX || !startY) return;
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - startX);
                const deltaY = Math.abs(touch.clientY - startY);
                if (deltaX > 10 || deltaY > 10) {
                    isSwiping = true;
                    clearTimeout(longPressTimer);
                }
            };

            const onTouchEnd = () => {
                clearTimeout(longPressTimer);
                if (!isSwiping && !longPressFired) handleTap(it);
            };

            div.addEventListener('touchstart', onTouchStart, { passive: true });
            div.addEventListener('touchmove', onTouchMove, { passive: true });
            div.addEventListener('touchend', onTouchEnd, { passive: true });

            let mouseDown = false;
            div.addEventListener('mousedown', () => { mouseDown = true; });
            div.addEventListener('mouseup', () => {
                if (mouseDown) { mouseDown = false; handleTap(it); }
            });
            div.addEventListener('mouseleave', () => { mouseDown = false; });

            sectionGrid.appendChild(div);
        }

        grid.appendChild(sectionGrid);
    }
}

function handleTap(it) {
    if (!it.have) {
        it.have = true;
        it.rep = 0;
        save();
        renderDetail();
        updateStats();
        return;
    }
    it.rep = (it.rep || 0) + 1;
    save();
    renderDetail();
    updateStats();
}

function handleLongPress(it) {
    if (!it.have) return;
    if (it.rep > 0) {
        it.rep--;
        save();
        renderDetail();
        updateStats();
        return;
    }
    document.getElementById('confirmMsg').textContent = `¿Quitar "${it.label}"? (no es repetida)`;
    document.getElementById('confirmModal').classList.remove('hidden');
    confirmCallback = () => {
        it.have = false;
        it.rep = 0;
        save();
        renderDetail();
        updateStats();
        document.getElementById('confirmModal').classList.add('hidden');
    };
}

document.querySelectorAll('.tab').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        filter = el.getAttribute('data-filter');
        renderDetail();
    });
});

// ============================================================
//  CREAR COLECCIÓN
// ============================================================

function renderSpecialSections() {
    const container = document.getElementById('specialList');
    container.innerHTML = '';
    for (const sec of specialSections) {
        const div = document.createElement('div');
        div.className = 'special-item';
        const rango = sec.prefix
            ? `${sec.prefix}${sec.from} a ${sec.prefix}${sec.to}`
            : `${sec.from} a ${sec.to}`;
        div.innerHTML = `
            <span class="special-info" data-idx="${specialSections.indexOf(sec)}" style="cursor:pointer;flex:1;">
                <strong>${sec.name}</strong> → ${rango}
            </span>
            <button class="remove" data-idx="${specialSections.indexOf(sec)}">✕</button>
        `;
        container.appendChild(div);
    }

    container.querySelectorAll('.special-info').forEach(span => {
        span.addEventListener('click', () => {
            const idx = parseInt(span.getAttribute('data-idx'), 10);
            openSpecialModal(idx);
        });
    });

    container.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            specialSections.splice(idx, 1);
            renderSpecialSections();
        });
    });
}

function createCollection() {
    const name = document.getElementById('createName').value.trim();
    const from = parseInt(document.getElementById('numFrom').value, 10);
    const to = parseInt(document.getElementById('numTo').value, 10);
    const shinyRaw = document.getElementById('shinyInput').value.trim();
    const shinyNumbers = shinyRaw ? shinyRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];

    if (!name) { alert('El nombre es obligatorio.'); return; }
    if (isNaN(from) || isNaN(to) || from > to) {
        alert('Rango inválido. Asegúrate de que "Desde" sea menor o igual que "Hasta".');
        return;
    }

    const col = {
        id: uid(),
        name: name,
        cover: coverDataUrl || null,
        items: [],
        sections: []
    };

    const baseSection = {
        id: uid('sec'),
        name: 'General',
        prefix: '',
        ownNumbering: false,
        format: 'num',
        specials: []
    };
    col.sections.push(baseSection);

    const shinySet = new Set(shinyNumbers);
    for (let i = from; i <= to; i++) {
        col.items.push({
            id: uid('it'),
            sectionId: baseSection.id,
            num: i,
            label: String(i),
            have: false,
            rep: 0,
            special: false,
            shiny: shinySet.has(i)
        });
    }

    for (const sec of specialSections) {
        const section = {
            id: uid('sec'),
            name: sec.name,
            prefix: sec.prefix,
            ownNumbering: true,
            format: 'alfa',
            specials: []
        };
        col.sections.push(section);

        const shinySetSpecial = new Set(sec.shinyNumbers || []);
        for (let i = sec.from; i <= sec.to; i++) {
            col.items.push({
                id: uid('it'),
                sectionId: section.id,
                num: i,
                label: `${sec.prefix}${i}`,
                have: false,
                rep: 0,
                special: true,
                section: sec.name,
                shiny: shinySetSpecial.has(i)
            });
        }
    }

    data.collections.unshift(col);
    save();
    updateStats();
    goMain();
    renderShelf();

    document.getElementById('createName').value = '';
    document.getElementById('shinyInput').value = '';
    document.getElementById('numFrom').value = 1;
    document.getElementById('numTo').value = 100;
    specialSections = [];
    coverDataUrl = null;
    renderSpecialSections();
    document.getElementById('coverPreview').innerHTML = '📘';
    document.getElementById('coverClearBtn').style.display = 'none';
}

function openSpecialModal(idx) {
    const modal = document.getElementById('specialModal');
    const title = modal.querySelector('h3');
    editingSpecialIdx = (typeof idx === 'number') ? idx : null;

    if (editingSpecialIdx !== null) {
        const sec = specialSections[editingSpecialIdx];
        title.textContent = 'Editar sección';
        document.getElementById('specialName').value = sec.name;
        document.getElementById('specialPrefix').value = sec.prefix || '';
        document.getElementById('specialFrom').value = sec.from;
        document.getElementById('specialTo').value = sec.to;
        document.getElementById('specialShiny').value = (sec.shinyNumbers || []).join(', ');
    } else {
        title.textContent = 'Agregar sección';
        document.getElementById('specialName').value = '';
        document.getElementById('specialPrefix').value = '';
        document.getElementById('specialFrom').value = 1;
        document.getElementById('specialTo').value = 20;
        document.getElementById('specialShiny').value = '';
    }

    modal.classList.remove('hidden');
}

function closeSpecialModal() {
    document.getElementById('specialModal').classList.add('hidden');
    editingSpecialIdx = null;
}

function addSpecialSection() {
    const name = document.getElementById('specialName').value.trim();
    const prefix = document.getElementById('specialPrefix').value.trim().toUpperCase();
    const from = parseInt(document.getElementById('specialFrom').value, 10);
    const to = parseInt(document.getElementById('specialTo').value, 10);
    const shinyRaw = document.getElementById('specialShiny').value.trim();
    const shinyNumbers = shinyRaw ? shinyRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)) : [];

    if (!name) { alert('El nombre es obligatorio.'); return; }
    if (!prefix) { alert('El prefijo es obligatorio.'); return; }
    if (isNaN(from) || isNaN(to) || from > to) {
        alert('Rango inválido. Asegúrate de que "Desde" sea menor o igual que "Hasta".');
        return;
    }

    if (editingSpecialIdx !== null) {
        const sec = specialSections[editingSpecialIdx];
        sec.name = name;
        sec.prefix = prefix;
        sec.from = from;
        sec.to = to;
        sec.shinyNumbers = shinyNumbers;
    } else {
        specialSections.push({ name, prefix, from, to, shinyNumbers });
    }

    renderSpecialSections();
    closeSpecialModal();
}

function exportBackup() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-coleccion-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('lastExport').textContent = new Date().toLocaleString();
    document.getElementById('exportSize').textContent = (blob.size / 1024).toFixed(1) + ' KB';
    goMain();
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.collections) return alert('Archivo inválido.');
            if (!confirm('Reemplazar todos los datos actuales?')) return;
            data = imported;
            save();
            updateStats();
            document.getElementById('lastImport').textContent = new Date().toLocaleString();
            alert('Backup importado correctamente ✅');
            goMain();
        } catch { alert('Error al leer el archivo.'); }
    };
    reader.readAsText(file);
}

// ============================================================
//  EXPORTAR LISTAS (faltantes / repetidas)
// ============================================================

function buildExportText(mode) {
    const col = getCurrent();
    if (!col) return '';

    let lines = [];
    let totalCount = 0;

    for (const section of col.sections) {
        let filteredItems = col.items.filter(it => it.sectionId === section.id);
        if (mode === 'missing') {
            filteredItems = filteredItems.filter(it => !it.have);
        } else {
            filteredItems = filteredItems.filter(it => it.rep > 0);
        }

        if (filteredItems.length === 0) continue;

        totalCount += filteredItems.length;
        const labels = filteredItems.map(it => {
            if (typeof it.num === 'number') return it.num;
            return parseInt(it.label.replace(/^[^\d]*/, ''), 10);
        }).join(', ');
        lines.push(`*${section.name}*\n${labels}`);
    }

    if (lines.length === 0) {
        return mode === 'missing' ? '✅ No hay faltantes' : '✅ No hay repetidas';
    }

    const title = mode === 'missing' ? 'Faltantes' : 'Repetidas';
    return `📋 ${col.name} - ${title} (${totalCount})\n\n${lines.join('\n\n')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    load();
    updateStats();

    document.querySelectorAll('[data-view]').forEach(el => {
        el.addEventListener('click', () => {
            const v = el.getAttribute('data-view');
            if (v === 'main') goMain();
            else if (v === 'collections') showView('collections');
            else if (v === 'manage') showView('manage');
            else if (v === 'delete') {
                showView('delete');
                renderDeleteShelf();
            } else if (v === 'backup') showView('backup');
            else if (v === 'create') {
                specialSections = [];
                coverDataUrl = null;
                renderSpecialSections();
                document.getElementById('coverPreview').innerHTML = '📘';
                document.getElementById('coverClearBtn').style.display = 'none';
                document.getElementById('createName').value = '';
                document.getElementById('shinyInput').value = '';
                document.getElementById('numFrom').value = 1;
                document.getElementById('numTo').value = 100;
                showView('create');
            }
            else if (v === 'edit-picker') {
                showView('edit-picker');
                renderEditShelf();
            }
        });
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        const current = document.querySelector('.view.active');
        if (current) {
            const id = current.id;
            if (id === 'view-detail') {
                showView('collections');
            } else if (id === 'view-delete') {
                showView('manage');
            } else if (id === 'view-edit-picker') {
                showView('manage');
            } else if (id === 'view-edit') {
                showView('edit-picker');
                renderEditShelf();
            } else {
                goMain();
            }
        }
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        document.getElementById('confirmModal').classList.add('hidden');
        confirmCallback = null;
    });
    document.getElementById('confirmYes').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
    });

    document.getElementById('searchInput').addEventListener('input', renderShelf);

    document.getElementById('coverPickBtn').addEventListener('click', () => {
        document.getElementById('coverInput').click();
    });
    document.getElementById('coverInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            coverDataUrl = ev.target.result;
            document.getElementById('coverPreview').innerHTML = `<img src="${coverDataUrl}" alt="Tapa" />`;
            document.getElementById('coverClearBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });
    document.getElementById('coverClearBtn').addEventListener('click', () => {
        coverDataUrl = null;
        document.getElementById('coverPreview').innerHTML = '📘';
        document.getElementById('coverClearBtn').style.display = 'none';
    });

    document.getElementById('editCoverPickBtn').addEventListener('click', () => {
        document.getElementById('editCoverInput').click();
    });
    document.getElementById('editCoverInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            editCoverDataUrl = ev.target.result;
            paintEditCover();
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    });
    document.getElementById('editCoverClearBtn').addEventListener('click', () => {
        editCoverDataUrl = null;
        paintEditCover();
    });

    document.getElementById('addSpecialBtn').addEventListener('click', () => openSpecialModal(null));
    document.getElementById('specialCancelBtn').addEventListener('click', closeSpecialModal);
    document.getElementById('specialAddBtn').addEventListener('click', addSpecialSection);
    document.getElementById('specialModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeSpecialModal();
    });

    document.getElementById('editAddSpecialBtn').addEventListener('click', () => openEditSpecialModal(null));
    document.getElementById('editSpecialCancelBtn').addEventListener('click', closeEditSpecialModal);
    document.getElementById('editSpecialAddBtn').addEventListener('click', addEditSpecialSection);
    document.getElementById('editSpecialModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeEditSpecialModal();
    });

    document.getElementById('createSaveBtn').addEventListener('click', createCollection);
    document.getElementById('editSaveBtn').addEventListener('click', saveEdit);
    document.getElementById('editCancelBtn').addEventListener('click', () => {
        showView('edit-picker');
        renderEditShelf();
    });

    document.getElementById('exportBtn').addEventListener('click', exportBackup);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importInput').click();
    });
    document.getElementById('importInput').addEventListener('change', (e) => {
        if (e.target.files[0]) importBackup(e.target.files[0]);
        e.target.value = '';
    });

    document.getElementById('exportListBtn').addEventListener('click', () => {
        document.getElementById('exportModal').classList.remove('hidden');
    });
    document.getElementById('exportCancelBtn').addEventListener('click', () => {
        document.getElementById('exportModal').classList.add('hidden');
    });
    document.getElementById('exportMissingBtn').addEventListener('click', () => {
        document.getElementById('exportModal').classList.add('hidden');
        const text = buildExportText('missing');
        shareText(text);
    });
    document.getElementById('exportRepsBtn').addEventListener('click', () => {
        document.getElementById('exportModal').classList.add('hidden');
        const text = buildExportText('reps');
        shareText(text);
    });

    function shareText(text) {
        if (navigator.share) {
            navigator.share({ text: text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert('Texto copiado al portapapeles ✅');
            }).catch(() => {
                alert('No se pudo copiar. El texto es:\n\n' + text);
            });
        }
    }

    document.getElementById('completeBtn').addEventListener('click', () => {
        const col = getCurrent();
        if (!col) return;
        document.getElementById('confirmMsg').textContent = `¿Marcar todas las figuritas de "${col.name}" como "Tengo"?`;
        document.getElementById('confirmModal').classList.remove('hidden');
        confirmCallback = () => {
            for (const it of col.items) {
                it.have = true;
                it.rep = 0;
            }
            save();
            renderDetail();
            updateStats();
            document.getElementById('confirmModal').classList.add('hidden');
        };
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
        const col = getCurrent();
        if (!col) return;
        document.getElementById('confirmMsg').textContent = `¿Desmarcar TODAS las figuritas de "${col.name}"?`;
        document.getElementById('confirmModal').classList.remove('hidden');
        confirmCallback = () => {
            for (const it of col.items) {
                it.have = false;
                it.rep = 0;
            }
            save();
            renderDetail();
            updateStats();
            document.getElementById('confirmModal').classList.add('hidden');
        };
    });

    const lastId = localStorage.getItem(LAST_KEY);
    if (lastId) {
        const col = data.collections.find(c => c.id === lastId);
        if (col) {
            goDetail(lastId);
            return;
        }
    }

    goMain();
});
