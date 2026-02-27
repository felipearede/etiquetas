// === Carregar mapeamentos ===
async function loadMappings() {
  try {
    const resp = await fetch('/api/mappings');
    if (resp.ok) {
      App.mappings = await resp.json();
      return;
    }
  } catch (e) {
    console.warn('API indisponível, tentando mappings.json:', e);
  }

  // Fallback: carrega do arquivo estático
  try {
    const resp = await fetch('mappings.json');
    if (resp.ok) {
      App.mappings = await resp.json();
      return;
    }
  } catch (e) {
    console.warn('Não foi possível carregar mappings.json:', e);
  }

  App.mappings = [];
}

async function saveMappingsToServer() {
  try {
    const resp = await fetch('/api/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(App.mappings)
    });
    if (!resp.ok) throw new Error('Erro ao salvar');
    return true;
  } catch (e) {
    console.error('Erro ao salvar mapeamentos:', e);
    showNotification('Erro ao salvar no servidor', 'error');
    return false;
  }
}

// === CRUD ===
async function createMapping(data) {
  data.id = generateId();
  App.mappings.push(data);
  await saveMappingsToServer();
  return data;
}

async function updateMapping(id, data) {
  const idx = App.mappings.findIndex(m => m.id === id);
  if (idx === -1) return;
  data.id = id;
  App.mappings[idx] = data;
  await saveMappingsToServer();
}

async function deleteMapping(id) {
  App.mappings = App.mappings.filter(m => m.id !== id);
  await saveMappingsToServer();
}

// === Pattern matching ===
function findMappingForProduct(prodText) {
  if (!prodText) return null;
  const normalized = prodText.toLowerCase().trim();
  const matches = App.mappings
    .filter(m => normalized.includes(m.pattern.toLowerCase().trim()))
    .sort((a, b) => b.pattern.length - a.pattern.length);
  return matches[0] || null;
}

