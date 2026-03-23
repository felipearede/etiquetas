// === Match de Produtos ===

function matchProducts() {
  App.matchResults = App.csvRows.map((row, index) => {
    const mapping = findMappingForProduct(row.prod);
    return {
      index,
      row,
      mapping,
      status: mapping ? 'matched' : 'unmatched'
    };
  });

  renderMatchResults();
}

function renderMatchResults() {
  const table = document.getElementById('match-table');
  const matched = App.matchResults.filter(r => r.status === 'matched').length;
  const skipped = App.matchResults.filter(r => r.status === 'skipped').length;
  const total = App.matchResults.length;

  document.getElementById('match-summary').textContent =
    `${matched} de ${total} produtos mapeados` + (skipped > 0 ? ` (${skipped} pulados)` : '');

  let html = '<thead><tr><th>#</th><th>Nome</th><th>Produto</th><th>Mapeamento</th><th>Ações</th></tr></thead><tbody>';
  App.matchResults.forEach((r, i) => {
    const statusHtml = r.status === 'matched'
      ? `<span class="badge badge-ok">${escapeHtml(r.mapping.name)}</span>`
      : r.status === 'skipped'
        ? '<span class="badge badge-skip">Pulado</span>'
        : '<span class="badge badge-err">Sem mapeamento</span>';

    const actionsHtml = r.status === 'unmatched'
      ? `<button class="btn btn-small btn-primary" onclick="createMappingFromMatch(${i})">Criar</button>
         <button class="btn btn-small btn-secondary" onclick="skipMatch(${i})">Pular</button>`
      : r.status === 'skipped'
        ? `<button class="btn btn-small btn-secondary" onclick="unskipMatch(${i})">Desfazer</button>`
        : '';

    html += `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.row.addressPersonName || '-')}</td>
      <td style="font-size:12px">${escapeHtml(r.row.prod || '-')}</td>
      <td>${statusHtml}</td>
      <td>${actionsHtml}</td>
    </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;

  updateContinueButton();
}

function createMappingFromMatch(index) {
  const prod = App.matchResults[index].row.prod;
  openMappingEditor(null, prod);
}

function skipMatch(index) {
  App.matchResults[index].status = 'skipped';
  renderMatchResults();
}

function unskipMatch(index) {
  // Tenta re-match
  const mapping = findMappingForProduct(App.matchResults[index].row.prod);
  App.matchResults[index].status = mapping ? 'matched' : 'unmatched';
  App.matchResults[index].mapping = mapping;
  renderMatchResults();
}

function updateContinueButton() {
  const hasUnmatched = App.matchResults.some(r => r.status === 'unmatched');
  document.getElementById('btn-continue-fill').disabled = hasUnmatched;
}

// === Preenchimento de Campos ===

function renderFillGroups() {
  const container = document.getElementById('fill-groups');
  const activeResults = App.matchResults.filter(r => r.status === 'matched');

  if (activeResults.length === 0) {
    container.innerHTML = '<p style="color:#888">Nenhum produto para preencher.</p>';
    return;
  }

  // Agrupar por mapeamento
  const groups = {};
  activeResults.forEach(r => {
    const key = r.mapping.id;
    if (!groups[key]) {
      groups[key] = { mapping: r.mapping, items: [] };
    }
    groups[key].items.push(r);
  });

  let html = '';
  let globalIndex = 0;

  Object.values(groups).forEach(group => {
    const m = group.mapping;
    const fillableFields = m.fields.filter(f => f.type === 'user_batch' || f.type === 'user_label');

    // Pular grupo se não tem campos para preencher
    if (fillableFields.length === 0) {
      globalIndex += group.items.length;
      return;
    }

    const autoFields = m.fields.filter(f => f.type === 'auto');

    // Cabeçalho do grupo (produto)
    html += `<div class="fill-product-group">
      <div class="fill-product-header">
        <span class="fill-product-name">${escapeHtml(m.name)}</span>
        <span class="fill-product-count">${group.items.length} etiqueta(s)</span>
      </div>`;

    // Campos automáticos - preview (uma vez por grupo)
    if (autoFields.length > 0) {
      html += '<div class="auto-preview">';
      autoFields.forEach(f => {
        const val = resolveAutoField(f);
        html += `<div><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(val)}</div>`;
      });
      html += '</div>';
    }

    // Cada paciente dentro do grupo
    group.items.forEach(r => {
      globalIndex++;

      html += `<div class="fill-group">
        <h4>#${globalIndex} - ${escapeHtml(r.row.addressPersonName || 'Sem nome')}</h4>`;

      fillableFields.forEach(f => {
        const prevVal = App.labelInputs[r.index]?.[f.id] || '';
        html += `<div class="form-group autocomplete-wrap">
          <label>${escapeHtml(f.label)}</label>
          <input type="text" data-row="${r.index}" data-field="${f.id}" data-input-type="label"
                 data-field-label="${escapeHtml(f.label)}"
                 placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(prevVal)}"
                 autocomplete="off" class="autocomplete-field">
          <div class="ac-dropdown"></div>
        </div>`;
      });

      html += '</div>';
    });

    html += '</div>';
  });

  container.innerHTML = html;

  // Attach autocomplete listeners
  setupAutocomplete(container);
}

