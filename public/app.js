/* ═══════════════════════════════════════════════════════════════════
   AEO Diagnostic — Frontend Application
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── DOM References ────────────────────────────────────────────────

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    form: $('#query-form'),
    inputQuery: $('#input-query'),
    inputBrand: $('#input-brand'),
    btnSubmit: $('#btn-submit'),
    btnText: $('.btn-text'),
    btnLoading: $('.btn-loading'),
    btnDemo: $('#btn-demo'),
    btnSettings: $('#btn-settings'),
    btnCloseSettings: $('#btn-close-settings'),
    btnSaveKeys: $('#btn-save-keys'),
    btnToggleRaw: $('#btn-toggle-raw'),
    btnNewQuery: $('#btn-new-query'),
    btnRetry: $('#btn-retry'),
    settingsPanel: $('#settings-panel'),
    keyOpenai: $('#key-openai'),
    keyAnthropic: $('#key-anthropic'),
    keyGemini: $('#key-gemini'),
    querySection: $('#query-section'),
    loadingSection: $('#loading-section'),
    resultsSection: $('#results-section'),
    errorSection: $('#error-section'),
    errorMessage: $('#error-message'),
    scoreGrade: $('#score-grade'),
    scoreRingFill: $('#score-ring-fill'),
    scoreTitle: $('#score-title'),
    scoreSubtitle: $('#score-subtitle'),
    scoreStats: $('#score-stats'),
    brandsTbody: $('#brands-tbody'),
    userBrandSection: $('#user-brand-section'),
    strengthsList: $('#strengths-list'),
    weaknessesList: $('#weaknesses-list'),
    recommendationsList: $('#recommendations-list'),
    categoryTrends: $('#category-trends'),
    insightsList: $('#insights-list'),
    rawResponses: $('#raw-responses'),
    rawResponseCards: $('#raw-response-cards'),
  };

  // ─── State ─────────────────────────────────────────────────────────

  let apiKeys = loadKeys();

  // ─── Init ──────────────────────────────────────────────────────────

  injectSVGDefs();
  bindEvents();
  prefillKeys();

  // ─── SVG gradient definition for score ring ────────────────────────

  function injectSVGDefs() {
    const svg = document.querySelector('.score-ring');
    if (!svg) return;
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>`;
    svg.prepend(defs);
  }

  // ─── Event Bindings ────────────────────────────────────────────────

  function bindEvents() {
    els.form.addEventListener('submit', handleSubmit);
    els.btnDemo.addEventListener('click', handleDemo);
    els.btnSettings.addEventListener('click', () => toggleSettings(true));
    els.btnCloseSettings.addEventListener('click', () => toggleSettings(false));
    els.btnSaveKeys.addEventListener('click', handleSaveKeys);
    els.btnToggleRaw.addEventListener('click', toggleRaw);
    els.btnNewQuery.addEventListener('click', resetToQuery);
    els.btnRetry.addEventListener('click', resetToQuery);

    // Close settings on backdrop click
    els.settingsPanel.addEventListener('click', (e) => {
      if (e.target === els.settingsPanel) toggleSettings(false);
    });

    // Escape to close settings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.settingsPanel.hidden) toggleSettings(false);
    });
  }

  // ─── Settings ──────────────────────────────────────────────────────

  function toggleSettings(show) {
    els.settingsPanel.hidden = !show;
    if (show) els.keyOpenai.focus();
  }

  function loadKeys() {
    try {
      return JSON.parse(localStorage.getItem('aeo_keys') || '{}');
    } catch {
      return {};
    }
  }

  function prefillKeys() {
    if (apiKeys.openai) els.keyOpenai.value = apiKeys.openai;
    if (apiKeys.anthropic) els.keyAnthropic.value = apiKeys.anthropic;
    if (apiKeys.gemini) els.keyGemini.value = apiKeys.gemini;
  }

  function handleSaveKeys() {
    apiKeys = {
      openai: els.keyOpenai.value.trim(),
      anthropic: els.keyAnthropic.value.trim(),
      gemini: els.keyGemini.value.trim(),
    };
    localStorage.setItem('aeo_keys', JSON.stringify(apiKeys));
    toggleSettings(false);

    // Visual feedback
    els.btnSaveKeys.textContent = '✓ Saved';
    setTimeout(() => { els.btnSaveKeys.textContent = 'Save Keys'; }, 1500);
  }

  // ─── Submit Handler ────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    const query = els.inputQuery.value.trim();
    const brandName = els.inputBrand.value.trim();

    if (!query) return;

    // Check for API keys
    const hasKeys = apiKeys.openai || apiKeys.anthropic || apiKeys.gemini;
    if (!hasKeys) {
      // Check if server has env keys by trying — server will return error if no keys
    }

    showLoading();

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, brandName, apiKeys }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }

      renderResults(data);
    } catch (err) {
      showError(err.message);
    }
  }

  // ─── Demo Handler ──────────────────────────────────────────────────

  async function handleDemo() {
    els.inputQuery.value = 'best magnesium supplement for seniors';
    els.inputBrand.value = 'Nature Made';
    showLoading();

    try {
      const res = await fetch('/api/demo');
      const data = await res.json();
      // Small delay to let the loading animation feel real
      await sleep(1800);
      renderResults(data);
    } catch (err) {
      showError('Failed to load demo: ' + err.message);
    }
  }

  // ─── View States ───────────────────────────────────────────────────

  function showLoading() {
    els.querySection.hidden = true;
    els.loadingSection.hidden = false;
    els.resultsSection.hidden = true;
    els.errorSection.hidden = true;
    els.btnSubmit.disabled = true;
    els.btnText.hidden = true;
    els.btnLoading.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError(msg) {
    els.loadingSection.hidden = true;
    els.resultsSection.hidden = true;
    els.errorSection.hidden = false;
    els.errorMessage.textContent = msg;
    resetButton();
  }

  function resetToQuery() {
    els.querySection.hidden = false;
    els.loadingSection.hidden = true;
    els.resultsSection.hidden = true;
    els.errorSection.hidden = true;
    resetButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetButton() {
    els.btnSubmit.disabled = false;
    els.btnText.hidden = false;
    els.btnLoading.hidden = true;
  }

  // ─── Render Results ────────────────────────────────────────────────

  function renderResults(data) {
    els.loadingSection.hidden = true;
    els.resultsSection.hidden = false;
    resetButton();

    const { analysis, responses, query, brandName } = data;

    renderScoreOverview(analysis, brandName, query, data.meta);
    renderBrandsTable(analysis.brands, brandName);
    renderUserBrand(analysis.userBrand);
    renderRecommendations(analysis.recommendations);
    renderCategoryTrends(analysis.categoryTrends);
    renderInsights(analysis.insights);
    renderRawResponses(responses);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Score Overview ────────────────────────────────────────────────

  function renderScoreOverview(analysis, brandName, query, meta) {
    const ub = analysis.userBrand;
    const score = ub ? ub.aeoScore : null;
    const grade = ub ? ub.grade : '—';

    // Animate score ring
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = score != null ? circumference * (1 - score / 100) : circumference;
    els.scoreRingFill.style.strokeDasharray = circumference;

    // Trigger animation after a small delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        els.scoreRingFill.style.strokeDashoffset = offset;
      });
    });

    // Grade text
    els.scoreGrade.textContent = grade;
    els.scoreGrade.className = 'score-grade ' + getGradeClass(grade);

    // Title and subtitle
    if (brandName && ub) {
      els.scoreTitle.textContent = `${brandName} — AEO Report Card`;
      els.scoreSubtitle.textContent = ub.found
        ? `Your brand is ranked #${ub.overallRank} across AI shopping assistants for "${query}"`
        : `Your brand was not found in AI recommendations for "${query}"`;
    } else {
      els.scoreTitle.textContent = 'AEO Category Report';
      els.scoreSubtitle.textContent = `AI brand visibility analysis for "${query}"`;
    }

    // Stats
    const statsHTML = [];
    statsHTML.push(statItem(analysis.brands.length, 'Brands Found'));
    statsHTML.push(statItem(meta?.modelsSucceeded || 3, 'Models Queried'));
    if (ub && ub.found) {
      statsHTML.push(statItem('#' + ub.overallRank, 'Your Rank'));
    }
    const topBrand = analysis.brands[0];
    if (topBrand) {
      statsHTML.push(statItem(topBrand.visibilityScore + '%', 'Top Visibility'));
    }
    els.scoreStats.innerHTML = statsHTML.join('');
  }

  function statItem(value, label) {
    return `<div class="stat-item"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`;
  }

  function getGradeClass(grade) {
    if (!grade) return '';
    const g = grade.replace('+', '').toUpperCase();
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    if (g === 'D') return 'grade-d';
    if (g === 'F') return 'grade-f';
    return '';
  }

  // ─── Brands Table ──────────────────────────────────────────────────

  function renderBrandsTable(brands, userBrand) {
    const ubLower = (userBrand || '').toLowerCase();
    els.brandsTbody.innerHTML = brands.map((b, i) => {
      const isUser = ubLower && b.name.toLowerCase().includes(ubLower);
      const rowClass = isUser ? ' class="user-brand-row"' : '';
      return `<tr${rowClass}>
        <td>${i + 1}</td>
        <td>
          <span class="brand-name">${escapeHtml(b.name)}</span>
          ${isUser ? '<span class="brand-tag">Your Brand</span>' : ''}
        </td>
        <td class="model-cell">${positionBadge(b.mentions?.gpt?.position)}</td>
        <td class="model-cell">${positionBadge(b.mentions?.claude?.position)}</td>
        <td class="model-cell">${positionBadge(b.mentions?.gemini?.position)}</td>
        <td>
          <div class="vis-bar-wrap">
            <div class="vis-bar"><div class="vis-bar-fill" style="width:${b.visibilityScore}%"></div></div>
            <span class="vis-score">${b.visibilityScore}</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function positionBadge(pos) {
    if (pos == null) return '<span class="position-badge pos-none">—</span>';
    let cls = 'pos-other';
    if (pos === 1) cls = 'pos-1';
    else if (pos === 2) cls = 'pos-2';
    else if (pos === 3) cls = 'pos-3';
    return `<span class="position-badge ${cls}">${pos}</span>`;
  }

  // ─── User Brand Strengths / Weaknesses ─────────────────────────────

  function renderUserBrand(ub) {
    if (!ub) {
      els.userBrandSection.hidden = true;
      return;
    }
    els.userBrandSection.hidden = false;

    els.strengthsList.innerHTML = (ub.strengths || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join('') || '<li>No specific strengths identified</li>';

    els.weaknessesList.innerHTML = (ub.weaknesses || [])
      .map((w) => `<li>${escapeHtml(w)}</li>`)
      .join('') || '<li>No specific weaknesses identified</li>';
  }

  // ─── Recommendations ──────────────────────────────────────────────

  function renderRecommendations(recs) {
    els.recommendationsList.innerHTML = (recs || [])
      .map((r) => `<li>${escapeHtml(r)}</li>`)
      .join('');
  }

  // ─── Category Trends ──────────────────────────────────────────────

  function renderCategoryTrends(text) {
    els.categoryTrends.textContent = text || 'No category trends available.';
  }

  // ─── Insights ──────────────────────────────────────────────────────

  function renderInsights(insights) {
    els.insightsList.innerHTML = (insights || [])
      .map((ins) => `<li>${escapeHtml(ins)}</li>`)
      .join('');
  }

  // ─── Raw Responses ─────────────────────────────────────────────────

  function renderRawResponses(responses) {
    const models = [
      { key: 'gpt', label: 'GPT-4o Mini', color: '#10b981' },
      { key: 'claude', label: 'Claude 3.5 Haiku', color: '#f59e0b' },
      { key: 'gemini', label: 'Gemini 2.0 Flash', color: '#3b82f6' },
    ];

    els.rawResponseCards.innerHTML = models.map((m) => {
      const r = responses[m.key];
      const hasError = !r || r.error;
      const bodyContent = hasError
        ? `<span class="raw-error">Error: ${escapeHtml(r?.error || 'No response')}</span>`
        : escapeHtml(r.text);

      return `<div class="raw-card">
        <div class="raw-card-header">
          <span class="raw-model-dot" style="background:${m.color}"></span>
          ${m.label}
          ${hasError ? ' — Failed' : ''}
        </div>
        <div class="raw-card-body">${bodyContent}</div>
      </div>`;
    }).join('');

    // Reset collapsible state
    els.btnToggleRaw.setAttribute('aria-expanded', 'false');
    els.rawResponses.hidden = true;
  }

  function toggleRaw() {
    const expanded = els.btnToggleRaw.getAttribute('aria-expanded') === 'true';
    els.btnToggleRaw.setAttribute('aria-expanded', String(!expanded));
    els.rawResponses.hidden = expanded;
  }

  // ─── Utilities ─────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
