// === Preview de Etiquetas ===

function renderLabelPreviews() {
  const container = document.getElementById('labels-preview');
  document.getElementById('label-count').textContent = App.generatedLabels.length;

  if (App.generatedLabels.length === 0) {
    container.innerHTML = '<p style="color:#888">Nenhuma etiqueta gerada.</p>';
    return;
  }

  let html = '';
  let lastGenetica = null;

  App.generatedLabels.forEach((lbl, i) => {
    // Inserir cabeçalho de grupo quando muda a genética
    const currentGenetica = getGeneticaValue(lbl);
    const displayGenetica = currentGenetica || '(sem genética)';

    if (currentGenetica !== lastGenetica) {
      const groupCount = App.generatedLabels.filter(l => getGeneticaValue(l) === currentGenetica).length;
      html += `<div class="group-header">
        <span class="group-header-name">🧬 ${escapeHtml(displayGenetica)}</span>
        <span class="group-header-count">${groupCount} etiqueta(s)</span>
      </div>`;
      lastGenetica = currentGenetica;
    }

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

    html += `<div class="label-card">
      <div class="label-header">#${i + 1} - ${escapeHtml(lbl.addressPersonName)}</div>
      <div class="label-size">${lbl.labelSize.width}x${lbl.labelSize.height}mm · ${escapeHtml(lbl.mappingName)}</div>
      ${fieldsHtml}
    </div>`;
  });

  container.innerHTML = html;
}

// === Impressão Direta de Etiquetas ===

