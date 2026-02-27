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

  let html = '';
  activeResults.forEach((r, i) => {
    const m = r.mapping;
    const fillableFields = m.fields.filter(f => f.type === 'user_batch' || f.type === 'user_label');
    const autoFields = m.fields.filter(f => f.type === 'auto');

    html += `<div class="fill-group">
      <h4>#${i + 1} - ${escapeHtml(r.row.addressPersonName || 'Sem nome')}
        <span style="font-weight:normal;font-size:13px;color:#888"> — ${escapeHtml(m.name)}</span>
      </h4>`;

    // Campos automáticos - preview
    if (autoFields.length > 0) {
      html += '<div class="auto-preview">';
      autoFields.forEach(f => {
        const val = resolveAutoField(f);
        html += `<div><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(val)}</div>`;
      });
      html += '</div>';
    }

    // Campos preenchíveis (cada linha tem os seus)
    fillableFields.forEach(f => {
      const prevVal = App.labelInputs[r.index]?.[f.id] || '';
      html += `<div class="form-group">
        <label>${escapeHtml(f.label)}</label>
        <input type="text" data-row="${r.index}" data-field="${f.id}" data-input-type="label"
               placeholder="${escapeHtml(f.placeholder || '')}" value="${escapeHtml(prevVal)}">
      </div>`;
    });

    if (fillableFields.length === 0) {
      html += '<p style="color:#888;font-size:13px">Todos os campos são fixos ou automáticos.</p>';
    }

    html += '</div>';
  });

  container.innerHTML = html;
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
      labelSize: m.labelSize,
      resolvedFields
    });
  });
}
