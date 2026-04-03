\
const STORAGE_KEY = 'decide-like-a-trader-v1';

const defaultState = {
  currentSetup: null,
  decisions: [],
  latestDecision: null
};

let state = loadState();

const els = {
  pills: [...document.querySelectorAll('.pill')],
  panels: [...document.querySelectorAll('.panel')],
  assetName: document.getElementById('assetName'),
  decisionType: document.getElementById('decisionType'),
  timeframe: document.getElementById('timeframe'),
  convictionGoal: document.getElementById('convictionGoal'),
  thesis: document.getElementById('thesis'),
  trigger: document.getElementById('trigger'),
  risk: document.getElementById('risk'),
  entry: document.getElementById('entry'),
  stop: document.getElementById('stop'),
  target: document.getElementById('target'),
  maxRisk: document.getElementById('maxRisk'),
  saveSetupBtn: document.getElementById('saveSetupBtn'),
  clearSetupBtn: document.getElementById('clearSetupBtn'),
  scoreClarity: document.getElementById('scoreClarity'),
  scoreTrigger: document.getElementById('scoreTrigger'),
  scoreRisk: document.getElementById('scoreRisk'),
  scoreExecution: document.getElementById('scoreExecution'),
  scoreReward: document.getElementById('scoreReward'),
  scoreEmotion: document.getElementById('scoreEmotion'),
  scoreClarityValue: document.getElementById('scoreClarityValue'),
  scoreTriggerValue: document.getElementById('scoreTriggerValue'),
  scoreRiskValue: document.getElementById('scoreRiskValue'),
  scoreExecutionValue: document.getElementById('scoreExecutionValue'),
  scoreRewardValue: document.getElementById('scoreRewardValue'),
  scoreEmotionValue: document.getElementById('scoreEmotionValue'),
  computeBtn: document.getElementById('computeBtn'),
  riskPerUnit: document.getElementById('riskPerUnit'),
  rewardPerUnit: document.getElementById('rewardPerUnit'),
  rMultiple: document.getElementById('rMultiple'),
  positionSize: document.getElementById('positionSize'),
  decisionOutput: document.getElementById('decisionOutput'),
  executionPlan: document.getElementById('executionPlan'),
  decisionNotes: document.getElementById('decisionNotes'),
  saveDecisionBtn: document.getElementById('saveDecisionBtn'),
  copyDecisionBtn: document.getElementById('copyDecisionBtn'),
  journalSearch: document.getElementById('journalSearch'),
  journalList: document.getElementById('journalList'),
  exportBtn: document.getElementById('exportBtn'),
  importFile: document.getElementById('importFile'),
  demoBtn: document.getElementById('demoBtn'),
  resetBtn: document.getElementById('resetBtn')
};

init();

function init() {
  bindEvents();
  restoreInputs();
  renderJournal();
  renderLatestDecision();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(console.error);
  }
}

function bindEvents() {
  els.pills.forEach(pill => pill.addEventListener('click', () => setView(pill.dataset.view)));
  els.saveSetupBtn.addEventListener('click', saveSetup);
  els.clearSetupBtn.addEventListener('click', clearSetup);
  [els.scoreClarity, els.scoreTrigger, els.scoreRisk, els.scoreExecution, els.scoreReward, els.scoreEmotion]
    .forEach(el => el.addEventListener('input', syncRangeValues));
  els.computeBtn.addEventListener('click', computeDecision);
  els.saveDecisionBtn.addEventListener('click', saveDecision);
  els.copyDecisionBtn.addEventListener('click', copyLatest);
  els.journalSearch.addEventListener('input', renderJournal);
  els.exportBtn.addEventListener('click', exportData);
  els.importFile.addEventListener('change', importData);
  els.demoBtn.addEventListener('click', loadDemoData);
  els.resetBtn.addEventListener('click', resetAll);
  syncRangeValues();
}

function setView(viewName) {
  els.pills.forEach(p => p.classList.toggle('active', p.dataset.view === viewName));
  els.panels.forEach(panel => panel.classList.toggle('active', panel.id === `view-${viewName}`));
}

function syncRangeValues() {
  els.scoreClarityValue.textContent = els.scoreClarity.value;
  els.scoreTriggerValue.textContent = els.scoreTrigger.value;
  els.scoreRiskValue.textContent = els.scoreRisk.value;
  els.scoreExecutionValue.textContent = els.scoreExecution.value;
  els.scoreRewardValue.textContent = els.scoreReward.value;
  els.scoreEmotionValue.textContent = els.scoreEmotion.value;
}

