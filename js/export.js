// === Preview de Etiquetas ===

function renderLabelPreviews() {
  const container = document.getElementById('labels-preview');
  document.getElementById('label-count').textContent = App.generatedLabels.length;

  if (App.generatedLabels.length === 0) {
    container.innerHTML = '<p style="color:#888">Nenhuma etiqueta gerada.</p>';
    return;
  }

  container.innerHTML = App.generatedLabels.map((lbl, i) => {
    const fieldsHtml = lbl.resolvedFields.map(f => {
      if (f.label) {
        return `<div class="label-field">
          <span class="label-field-label">${escapeHtml(f.label)}:</span>
          <span class="label-field-value">${escapeHtml(f.value)}</span>
        </div>`;
      } else {
        return `<div class="label-field">
          <span class="label-field-value">${escapeHtml(f.value)}</span>
        </div>`;
      }
    }).join('');

    return `<div class="label-card">
      <div class="label-header">#${i + 1} - ${escapeHtml(lbl.addressPersonName)}</div>
      <div class="label-size">${lbl.labelSize.width}x${lbl.labelSize.height}mm</div>
      ${fieldsHtml}
    </div>`;
  }).join('');
}

// === Exportação CSV ===

function exportToCSV() {
  if (App.generatedLabels.length === 0) {
    showNotification('Nenhuma etiqueta para exportar', 'error');
    return;
  }

  // Coleta todos os nomes de campos únicos
  const allFieldLabels = new Set();
  App.generatedLabels.forEach(lbl => {
    lbl.resolvedFields.forEach((f, i) => {
      const key = f.label || `Campo_${i + 1}`;
      allFieldLabels.add(key);
    });
  });

  const fieldColumns = [...allFieldLabels];

  // Monta cabeçalho
  const headers = ['orderId', 'addressPersonName', 'produto_csv', 'mapeamento', 'largura_mm', 'altura_mm', ...fieldColumns];

  // Monta linhas
  const rows = App.generatedLabels.map(lbl => {
    const base = [
      lbl.orderId,
      lbl.addressPersonName,
      lbl.prod,
      lbl.mappingName,
      lbl.labelSize.width,
      lbl.labelSize.height
    ];

    const fieldValues = fieldColumns.map(col => {
      const field = lbl.resolvedFields.find(f => (f.label || `Campo_${lbl.resolvedFields.indexOf(f) + 1}`) === col);
      return field ? field.value : '';
    });

    return [...base, ...fieldValues];
  });

  // Gera CSV com Papa Parse
  const csvContent = Papa.unparse({
    fields: headers,
    data: rows
  }, {
    delimiter: ';'
  });

  // Download
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `etiquetas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('CSV exportado!', 'success');
}
