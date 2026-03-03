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
      </div>
      <div class="etiqueta-footer">
        <span class="etiqueta-nome">${escapeHtml(lbl.addressPersonName)}</span>
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

    .info {
      font-size: 13px;
      color: #666;
      width: 100%;
      margin-top: 4px;
      line-height: 1.5;
    }

    .info strong { color: #333; }

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
      padding: 3mm;
      overflow: hidden;
    }

    .etiqueta-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5mm;
    }

    .field {
      display: flex;
      align-items: baseline;
      gap: 2mm;
    }

    .field-label {
      font-size: 7pt;
      font-weight: bold;
      color: #333;
      white-space: nowrap;
    }

    .field-value {
      font-size: 8pt;
      color: #111;
    }

    .field-value-solo {
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
      width: 100%;
    }

    .etiqueta-footer {
      border-top: 0.5px solid #ccc;
      padding-top: 1mm;
      margin-top: 1mm;
    }

    .etiqueta-nome {
      font-size: 6pt;
      color: #666;
    }

    /* ======= ESTILOS DE IMPRESSÃO - IMPRESSORA DE ROLO ======= */
    @media print {
      body {
        background: none;
        padding: 0;
        margin: 0;
        width: ${defaultW}mm;
      }

      .controls {
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
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir (Ctrl+P)</button>
    <button class="btn-close" onclick="window.close()">✕ Fechar</button>
    <div class="info">
      <strong>Tamanho da etiqueta:</strong> ${defaultW}mm × ${defaultH}mm<br>
      <strong>Dica:</strong> Na janela de impressão, verifique se:<br>
      • A impressora selecionada é a <strong>ELGIN</strong><br>
      • <strong>Margens:</strong> Nenhuma<br>
      • <strong>Escala:</strong> 100% (não ajustar à página)
    </div>
  </div>

  <div class="labels-container">
    ${labelsHtml}
  </div>
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