function printLabels() {
  if (App.generatedLabels.length === 0) {
    showNotification('Nenhuma etiqueta para imprimir', 'error');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showNotification('Pop-up bloqueado! Permita pop-ups para imprimir.', 'error');
    return;
  }

  // Determine the label size (use the first label's size for @page)
  // For roll printers, all labels on a roll are typically the same size
  const defaultW = App.generatedLabels[0].labelSize.width;
  const defaultH = App.generatedLabels[0].labelSize.height;

  const labelsHtml = App.generatedLabels.map((lbl, i) => {
    const w = lbl.labelSize.width;
    const h = lbl.labelSize.height;

    const fieldsHtml = lbl.resolvedFields.map(f => {
      if (f.label) {
        return `<div class="field">
          <span class="field-label">${escapeHtml(f.label)}:</span>
          <span class="field-value">${escapeHtml(f.value)}</span>
        </div>`;
      } else {
        return `<div class="field">
          <span class="field-value field-value-solo">${escapeHtml(f.value)}</span>
        </div>`;
      }
    }).join('');

    return `<div class="etiqueta" style="width:${w}mm; height:${h}mm;">
      <div class="etiqueta-content">
        ${fieldsHtml}
        <div class="field field-nome">
          <span class="field-label">Paciente:</span>
          <span class="field-value">${escapeHtml(lbl.addressPersonName)}</span>
        </div>
      </div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Imprimir Etiquetas</title>
  <style>
    /* === @page: define o tamanho da "folha" como o tamanho da etiqueta === */
    @page {
      size: ${defaultW}mm ${defaultH}mm;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f0f0f0;
      padding: 20px;
    }

    .controls {
      background: #fff;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .controls h2 {
      font-size: 18px;
      color: #333;
      margin-right: auto;
    }

    .controls button {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-print {
      background: #2563eb;
      color: #fff;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }

    .btn-close {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-close:hover {
      background: #d1d5db;
    }

    .aviso-papel {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 20px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #92400e;
      line-height: 1.6;
      text-align: center;
    }

    .labels-container {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    }

    .etiqueta {
      background: #fff;
      border: 1px dashed #aaa;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2mm;
      overflow: hidden;
    }

    .etiqueta-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.8mm;
      overflow: hidden;
    }

    .field {
      display: flex;
      align-items: baseline;
      gap: 1mm;
      flex-wrap: wrap;
    }

    .field-label {
      font-size: 2.2mm;
      font-weight: bold;
      color: #333;
      flex-shrink: 0;
    }

    .field-value {
      font-size: 2.4mm;
      color: #111;
    }

    .field-value-solo {
      font-size: 3mm;
      font-weight: bold;
      text-align: center;
      width: 100%;
    }

    .etiqueta-footer {
      border-top: 0.3px solid #ccc;
      padding-top: 0.5mm;
      margin-top: 0.5mm;
    }

    .etiqueta-nome {
      font-size: 2mm;
      color: #666;
      display: block;
    }

    /* ======= ESTILOS DE IMPRESSÃO - IMPRESSORA DE ROLO ======= */
    @media print {
      html {
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }

      body {
        background: none;
        padding: 0;
        margin: 0;
        width: ${defaultW}mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        zoom: 1;
      }

      .controls, .aviso-papel {
        display: none !important;
      }

      .labels-container {
        display: block;
        gap: 0;
      }

      .etiqueta {
        border: none;
        margin: 0;
        padding: 2mm;
        width: ${defaultW}mm !important;
        height: ${defaultH}mm !important;
        page-break-after: always;
        page-break-inside: avoid;
        break-after: page;
        break-inside: avoid;
      }

      /* Remove page break da última etiqueta */
      .etiqueta:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="controls">
    <h2>🏷️ ${App.generatedLabels.length} etiqueta(s) para imprimir</h2>
    <button class="btn-print" onclick="confirmarImpressao()">🖨️ Imprimir (Ctrl+P)</button>
    <button class="btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <div class="aviso-papel">
    ⚠️ <strong>IMPORTANTE:</strong> Na janela de impressão, selecione o tamanho do papel como <strong>"USER"</strong> (${defaultW}×${defaultH}mm).
    <br>Impressora: <strong>ELGIN</strong> · Margens: <strong>Nenhuma</strong> · Escala: <strong>100%</strong>
  </div>

  <div class="labels-container">
    ${labelsHtml}
  </div>

  <script>
    function confirmarImpressao() {
      var ok = confirm(
        'ATENÇÃO — Antes de imprimir, verifique:\\n\\n' +
        '✅ Tamanho do papel: "USER" (${defaultW}×${defaultH}mm)\\n' +
        '✅ Impressora: ELGIN\\n' +
        '✅ Margens: Nenhuma\\n' +
        '✅ Escala: 100%\\n\\n' +
        'Clique OK para abrir a impressão.'
      );
      if (ok) window.print();
    }

    // Auto-abre o alerta de confirmação quando a página carrega
    window.addEventListener('load', function() {
      setTimeout(confirmarImpressao, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();

  showNotification('Janela de impressão aberta!', 'success');
}

// Mantém exportCSV como opção secundária
function exportToCSV() {
  if (App.generatedLabels.length === 0) {
    showNotification('Nenhuma etiqueta para exportar', 'error');
    return;
  }

  const allFieldLabels = new Set();
  App.generatedLabels.forEach(lbl => {
    lbl.resolvedFields.forEach((f, i) => {
      const key = f.label || `Campo_${i + 1}`;
      allFieldLabels.add(key);
    });
  });

  const fieldColumns = [...allFieldLabels];

  const headers = ['orderId', 'addressPersonName', 'produto_csv', 'mapeamento', 'largura_mm', 'altura_mm', ...fieldColumns];

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

  const csvContent = Papa.unparse({
    fields: headers,
    data: rows
  }, {
    delimiter: ';'
  });

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

// === Relatório de Resumo ===

function printReport() {
  if (App.generatedLabels.length === 0) {
    showNotification('Nenhuma etiqueta para gerar relatório', 'error');
    return;
  }

  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    showNotification('Pop-up bloqueado! Permita pop-ups para gerar o relatório.', 'error');
    return;
  }

  // Agrupar tudo em lista plana: por genética (flores) ou por nome do produto (óleos)
  const flatGroups = {};

  App.generatedLabels.forEach(lbl => {
    const genetica = getGeneticaValue(lbl);
    const volumeField = findVolumeField(lbl);

    if (genetica) {
      // Tem genética → agrupar por nome da genética
      const key = genetica;
      if (!flatGroups[key]) {
        flatGroups[key] = { name: key, labels: [], type: 'genetica', volumeField };
      }
      flatGroups[key].labels.push(lbl);
    } else {
      // Sem genética (óleo, etc) → agrupar por nome do mapeamento/produto
      const key = lbl.mappingName;
      if (!flatGroups[key]) {
        flatGroups[key] = { name: key, labels: [], type: 'produto', volumeField };
      }
      flatGroups[key].labels.push(lbl);
    }
  });

  // Gerar HTML do relatório
  const today = formatDate(new Date());
  let reportBodyHtml = '';

  // Ordenar por nome
  Object.keys(flatGroups).sort().forEach(key => {
    const group = flatGroups[key];
    const labelCount = group.labels.length;
    let quantityText = '';

    if (group.type === 'genetica') {
      // Somar peso/volume total — busca campo de volume em CADA etiqueta individualmente
      let totalVol = 0;
      let foundAny = false;
      let unit = '';

      group.labels.forEach(lbl => {
        const volFieldLabel = findVolumeField(lbl);
        if (volFieldLabel) {
          const val = getFieldValue(lbl, volFieldLabel);
          const num = parseFloat(val.replace(/[^0-9.,]/g, '').replace(',', '.'));
          if (!isNaN(num)) {
            totalVol += num;
            foundAny = true;
            if (!unit) unit = extractUnit(val);
          }
        }
      });

      quantityText = foundAny ? `${totalVol}${unit}` : `${labelCount} unidade(s)`;
    } else {
      quantityText = `${labelCount} unidade(s)`;
    }

    reportBodyHtml += `
      <div class="report-item">
        <span class="report-item-name">${escapeHtml(group.name)}</span>
        <span class="report-item-quantity">${quantityText}</span>
        <span class="report-item-detail">${labelCount} etiqueta(s)</span>
      </div>`;
  });



  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Etiquetas</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f0f0f0;
      padding: 20px;
      color: #333;
    }

    .controls {
      background: #fff;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .controls h2 {
      font-size: 18px;
      color: #333;
      margin-right: auto;
    }

    .controls button {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-print {
      background: #2563eb;
      color: #fff;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }

    .btn-close {
      background: #e5e7eb;
      color: #374151;
    }
    .btn-close:hover {
      background: #d1d5db;
    }

    .report-container {
      max-width: 700px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 32px;
    }

    .report-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }

    .report-date {
      font-size: 14px;
      color: #888;
      margin-bottom: 8px;
    }

    .report-total {
      font-size: 16px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }

    .report-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      border-left: 4px solid #2563eb;
      margin-bottom: 4px;
      background: #f8fafc;
      border-radius: 6px;
    }

    .report-item:last-child {
      border-bottom: none;
    }

    .report-item-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      flex: 1;
    }

    .report-item-quantity {
      font-size: 14px;
      font-weight: 600;
      color: #2563eb;
      min-width: 120px;
      text-align: center;
    }

    .report-item-detail {
      font-size: 13px;
      font-weight: 500;
      color: #059669;
      min-width: 100px;
      text-align: right;
    }

    @media print {
      body {
        background: none;
        padding: 0;
      }
      .controls {
        display: none !important;
      }
      .report-container {
        box-shadow: none;
        border-radius: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="controls">
    <h2>📊 Relatório de Etiquetas</h2>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn-close" onclick="window.close()">✕ Fechar</button>
  </div>

  <div class="report-container">
    <div class="report-title">Relatório de Etiquetas</div>
    <div class="report-date">${today}</div>
    <div class="report-total">Total: ${App.generatedLabels.length} etiqueta(s)</div>
    ${reportBodyHtml}
  </div>
</body>
</html>`;

  reportWindow.document.write(html);
  reportWindow.document.close();
  showNotification('Relatório gerado!', 'success');
}

// === Helpers do Relatório ===

function findSubGroupField(label) {
  // Procura campo que sirva para sub-agrupar (genética, concentração, etc)
  const subGroupLabels = ['genética', 'genetica', 'variedade', 'cepa', 'strain', 'concentração', 'concentracao'];
  for (const f of label.resolvedFields) {
    if (subGroupLabels.includes(f.label.toLowerCase())) {
      return f.label;
    }
  }
  return null;
}

function findVolumeField(label) {
  const volumeLabels = ['volume', 'quantidade', 'peso', 'qtd'];
  for (const f of label.resolvedFields) {
    if (volumeLabels.includes(f.label.toLowerCase())) {
      return f.label;
    }
  }
  return null;
}

function sumFieldValues(labels, fieldLabel) {
  let sum = 0;
  let found = false;
  labels.forEach(lbl => {
    const val = getFieldValue(lbl, fieldLabel);
    const num = parseFloat(val.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!isNaN(num)) {
      sum += num;
      found = true;
    }
  });
  return found ? sum : null;
}

function extractUnit(value) {
  if (!value) return '';
  const match = value.match(/[a-zA-Z%]+$/);
  return match ? match[0] : '';
}

