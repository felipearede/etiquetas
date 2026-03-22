// === Upload e Parsing de CSV ===

function setupCSVHandlers() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-input');

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  // File input
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  });
}

function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    showNotification('Selecione um arquivo .csv', 'error');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    encoding: 'UTF-8',
    complete: (results) => {
      if (results.errors.length > 0) {
        console.warn('Erros no parsing:', results.errors);
      }

      // Normaliza nomes das colunas (trim)
      const rows = results.data.map(row => {
        const normalized = {};
        Object.keys(row).forEach(key => {
          normalized[key.trim()] = (row[key] || '').trim();
        });
        return normalized;
      });

      // Verifica colunas necessárias
      if (rows.length === 0) {
        showNotification('CSV vazio', 'error');
        return;
      }

      const headers = Object.keys(rows[0]);
      const hasRequired = ['prod'].every(col =>
        headers.some(h => h.toLowerCase() === col.toLowerCase())
      );

      if (!hasRequired) {
        showNotification('CSV precisa ter pelo menos a coluna "prod"', 'error');
        return;
      }

      // Normaliza nomes das colunas para lowercase match
      App.csvRows = rows.map(row => {
        const n = {};
        Object.keys(row).forEach(key => {
          const lk = key.toLowerCase();
          if (lk === 'orderid') n.orderId = row[key];
          else if (lk === 'trackingcode') n.trackingCode = row[key];
          else if (lk === 'addresspersonname') n.addressPersonName = row[key];
          else if (lk === 'prod') n.prod = row[key];
          else if (lk === 'qtd') n.qtd = row[key];
          else if (lk === 'sku') n.sku = row[key];
          else n[key] = row[key];
        });
        return n;
      });

      // Deduplicar: mesmo paciente + produto = manter apenas 1
      const beforeCount = App.csvRows.length;
      const seen = new Set();
      App.csvRows = App.csvRows.filter(row => {
        const key = `${(row.addressPersonName || '').toLowerCase().trim()}||${(row.prod || '').toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const removed = beforeCount - App.csvRows.length;

      renderCSVTable();
      const msg = `${App.csvRows.length} linhas carregadas` +
        (removed > 0 ? ` (${removed} duplicata(s) removida(s))` : '');
      showNotification(msg, 'success');
    },
    error: (err) => {
      showNotification('Erro ao ler CSV: ' + err.message, 'error');
    }
  });
}

function renderCSVTable() {
  const table = document.getElementById('csv-table');
  document.getElementById('csv-count').textContent = App.csvRows.length;

  let html = '<thead><tr><th></th><th>#</th><th>Nome</th><th>Produto</th></tr></thead><tbody>';
  App.csvRows.forEach((row, i) => {
    html += `<tr>
      <td><button class="btn-remove-row" data-index="${i}" title="Remover linha">&times;</button></td>
      <td>${i + 1}</td>
      <td>${escapeHtml(row.addressPersonName || '-')}</td>
      <td>${escapeHtml(row.prod || '-')}</td>
    </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;

  // Attach remove handlers
  table.querySelectorAll('.btn-remove-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      App.csvRows.splice(index, 1);
      renderCSVTable();
      showNotification('Linha removida', 'info');
      if (App.csvRows.length === 0) {
        document.getElementById('csv-preview').classList.add('hidden');
        document.getElementById('drop-zone').style.display = '';
      }
    });
  });

  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('csv-preview').classList.remove('hidden');
}
