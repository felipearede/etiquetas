// === Estado Global ===
const App = {
  currentStep: 'upload',
  csvRows: [],
  matchResults: [],   // { row, mapping, status: 'matched'|'unmatched'|'skipped' }
  batchInputs: {},    // { mappingId: { fieldId: value } }
  labelInputs: {},    // { rowIndex: { fieldId: value } }
  generatedLabels: [],
  mappings: [],       // carregado do mappings.json + localStorage overrides
};

// === Utilitários ===
function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// === Navegação entre etapas ===
function showStep(stepName) {
  App.currentStep = stepName;

  document.querySelectorAll('.step-content').forEach(el => {
    el.classList.remove('active');
    el.classList.add('hidden');
  });
  const target = document.getElementById('step-' + stepName);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  document.querySelectorAll('.steps .step').forEach(el => {
    el.classList.remove('active', 'done');
  });
  const steps = ['upload', 'match', 'fill', 'preview'];
  const currentIndex = steps.indexOf(stepName);
  document.querySelectorAll('.steps .step').forEach((el, i) => {
    if (i < currentIndex) el.classList.add('done');
    if (i === currentIndex) el.classList.add('active');
  });
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadMappings();
  setupCSVHandlers();
  setupNavigationHandlers();
});

function setupNavigationHandlers() {
  document.getElementById('btn-mappings').addEventListener('click', () => {
    renderMappingList();
    document.getElementById('mapping-overlay').classList.remove('hidden');
  });
  document.getElementById('btn-close-overlay').addEventListener('click', () => {
    document.getElementById('mapping-overlay').classList.add('hidden');
  });
  document.getElementById('mapping-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('mapping-overlay').classList.add('hidden');
    }
  });

  document.getElementById('btn-back-upload').addEventListener('click', () => showStep('upload'));
  document.getElementById('btn-back-match').addEventListener('click', () => showStep('match'));
  document.getElementById('btn-back-fill').addEventListener('click', () => showStep('fill'));

  document.getElementById('btn-process').addEventListener('click', () => {
    matchProducts();
    showStep('match');
  });

  document.getElementById('btn-continue-fill').addEventListener('click', () => {
    renderFillGroups();
    showStep('fill');
  });

  document.getElementById('btn-generate').addEventListener('click', () => {
    collectFillInputs();
    generateLabels();
    renderLabelPreviews();
    showStep('preview');
  });

  document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);

  document.getElementById('btn-clear-csv').addEventListener('click', () => {
    App.csvRows = [];
    App.matchResults = [];
    document.getElementById('csv-preview').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  });
}
