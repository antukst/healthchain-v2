// charts.js
let diseaseChart = null;
let testTypeChart = null;
let monthlyTrendChart = null;

// Helper: generate N visually distinct colors
function generateColors(n) {
  const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#f472b6','#facc15','#06b6d4','#60a5fa','#34d399','#fb7185','#f97316'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(palette[i % palette.length]);
  }
  return out;
}

// Utility: get month key like '2025-10'
function getMonthKey(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  } catch (e) {
    return null;
  }
}

// Async updateCharts - aggregates patient-level and file-level data
async function updateCharts(patients) {
  // Ensure DOM elements exist
  const diseaseCanvas = document.getElementById('diseaseChart');
  const typeCanvas = document.getElementById('testTypeChart');
  const monthlyCanvas = document.getElementById('monthlyTrendChart');
  if (!diseaseCanvas || !typeCanvas || !monthlyCanvas) return;

  // 1) Disease distribution (patient-level)
  const diseaseCounts = {};
  patients.forEach(p => {
    const diag = (p.diagnosis || (p.metadata && p.metadata.diagnosis) || 'Unknown').toString();
    const key = diag.trim() === '' ? 'Unknown' : diag;
    diseaseCounts[key] = (diseaseCounts[key] || 0) + 1;
  });

  const diseaseLabels = Object.keys(diseaseCounts);
  const diseaseData = Object.values(diseaseCounts);
  const diseaseColors = generateColors(diseaseLabels.length);

  // 2) Test/Record type breakdown & 3) Monthly uploads trend (file-level)
  const typeCounts = {};
  const monthlyCounts = {};

  // Try to fetch files for patients if securePatientDB is available
  if (typeof securePatientDB !== 'undefined' && typeof securePatientDB.getPatientFiles === 'function') {
    try {
      // Fetch files in parallel but with limit to avoid blasting the DB in very large datasets
      const maxFetch = 200; // safe cap
      const toFetch = patients.slice(0, maxFetch);
      const filePromises = toFetch.map(p => securePatientDB.getPatientFiles(p._id).catch(err => { console.warn('getPatientFiles error', p._id, err); return []; }));
      const filesArrays = await Promise.all(filePromises);
      const allFiles = filesArrays.flat();

      allFiles.forEach(file => {
        const t = (file.type || file.mime_type || file.record_type || 'other').toString().toLowerCase();
        const typeKey = t.includes('pdf') ? 'pdf' : (t.includes('image') ? 'image' : (t.includes('doc') ? 'document' : (file.type || 'other')));
        typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

        const month = getMonthKey(file.uploaded_at || file.uploadedAt || file.created_at || file.createdAt);
        if (month) monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });
    } catch (err) {
      console.warn('Failed to aggregate file metadata for charts:', err);
    }
  } else {
    // If file-level API is not present, try to use patient.metadata.files if present
    patients.forEach(p => {
      const files = (p.metadata && p.metadata.files) || [];
      files.forEach(file => {
        const t = (file.type || file.mime_type || 'other').toString().toLowerCase();
        const typeKey = t.includes('pdf') ? 'pdf' : (t.includes('image') ? 'image' : (t.includes('doc') ? 'document' : 'other'));
        typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
        const month = getMonthKey(file.uploaded_at || file.uploadedAt || file.created_at || file.createdAt);
        if (month) monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      });
    });
  }

  // Prepare data for testTypeChart
  const typeLabels = Object.keys(typeCounts).length > 0 ? Object.keys(typeCounts) : ['no-data'];
  const typeData = Object.keys(typeCounts).length > 0 ? Object.values(typeCounts) : [0];
  const typeColors = generateColors(typeLabels.length);

  // Prepare data for monthlyTrendChart (sorted by month)
  const months = Object.keys(monthlyCounts).sort();
  const monthVals = months.map(m => monthlyCounts[m]);
  const monthColor = '#60a5fa';

  // Create/Update diseaseChart
  const dCtx = diseaseCanvas.getContext('2d');
  if (diseaseChart) {
    diseaseChart.data.labels = diseaseLabels;
    diseaseChart.data.datasets[0].data = diseaseData;
    diseaseChart.data.datasets[0].backgroundColor = diseaseColors;
    diseaseChart.update();
  } else {
    diseaseChart = new Chart(dCtx, {
      type: 'doughnut',
      data: { labels: diseaseLabels, datasets: [{ label: 'Disease Distribution', data: diseaseData, backgroundColor: diseaseColors }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // Create/Update testTypeChart (pie)
  const tCtx = typeCanvas.getContext('2d');
  if (testTypeChart) {
    testTypeChart.data.labels = typeLabels;
    testTypeChart.data.datasets[0].data = typeData;
    testTypeChart.data.datasets[0].backgroundColor = typeColors;
    testTypeChart.update();
  } else {
    testTypeChart = new Chart(tCtx, {
      type: 'pie',
      data: { labels: typeLabels, datasets: [{ label: 'Record Types', data: typeData, backgroundColor: typeColors }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // Create/Update monthlyTrendChart (line)
  const mCtx = monthlyCanvas.getContext('2d');
  if (monthlyTrendChart) {
    monthlyTrendChart.data.labels = months;
    monthlyTrendChart.data.datasets[0].data = monthVals;
    monthlyTrendChart.update();
  } else {
    monthlyTrendChart = new Chart(mCtx, {
      type: 'line',
      data: { labels: months, datasets: [{ label: 'Uploads', data: monthVals, backgroundColor: monthColor, borderColor: monthColor, fill: false, tension: 0.2 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: true }, y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }
    });
  }

  return true;
}