// === UI: Lista de Mapeamentos ===
function renderMappingList() {
  const container = document.getElementById('mapping-list');
  if (App.mappings.length === 0) {
    container.innerHTML = '<p style="color:#888;margin-bottom:12px;">Nenhum mapeamento cadastrado.</p>';
  } else {
    container.innerHTML = App.mappings.map(m => `
      <div class="mapping-item">
        <div class="mapping-item-info">
          <div class="mapping-item-name">${escapeHtml(m.name)}</div>
          <div class="mapping-item-pattern">Busca: "${escapeHtml(m.pattern)}"</div>
          <div class="mapping-item-size">${m.labelSize.width}x${m.labelSize.height}mm | ${m.fields.length} campos</div>
        </div>
        <div class="mapping-item-actions">
          <button class="btn btn-small btn-secondary" onclick="openMappingEditor('${m.id}')">Editar</button>
          <button class="btn btn-small btn-secondary" onclick="duplicateMapping('${m.id}')">Duplicar</button>
          <button class="btn btn-small btn-danger" onclick="confirmDeleteMapping('${m.id}')">Excluir</button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btn-new-mapping').onclick = () => openMappingEditor(null);
}

async function duplicateMapping(id) {
  const original = App.mappings.find(x => x.id === id);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.name = original.name + ' - cópia';
  copy.fields.forEach(f => { f.id = generateId(); });
  await createMapping(copy);
  renderMappingList();
  showNotification('Mapeamento duplicado', 'success');
}

function confirmDeleteMapping(id) {
  const m = App.mappings.find(x => x.id === id);
  if (confirm(`Excluir mapeamento "${m?.name}"?`)) {
    deleteMapping(id);
    renderMappingList();
    showNotification('Mapeamento excluído', 'success');
  }
}

// === UI: Modal de Edição ===
let editingMappingId = null;
let modalFields = [];

function openMappingEditor(id, prefillPattern) {
  editingMappingId = id;
  const modal = document.getElementById('mapping-modal');

  if (id) {
    const m = App.mappings.find(x => x.id === id);
    document.getElementById('modal-title').textContent = 'Editar Mapeamento';
    document.getElementById('map-name').value = m.name;
    document.getElementById('map-pattern').value = m.pattern;
    document.getElementById('map-width').value = m.labelSize.width;
    document.getElementById('map-height').value = m.labelSize.height;
    modalFields = JSON.parse(JSON.stringify(m.fields));
  } else {
    document.getElementById('modal-title').textContent = 'Novo Mapeamento';
    document.getElementById('map-name').value = '';
    document.getElementById('map-pattern').value = prefillPattern || '';
    document.getElementById('map-width').value = 100;
    document.getElementById('map-height').value = 100;
    modalFields = [];
  }

  renderFieldsEditor();
  modal.classList.remove('hidden');

  document.getElementById('btn-close-modal').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-cancel-mapping').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-add-field').onclick = addFieldToEditor;
  document.getElementById('btn-save-mapping').onclick = saveMappingFromModal;
}

function renderFieldsEditor() {
  const container = document.getElementById('fields-editor');
  container.innerHTML = modalFields.map((f, i) => `
    <div class="field-item" data-index="${i}">
      <select class="field-type" onchange="onFieldTypeChange(${i}, this.value)">
        <option value="fixed" ${f.type === 'fixed' ? 'selected' : ''}>Texto fixo</option>
        <option value="auto" ${f.type === 'auto' ? 'selected' : ''}>Auto (data)</option>
        <option value="user_batch" ${f.type === 'user_batch' ? 'selected' : ''}>Preench. lote</option>
        <option value="user_label" ${f.type === 'user_label' ? 'selected' : ''}>Preench. individual</option>
      </select>
      <input class="field-label" placeholder="Rótulo" value="${escapeHtml(f.label || '')}" onchange="modalFields[${i}].label = this.value">
      ${fieldValueInput(f, i)}
      <button class="btn-remove" onclick="removeFieldFromEditor(${i})">&times;</button>
    </div>
  `).join('');
}

function fieldValueInput(f, i) {
  if (f.type === 'fixed') {
    return `<input class="field-value" placeholder="Valor fixo" value="${escapeHtml(f.value || '')}" onchange="modalFields[${i}].value = this.value">`;
  }
  if (f.type === 'auto') {
    return `
      <select class="field-value" onchange="onAutoTypeChange(${i}, this.value)">
        <option value="today" ${f.autoType === 'today' ? 'selected' : ''}>Data de hoje</option>
        <option value="today_plus_months" ${f.autoType === 'today_plus_months' ? 'selected' : ''}>Hoje + meses</option>
      </select>
      ${f.autoType === 'today_plus_months' ? `<input type="number" style="width:60px" value="${f.monthsToAdd || 3}" min="1" onchange="modalFields[${i}].monthsToAdd = parseInt(this.value)">` : ''}
    `;
  }
  if (f.type === 'user_batch' || f.type === 'user_label') {
    return `<input class="field-value" placeholder="Placeholder (dica)" value="${escapeHtml(f.placeholder || '')}" onchange="modalFields[${i}].placeholder = this.value">`;
  }
  return '';
}

function onFieldTypeChange(index, newType) {
  modalFields[index].type = newType;
  if (newType === 'auto') {
    modalFields[index].autoType = modalFields[index].autoType || 'today';
    modalFields[index].monthsToAdd = modalFields[index].monthsToAdd || 3;
  }
  renderFieldsEditor();
}

function onAutoTypeChange(index, val) {
  modalFields[index].autoType = val;
  modalFields[index].monthsToAdd = modalFields[index].monthsToAdd || 3;
  renderFieldsEditor();
}

function addFieldToEditor() {
  modalFields.push({
    id: generateId(),
    type: 'fixed',
    label: '',
    value: ''
  });
  renderFieldsEditor();
}

function removeFieldFromEditor(index) {
  modalFields.splice(index, 1);
  renderFieldsEditor();
}

async function saveMappingFromModal() {
  const name = document.getElementById('map-name').value.trim();
  const pattern = document.getElementById('map-pattern').value.trim();
  const width = parseInt(document.getElementById('map-width').value);
  const height = parseInt(document.getElementById('map-height').value);

  if (!name || !pattern) {
    showNotification('Preencha nome e pattern', 'error');
    return;
  }

  // Garante ids únicos nos campos
  modalFields.forEach(f => {
    if (!f.id) f.id = generateId();
  });

  const data = {
    name, pattern,
    labelSize: { width, height },
    fields: modalFields
  };

  if (editingMappingId) {
    await updateMapping(editingMappingId, data);
    showNotification('Mapeamento atualizado', 'success');
  } else {
    await createMapping(data);
    showNotification('Mapeamento criado', 'success');
  }

  document.getElementById('mapping-modal').classList.add('hidden');
  renderMappingList();

  // Se estamos na etapa de match, re-processa
  if (App.currentStep === 'match') {
    matchProducts();
  }
}

// === Exportar JSON ===
function exportMappingsJson() {
  const json = JSON.stringify(App.mappings, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mappings.json';
  a.click();
  URL.revokeObjectURL(url);
  showNotification('JSON exportado!', 'info');
}