function setupAutocomplete(container) {
  let activeDropdown = null;

  function closeAllDropdowns() {
    container.querySelectorAll('.ac-dropdown.ac-open').forEach(d => {
      d.classList.remove('ac-open');
      d.innerHTML = '';
    });
    activeDropdown = null;
  }

  container.querySelectorAll('.autocomplete-field').forEach(input => {
    const dropdown = input.nextElementSibling;
    let selectedIdx = -1;

    function getSuggestions() {
      const fieldLabel = input.dataset.fieldLabel;
      const currentRow = input.dataset.row;
      const typed = input.value.toLowerCase().trim();
      const values = new Set();

      container.querySelectorAll(`.autocomplete-field[data-field-label="${fieldLabel}"]`).forEach(other => {
        if (other.dataset.row !== currentRow && other.value.trim()) {
          values.add(other.value.trim());
        }
      });

      return [...values].filter(v =>
        !typed || v.toLowerCase().includes(typed)
      ).sort();
    }

    function showDropdown() {
      const suggestions = getSuggestions();
      if (suggestions.length === 0) {
        closeAllDropdowns();
        return;
      }

      selectedIdx = -1;
      dropdown.innerHTML = suggestions.map((v, i) =>
        `<div class="ac-item" data-index="${i}">${escapeHtml(v)}</div>`
      ).join('');
      dropdown.classList.add('ac-open');
      activeDropdown = dropdown;

      // Click handler for items
      dropdown.querySelectorAll('.ac-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = item.textContent;
          closeAllDropdowns();
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    }

    input.addEventListener('input', showDropdown);
    input.addEventListener('focus', showDropdown);

    input.addEventListener('blur', () => {
      setTimeout(closeAllDropdowns, 150);
    });

    input.addEventListener('keydown', (e) => {
      if (!dropdown.classList.contains('ac-open')) return;
      const items = dropdown.querySelectorAll('.ac-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
        items.forEach((it, i) => it.classList.toggle('ac-active', i === selectedIdx));
        items[selectedIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        items.forEach((it, i) => it.classList.toggle('ac-active', i === selectedIdx));
        items[selectedIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault();
        input.value = items[selectedIdx].textContent;
        closeAllDropdowns();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('autocomplete-field')) {
      closeAllDropdowns();
    }
  });
}

function collectFillInputs() {
  App.labelInputs = {};
  document.querySelectorAll('[data-input-type="label"]').forEach(input => {
    const rowIdx = input.dataset.row;
    const fieldId = input.dataset.field;
    if (!App.labelInputs[rowIdx]) App.labelInputs[rowIdx] = {};
    App.labelInputs[rowIdx][fieldId] = input.value;
  });
}

// === Resolução de campos automáticos ===

function resolveAutoField(field) {
  const now = new Date();
  if (field.autoType === 'today') {
    return formatDate(now);
  }
  if (field.autoType === 'today_plus_months') {
    return formatDate(addMonths(now, field.monthsToAdd || 3));
  }
  return '';
}

// === Geração Final de Etiquetas ===

function generateLabels() {
  App.generatedLabels = [];

  App.matchResults.forEach(r => {
    if (r.status !== 'matched') return;

    const m = r.mapping;
    const resolvedFields = m.fields.map(f => {
      let value = '';
      const label = f.label || '';

      if (f.type === 'fixed') {
        value = f.value || '';
      } else if (f.type === 'auto') {
        value = resolveAutoField(f);
      } else if (f.type === 'user_batch' || f.type === 'user_label') {
        value = App.labelInputs[r.index]?.[f.id] || '';
      }

      return { label, value };
    });

    App.generatedLabels.push({
      orderId: r.row.orderId || '',
      addressPersonName: r.row.addressPersonName || '',
      prod: r.row.prod || '',
      mappingName: m.name,
      mappingId: m.id,
      labelSize: m.labelSize,
      resolvedFields
    });
  });

  // Ordenar: primeiro por mapeamento, depois por genética (se tiver)
  App.generatedLabels.sort((a, b) => {
    if (a.mappingName !== b.mappingName) {
      return a.mappingName.localeCompare(b.mappingName);
    }
    const genA = getFieldValue(a, 'genética') || getFieldValue(a, 'genetica') || '';
    const genB = getFieldValue(b, 'genética') || getFieldValue(b, 'genetica') || '';
    if (genA !== genB) {
      return genA.localeCompare(genB);
    }
    // Sub-agrupar por volume também
    const volA = getFieldValue(a, 'volume') || '';
    const volB = getFieldValue(b, 'volume') || '';
    return volA.localeCompare(volB);
  });
}

// === Utilitário: buscar valor de campo por label ===
function getFieldValue(label, fieldLabel) {
  const field = label.resolvedFields.find(f =>
    f.label.toLowerCase() === fieldLabel.toLowerCase()
  );
  return field ? field.value : '';
}