function saveSetup() {
  const asset = els.assetName.value.trim();
  if (!asset) {
    alert('Add a situation or asset first.');
    return;
  }

  state.currentSetup = gatherSetup();
  persist();
  setView('score');
}

function gatherSetup() {
  return {
    assetName: els.assetName.value.trim(),
    decisionType: els.decisionType.value,
    timeframe: els.timeframe.value,
    convictionGoal: els.convictionGoal.value,
    thesis: els.thesis.value.trim(),
    trigger: els.trigger.value.trim(),
    risk: els.risk.value.trim(),
    entry: parseFloat(els.entry.value) || 0,
    stop: parseFloat(els.stop.value) || 0,
    target: parseFloat(els.target.value) || 0,
    maxRisk: parseFloat(els.maxRisk.value) || 0,
    updatedAt: new Date().toISOString()
  };
}

function clearSetup() {
  els.assetName.value = '';
  els.decisionType.value = 'Enter';
  els.timeframe.value = 'Immediate';
  els.convictionGoal.value = 'Moderate';
  els.thesis.value = '';
  els.trigger.value = '';
  els.risk.value = '';
  els.entry.value = '';
  els.stop.value = '';
  els.target.value = '';
  els.maxRisk.value = '';
  state.currentSetup = null;
  state.latestDecision = null;
  persist();
  renderLatestDecision();
}

function computeDecision() {
  const setup = gatherSetup();
  if (!setup.assetName) {
    alert('Add the setup first.');
    return;
  }

  const scores = {
    clarity: Number(els.scoreClarity.value),
    trigger: Number(els.scoreTrigger.value),
    risk: Number(els.scoreRisk.value),
    execution: Number(els.scoreExecution.value),
    reward: Number(els.scoreReward.value),
    emotion: Number(els.scoreEmotion.value)
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const avgScore = totalScore / 6;

  const riskPerUnit = setup.entry && setup.stop ? Math.abs(setup.entry - setup.stop) : 0;
  const rewardPerUnit = setup.entry && setup.target ? Math.abs(setup.target - setup.entry) : 0;
  const rMultiple = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
  const positionSize = riskPerUnit > 0 && setup.maxRisk > 0 ? Math.floor(setup.maxRisk / riskPerUnit) : 0;

  let call = 'PASS';
  let rationale = 'The setup is not yet clear or executable enough.';
  if (avgScore >= 4 && rMultiple >= 2 && scores.emotion >= 3 && scores.execution >= 3) {
    call = 'ACT';
    rationale = 'The setup is sufficiently clear, asymmetric, and executable.';
  } else if (avgScore >= 3.2 && rMultiple >= 1.5) {
    call = 'CAUTION';
    rationale = 'There may be an opportunity, but some variables need tighter control.';
  }

  const summary = [
    `Asset: ${setup.assetName}`,
    `Decision Type: ${setup.decisionType}`,
    `Timeframe: ${setup.timeframe}`,
    `Call: ${call}`,
    `Average Score: ${avgScore.toFixed(1)} / 5`,
    riskPerUnit ? `Risk / Unit: ${riskPerUnit.toFixed(2)}` : 'Risk / Unit: —',
    rewardPerUnit ? `Reward / Unit: ${rewardPerUnit.toFixed(2)}` : 'Reward / Unit: —',
    rMultiple ? `R Multiple: ${rMultiple.toFixed(2)}` : 'R Multiple: —',
    positionSize ? `Size: ${positionSize}` : 'Size: —',
    '',
    `Rationale: ${rationale}`
  ].join('\n');

  state.currentSetup = setup;
  state.latestDecision = {
    id: crypto.randomUUID(),
    setup,
    scores,
    avgScore,
    riskPerUnit,
    rewardPerUnit,
    rMultiple,
    positionSize,
    call,
    rationale,
    summary,
    executionPlan: els.executionPlan.value.trim(),
    notes: els.decisionNotes.value.trim(),
    createdAt: new Date().toISOString()
  };

  persist();
  renderLatestDecision();
  setView('decision');
}

function renderLatestDecision() {
  const d = state.latestDecision;
  els.riskPerUnit.textContent = d && d.riskPerUnit ? d.riskPerUnit.toFixed(2) : '—';
  els.rewardPerUnit.textContent = d && d.rewardPerUnit ? d.rewardPerUnit.toFixed(2) : '—';
  els.rMultiple.textContent = d && d.rMultiple ? d.rMultiple.toFixed(2) : '—';
  els.positionSize.textContent = d && d.positionSize ? String(d.positionSize) : '—';

  if (!d) {
    els.decisionOutput.className = 'decision-box empty-state';
    els.decisionOutput.textContent = 'No decision computed yet.';
    return;
  }

  els.decisionOutput.className = 'decision-box';
  els.decisionOutput.textContent = d.summary;
}

function saveDecision() {
  if (!state.latestDecision) {
    alert('Compute the decision first.');
    return;
  }
  state.latestDecision.executionPlan = els.executionPlan.value.trim();
  state.latestDecision.notes = els.decisionNotes.value.trim();
  state.latestDecision.savedAt = new Date().toISOString();
  state.decisions.unshift(structuredClone(state.latestDecision));
  persist();
  renderJournal();
  setView('journal');
}

async function copyLatest() {
  if (!state.latestDecision) {
    alert('No decision to copy.');
    return;
  }
  const payload = [
    state.latestDecision.summary,
    state.latestDecision.executionPlan ? `Execution Plan: ${state.latestDecision.executionPlan}` : '',
    state.latestDecision.notes ? `Notes: ${state.latestDecision.notes}` : ''
  ].filter(Boolean).join('\n\n');
  await navigator.clipboard.writeText(payload);
  alert('Latest decision copied.');
}

function renderJournal() {
  const q = els.journalSearch.value.trim().toLowerCase();
  const filtered = state.decisions.filter(d => {
    const blob = `${d.setup.assetName} ${d.setup.decisionType} ${d.call} ${d.rationale} ${d.executionPlan || ''} ${d.notes || ''}`.toLowerCase();
    return blob.includes(q);
  });

  if (!filtered.length) {
    els.journalList.className = 'stack-list empty-state';
    els.journalList.textContent = 'No matching decisions.';
    return;
  }

  els.journalList.className = 'stack-list';
  els.journalList.innerHTML = '';

  filtered.forEach(d => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const tagClass = d.call === 'ACT' ? 'good' : d.call === 'CAUTION' ? 'caution' : 'bad';
    item.innerHTML = `
      <h3>${escapeHtml(d.setup.assetName)}</h3>
      <div class="meta">${escapeHtml(d.setup.decisionType)} · ${escapeHtml(d.setup.timeframe)} · ${formatDate(d.savedAt || d.createdAt)}</div>
      <div class="tag-row">
        <span class="tag ${tagClass}">${escapeHtml(d.call)}</span>
        <span class="tag">Avg ${d.avgScore.toFixed(1)}</span>
        ${d.rMultiple ? `<span class="tag">R ${d.rMultiple.toFixed(2)}</span>` : ''}
      </div>
      <div class="body-text">${escapeHtml(d.rationale)}</div>
      ${d.executionPlan ? `<div class="body-text"><strong>Execution:</strong> ${escapeHtml(d.executionPlan)}</div>` : ''}
      ${d.notes ? `<div class="body-text"><strong>Notes:</strong> ${escapeHtml(d.notes)}</div>` : ''}
      <div class="item-actions">
        <button class="secondary" data-action="load" data-id="${d.id}">Load</button>
        <button class="secondary" data-action="delete" data-id="${d.id}">Delete</button>
      </div>
    `;
    els.journalList.appendChild(item);
  });

  els.journalList.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleJournalAction));
}

function handleJournalAction(e) {
  const id = e.currentTarget.dataset.id;
  const action = e.currentTarget.dataset.action;
  const decision = state.decisions.find(d => d.id === id);
  if (!decision) return;

  if (action === 'load') {
    loadDecisionIntoForm(decision);
    state.latestDecision = structuredClone(decision);
    persist();
    renderLatestDecision();
    setView('decision');
  }

  if (action === 'delete') {
    if (!confirm('Delete this decision?')) return;
    state.decisions = state.decisions.filter(d => d.id !== id);
    persist();
    renderJournal();
  }
}

function loadDecisionIntoForm(d) {
  els.assetName.value = d.setup.assetName || '';
  els.decisionType.value = d.setup.decisionType || 'Enter';
  els.timeframe.value = d.setup.timeframe || 'Immediate';
  els.convictionGoal.value = d.setup.convictionGoal || 'Moderate';
  els.thesis.value = d.setup.thesis || '';
  els.trigger.value = d.setup.trigger || '';
  els.risk.value = d.setup.risk || '';
  els.entry.value = d.setup.entry || '';
  els.stop.value = d.setup.stop || '';
  els.target.value = d.setup.target || '';
  els.maxRisk.value = d.setup.maxRisk || '';
  els.scoreClarity.value = d.scores.clarity;
  els.scoreTrigger.value = d.scores.trigger;
  els.scoreRisk.value = d.scores.risk;
  els.scoreExecution.value = d.scores.execution;
  els.scoreReward.value = d.scores.reward;
  els.scoreEmotion.value = d.scores.emotion;
  els.executionPlan.value = d.executionPlan || '';
  els.decisionNotes.value = d.notes || '';
  syncRangeValues();
}

function restoreInputs() {
  if (!state.currentSetup) return;
  els.assetName.value = state.currentSetup.assetName || '';
  els.decisionType.value = state.currentSetup.decisionType || 'Enter';
  els.timeframe.value = state.currentSetup.timeframe || 'Immediate';
  els.convictionGoal.value = state.currentSetup.convictionGoal || 'Moderate';
  els.thesis.value = state.currentSetup.thesis || '';
  els.trigger.value = state.currentSetup.trigger || '';
  els.risk.value = state.currentSetup.risk || '';
  els.entry.value = state.currentSetup.entry || '';
  els.stop.value = state.currentSetup.stop || '';
  els.target.value = state.currentSetup.target || '';
  els.maxRisk.value = state.currentSetup.maxRisk || '';
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `decide-like-a-trader-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      state = {
        ...structuredClone(defaultState),
        ...parsed
      };
      persist();
      restoreInputs();
      renderJournal();
      renderLatestDecision();
      alert('Import complete.');
    } catch {
      alert('That file could not be imported.');
    } finally {
      els.importFile.value = '';
    }
  };
  reader.readAsText(file);
}

function loadDemoData() {
  if (state.decisions.length) {
    if (!confirm('Demo data will be added to your existing data. Continue?')) return;
  }

  const demo = {
    id: crypto.randomUUID(),
    setup: {
      assetName: 'ABCD',
      decisionType: 'Enter',
      timeframe: 'Intraday',
      convictionGoal: 'Moderate',
      thesis: 'Catalyst plus strong relative volume may create a momentum window.',
      trigger: 'Positive press release with clear, specific language.',
      risk: 'Fails VWAP and loses opening momentum quickly.',
      entry: 3.20,
      stop: 2.95,
      target: 3.95,
      maxRisk: 150
    },
    scores: { clarity: 4, trigger: 4, risk: 4, execution: 4, reward: 4, emotion: 3 },
    avgScore: 3.83,
    riskPerUnit: 0.25,
    rewardPerUnit: 0.75,
    rMultiple: 3.0,
    positionSize: 600,
    call: 'ACT',
    rationale: 'The setup is sufficiently clear, asymmetric, and executable.',
    summary: 'Asset: ABCD\nDecision Type: Enter\nTimeframe: Intraday\nCall: ACT\nAverage Score: 3.8 / 5\nRisk / Unit: 0.25\nReward / Unit: 0.75\nR Multiple: 3.00\nSize: 600\n\nRationale: The setup is sufficiently clear, asymmetric, and executable.',
    executionPlan: 'Enter only if momentum confirms and the level holds.',
    notes: 'Watch for overextension on the first spike.',
    createdAt: new Date().toISOString(),
    savedAt: new Date().toISOString()
  };

  state.currentSetup = structuredClone(demo.setup);
  state.latestDecision = structuredClone(demo);
  state.decisions.unshift(structuredClone(demo));
  persist();
  restoreInputs()
  renderLatestDecision();
  renderJournal();
}

function resetAll() {
  if (!confirm('Reset the full app? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(defaultState);
  clearSetup();
  els.executionPlan.value = '';
  els.decisionNotes.value = '';
  els.journalSearch.value = '';
  renderJournal();
  renderLatestDecision();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...JSON.parse(raw)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function escapeHtml(str='') {
  return str
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
