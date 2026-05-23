/**
 * Age Calculator Page Controller
 *
 * Two modes:
 *   1. Forward — two dates → age (years / months / days) + age at end of year
 *   2. Reverse — one date + age → matching date (date+age OR date−age via sub-toggle)
 *
 * Results auto-update as the user types. A manual "Add to History" button
 * persists a calculation to localStorage (unlike the pace calculator,
 * which auto-saves every calculation). A "Share" button copies a URL that
 * replays the same calculation.
 */

import { Navigation } from '../components/navigation.js';
import { createIcon } from '../components/icon.js';
import {
  parseDateInput,
  formatDateInput,
  compareDates,
  calculateAge,
  ageAtEndOfYear,
  addAge,
  subtractAge,
  formatAgeParts,
  formatAgeCompact,
  formatLongDate,
  formatShortDate
} from '../calculators/age-calculations.js';
import { buildShareUrl, parseUrlParams, clearUrlParams, copyToClipboard, AGE_PARAM_MAP } from '../utils/url-params.js';
import { debounce } from '../utils/debounce.js';
import { linkDescribedBy, unlinkDescribedBy } from '../utils/aria-describedby.js';

const HISTORY_KEY = 'athleticsUtils.ageHistory';
const MAX_HISTORY = 10;
const STATE_MODE_KEY = 'ageCalculator.mode';
const STATE_SUB_MODE_KEY = 'ageCalculator.reverseSubMode';

class AgeCalculator {
  constructor() {
    this.currentMode = 'forward';        // 'forward' | 'reverse'
    this.currentReverseSubMode = 'from'; // 'from' (date + age → target) | 'target' (date − age → from)
    this.currentResult = null;           // Last valid calculation, for Add-to-History and Share
    this.currentParams = null;           // Share params for current result
    // Auto-recalc is debounced so a screen reader's polite live region
    // gets one announcement when the user pauses, not one per keystroke.
    // Mode-switch and other click handlers still call recalculate()
    // synchronously.
    this.recalculateDebounced = debounce(() => this.recalculate(), 300);
  }

  initialize() {
    this.cacheDomElements();
    this.initializeDefaults();
    this.loadState();
    this.applyModeVisibility();
    this.setupEventListeners();
    this.loadHistory();

    // If the page was opened via a shared link, replay the calculation.
    const urlParams = parseUrlParams(AGE_PARAM_MAP);
    if (urlParams) {
      requestAnimationFrame(() => {
        this.applyUrlParams(urlParams);
        clearUrlParams();
      });
    } else {
      // Kick off an initial render (will typically hide results because
      // the from-date defaults to empty).
      this.recalculate();
    }
  }

  cacheDomElements() {
    // Mode toggles
    this.forwardBtn = document.getElementById('age-mode-toggle-forward');
    this.reverseBtn = document.getElementById('age-mode-toggle-reverse');

    // Forward controls
    this.forwardControls = document.getElementById('age-forward-controls');
    this.fromDateInput = document.getElementById('age-from-date');
    this.targetDateInput = document.getElementById('age-target-date');

    // Reverse controls
    this.reverseControls = document.getElementById('age-reverse-controls');
    // The "Date is the" sub-toggle now lives in the shared .toggle-row
    // (next to the Calculate toggle), so its visibility is synced
    // separately from the reverse-controls container.
    this.reverseSubToggle = document.getElementById('age-reverse-subtoggle');
    this.reverseFromBtn = document.getElementById('age-reverse-from-btn');
    this.reverseTargetBtn = document.getElementById('age-reverse-target-btn');
    this.reverseDateInput = document.getElementById('age-reverse-date');
    this.reverseYearsInput = document.getElementById('age-reverse-years');
    this.reverseMonthsInput = document.getElementById('age-reverse-months');
    this.reverseDaysInput = document.getElementById('age-reverse-days');

    // Results + error
    this.errorEl = document.getElementById('error-message');
    this.resultsContainer = document.getElementById('results-container');
    this.resultsContent = document.getElementById('results-content');

    // History
    this.historySection = document.getElementById('history-section');
    this.historyTableBody = document.getElementById('history-table-body');
  }

  initializeDefaults() {
    const today = new Date();
    const todayStr = formatDateInput(today);
    // Target defaults to today; reverse date defaults to today; from
    // intentionally left empty per product spec.
    if (this.targetDateInput && !this.targetDateInput.value) {
      this.targetDateInput.value = todayStr;
    }
    if (this.reverseDateInput && !this.reverseDateInput.value) {
      this.reverseDateInput.value = todayStr;
    }
  }

  loadState() {
    const savedMode = sessionStorage.getItem(STATE_MODE_KEY);
    if (savedMode === 'forward' || savedMode === 'reverse') {
      this.currentMode = savedMode;
    }
    const savedSub = sessionStorage.getItem(STATE_SUB_MODE_KEY);
    if (savedSub === 'from' || savedSub === 'target') {
      this.currentReverseSubMode = savedSub;
    }
  }

  saveState() {
    sessionStorage.setItem(STATE_MODE_KEY, this.currentMode);
    sessionStorage.setItem(STATE_SUB_MODE_KEY, this.currentReverseSubMode);
  }

  applyModeVisibility() {
    // Primary toggle button state
    this.forwardBtn.classList.toggle('mode-toggle__option--active', this.currentMode === 'forward');
    this.reverseBtn.classList.toggle('mode-toggle__option--active', this.currentMode === 'reverse');
    this.forwardBtn.setAttribute('aria-pressed', String(this.currentMode === 'forward'));
    this.reverseBtn.setAttribute('aria-pressed', String(this.currentMode === 'reverse'));

    // Sub-toggle state (reverse mode only, but set either way)
    this.reverseFromBtn.classList.toggle('mode-toggle__option--active', this.currentReverseSubMode === 'from');
    this.reverseTargetBtn.classList.toggle('mode-toggle__option--active', this.currentReverseSubMode === 'target');
    this.reverseFromBtn.setAttribute('aria-pressed', String(this.currentReverseSubMode === 'from'));
    this.reverseTargetBtn.setAttribute('aria-pressed', String(this.currentReverseSubMode === 'target'));

    // Control visibility
    this.forwardControls.classList.toggle('hidden', this.currentMode !== 'forward');
    this.reverseControls.classList.toggle('hidden', this.currentMode !== 'reverse');
    // Keep the relocated "Date is the" sub-toggle in sync with reverse mode.
    this.reverseSubToggle.classList.toggle('hidden', this.currentMode !== 'reverse');
  }

  setupEventListeners() {
    this.forwardBtn.addEventListener('click', () => this.switchMode('forward'));
    this.reverseBtn.addEventListener('click', () => this.switchMode('reverse'));

    this.reverseFromBtn.addEventListener('click', () => this.switchReverseSubMode('from'));
    this.reverseTargetBtn.addEventListener('click', () => this.switchReverseSubMode('target'));

    const auto = () => this.recalculateDebounced();
    this.fromDateInput.addEventListener('input', auto);
    this.fromDateInput.addEventListener('change', auto);
    this.targetDateInput.addEventListener('input', auto);
    this.targetDateInput.addEventListener('change', auto);
    this.reverseDateInput.addEventListener('input', auto);
    this.reverseDateInput.addEventListener('change', auto);
    this.reverseYearsInput.addEventListener('input', auto);
    this.reverseMonthsInput.addEventListener('input', auto);
    this.reverseDaysInput.addEventListener('input', auto);
  }

  switchMode(mode) {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.applyModeVisibility();
    this.saveState();
    this.recalculate();
  }

  switchReverseSubMode(sub) {
    if (sub === this.currentReverseSubMode) return;
    this.currentReverseSubMode = sub;
    this.applyModeVisibility();
    this.saveState();
    this.recalculate();
  }

  /**
   * Compute the current result for whichever mode is active, and render.
   * This is called whenever any input changes.
   */
  recalculate() {
    this.hideError();
    this.currentResult = null;
    this.currentParams = null;

    if (this.currentMode === 'forward') {
      this.recalculateForward();
    } else {
      this.recalculateReverse();
    }
  }

  recalculateForward() {
    const fromStr = this.fromDateInput.value;
    const targetStr = this.targetDateInput.value;
    if (!fromStr || !targetStr) {
      this.hideResults();
      return;
    }

    const from = parseDateInput(fromStr);
    const target = parseDateInput(targetStr);
    if (!from || !target) {
      // Most browsers prevent invalid date entry via the native picker,
      // but we defend against free-typed input on non-picker platforms.
      this.hideResults();
      return;
    }

    if (compareDates(from, target) > 0) {
      // Either input could be the one the user meant to edit; link both
      // so the SR announces the constraint when focus returns to either.
      this.showError(
        'From date must be on or before target date.',
        [this.fromDateInput, this.targetDateInput]
      );
      this.hideResults();
      return;
    }

    const age = calculateAge(from, target);
    const endOfYear = ageAtEndOfYear(from, target.getFullYear());

    this.currentResult = {
      mode: 'forward',
      from,
      target,
      age,
      endOfYear,
      endOfYearLabel: target.getFullYear()
    };
    this.currentParams = {
      mode: 'forward',
      fromDate: fromStr,
      targetDate: targetStr
    };

    this.renderForwardResult(this.currentResult);
  }

  recalculateReverse() {
    const dateStr = this.reverseDateInput.value;
    if (!dateStr) {
      this.hideResults();
      return;
    }
    const date = parseDateInput(dateStr);
    if (!date) {
      this.hideResults();
      return;
    }

    const years = parseInt(this.reverseYearsInput.value || '0', 10);
    const months = parseInt(this.reverseMonthsInput.value || '0', 10);
    const days = parseInt(this.reverseDaysInput.value || '0', 10);

    // Reject negative entries (the HTML `min="0"` also blocks this on the
    // native spinner, but free-typed input can still bypass it). Collect
    // each failing field individually so showError only links the bad
    // ones (the SR doesn't announce "invalid" on a field the user
    // entered correctly).
    const ageInvalid = [];
    if (!Number.isFinite(years) || years < 0) ageInvalid.push(this.reverseYearsInput);
    if (!Number.isFinite(months) || months < 0) ageInvalid.push(this.reverseMonthsInput);
    if (!Number.isFinite(days) || days < 0) ageInvalid.push(this.reverseDaysInput);
    if (ageInvalid.length > 0) {
      this.showError('Age components must be zero or positive.', ageInvalid);
      this.hideResults();
      return;
    }

    // If every component is empty/zero the result is just the input date
    // unchanged — still show it so the user can see the field is valid.
    const age = { years, months, days };
    let resultDate;
    if (this.currentReverseSubMode === 'from') {
      resultDate = addAge(date, age);
    } else {
      resultDate = subtractAge(date, age);
    }

    this.currentResult = {
      mode: 'reverse',
      subMode: this.currentReverseSubMode,
      date,
      age,
      resultDate
    };
    this.currentParams = {
      mode: 'reverse',
      reverseSubMode: this.currentReverseSubMode,
      singleDate: dateStr,
      years: years || undefined,
      months: months || undefined,
      days: days || undefined
    };

    this.renderReverseResult(this.currentResult);
  }

  renderForwardResult({ from, target, age, endOfYear, endOfYearLabel }) {
    this.resultsContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'result-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'result-card__title-row';
    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = 'Age';
    titleRow.appendChild(title);
    titleRow.appendChild(this.createResultActions());
    card.appendChild(titleRow);

    const big = document.createElement('div');
    big.className = 'age-result';
    big.textContent = formatAgeParts(age);
    card.appendChild(big);

    const content = document.createElement('p');
    content.className = 'result-card__content';
    content.textContent = `From ${formatShortDate(from)} to ${formatShortDate(target)}`;
    card.appendChild(content);

    const subtext = document.createElement('p');
    subtext.className = 'age-result__subtext';
    subtext.textContent = `Age at end of year (31 Dec ${endOfYearLabel}): ${formatAgeParts(endOfYear)}`;
    card.appendChild(subtext);

    this.resultsContent.appendChild(card);
    this.showResults();
  }

  renderReverseResult({ subMode, date, age, resultDate }) {
    this.resultsContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'result-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'result-card__title-row';
    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = subMode === 'from' ? 'Resulting Target Date' : 'Resulting From Date';
    titleRow.appendChild(title);
    titleRow.appendChild(this.createResultActions());
    card.appendChild(titleRow);

    const big = document.createElement('div');
    big.className = 'age-result';
    big.textContent = formatLongDate(resultDate);
    card.appendChild(big);

    const content = document.createElement('p');
    content.className = 'result-card__content';
    const ageLabel = formatAgeParts(age);
    if (subMode === 'from') {
      content.textContent = `${ageLabel} after ${formatShortDate(date)}`;
    } else {
      content.textContent = `${ageLabel} before ${formatShortDate(date)}`;
    }
    card.appendChild(content);

    this.resultsContent.appendChild(card);
    this.showResults();
  }

  /**
   * Build the `[Add to History] [Share]` cluster for a result card's
   * title row.
   */
  createResultActions() {
    const wrap = document.createElement('div');
    wrap.className = 'result-card__title-actions';
    wrap.appendChild(this.createAddToHistoryButton());
    wrap.appendChild(this.createShareButton());
    return wrap;
  }

  createAddToHistoryButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-history-btn';
    btn.setAttribute('aria-label', 'Add this result to history');
    btn.title = 'Add to history';

    // Text label first (icon is decorative).
    const text = document.createElement('span');
    text.textContent = 'Add to History';
    btn.appendChild(text);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAddToHistory(btn);
    });
    return btn;
  }

  createShareButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-btn';
    btn.setAttribute('aria-label', 'Share this result');
    btn.title = 'Copy link to clipboard';
    btn.appendChild(createIcon('share', 'icon--sm'));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleShare(btn);
    });
    return btn;
  }

  /**
   * Show a transient confirmation toast attached to the result card.
   * Re-uses the existing `.share-toast` styles so Add-to-History and
   * Share feel consistent.
   */
  showToast(anchorElement, message) {
    const titleRow = anchorElement.closest('.result-card__title-row');
    if (!titleRow) return;
    const existing = titleRow.querySelector('.share-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    titleRow.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  handleAddToHistory(btnElement) {
    if (!this.currentResult || !this.currentParams) return;

    const entry = this.buildHistoryEntry(this.currentResult, this.currentParams);
    const history = this.getHistory();

    // Don't add a duplicate consecutive entry. Cheap way to avoid spam
    // from double-clicking the Add-to-History button.
    if (history.length > 0 && history[0].signature === entry.signature) {
      this.showToast(btnElement, 'Already in history');
      return;
    }

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving age history', e);
    }
    this.renderHistory();
    this.showToast(btnElement, 'Added to history');
  }

  /**
   * Serialise the current calculation into a history row. `signature` is
   * a short stable key used to detect consecutive duplicates.
   */
  buildHistoryEntry(result, params) {
    const id = `age-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    if (result.mode === 'forward') {
      const input = `${formatShortDate(result.from)} → ${formatShortDate(result.target)}`;
      const resultText = formatAgeCompact(result.age);
      return {
        id,
        mode: 'Age',
        modeKey: 'forward',
        input,
        resultText,
        signature: `fwd:${params.fromDate}:${params.targetDate}`,
        params
      };
    }
    const sign = result.subMode === 'from' ? '+' : '−';
    const input = `${formatShortDate(result.date)} ${sign} ${formatAgeCompact(result.age)}`;
    const resultText = formatShortDate(result.resultDate);
    return {
      id,
      mode: 'Date',
      modeKey: 'reverse',
      input,
      resultText,
      signature: `rev:${params.reverseSubMode}:${params.singleDate}:${params.years || 0}:${params.months || 0}:${params.days || 0}`,
      params
    };
  }

  async handleShare(btnElement) {
    if (!this.currentParams) return;
    const url = buildShareUrl('/calculators/age.html', this.currentParams, AGE_PARAM_MAP);
    const success = await copyToClipboard(url);
    this.showToast(btnElement, success ? 'Link copied!' : 'Failed to copy');
  }

  // ---------- history rendering ----------

  getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading age history', e);
      return [];
    }
  }

  loadHistory() {
    this.renderHistory();
  }

  renderHistory() {
    const history = this.getHistory();
    if (history.length === 0) {
      this.historySection.classList.add('hidden');
      this.historyTableBody.innerHTML = '';
      return;
    }

    this.historySection.classList.remove('hidden');
    this.historyTableBody.innerHTML = '';

    history.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.className = 'history-row history-row--adding';
      row.draggable = true;
      row.dataset.id = entry.id;
      row.dataset.index = String(index);
      row.tabIndex = 0;
      row.setAttribute('aria-label', `Replay ${entry.mode}: ${entry.input}`);

      row.innerHTML = `
        <td>${this.escapeHtml(entry.mode)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.input)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.resultText)}</td>
        <td class="history-row__actions">
          <button class="history-move-btn" data-id="${entry.id}" data-direction="up" aria-label="Move up">&#x25B2;</button>
          <button class="history-move-btn" data-id="${entry.id}" data-direction="down" aria-label="Move down">&#x25BC;</button>
          <button class="history-delete-btn" data-id="${entry.id}" aria-label="Delete"></button>
        </td>
      `;

      const deleteBtn = row.querySelector('.history-delete-btn');
      deleteBtn.appendChild(createIcon('x', 'icon--sm'));

      // Drag and drop
      row.addEventListener('dragstart', (e) => this.handleDragStart(e));
      row.addEventListener('dragover', (e) => this.handleDragOver(e));
      row.addEventListener('drop', (e) => this.handleDrop(e));
      row.addEventListener('dragend', (e) => this.handleDragEnd(e));

      // Delete
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteEntry(entry.id);
      });

      // Move up/down buttons (keyboard alternative to drag)
      row.querySelectorAll('.history-move-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const direction = btn.dataset.direction;
          const from = parseInt(row.dataset.index, 10);
          const to = direction === 'up' ? from - 1 : from + 1;
          const now = this.getHistory();
          if (to < 0 || to >= now.length) return;
          this.reorderHistory(from, to);
          requestAnimationFrame(() => {
            const selector = `.history-move-btn[data-id="${entry.id}"][data-direction="${direction}"]`;
            this.historyTableBody.querySelector(selector)?.focus();
          });
        });
      });

      // Click replay
      row.addEventListener('click', (e) => {
        if (e.target.closest('.history-delete-btn')) return;
        if (e.target.closest('.history-move-btn')) return;
        this.replayEntry(entry);
      });

      row.addEventListener('keydown', (e) => {
        if (e.target !== row) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.replayEntry(entry);
          return;
        }
        // Alt+Up / Alt+Down — keyboard reorder.
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          const direction = e.key === 'ArrowUp' ? -1 : 1;
          const from = parseInt(row.dataset.index, 10);
          const to = from + direction;
          const now = this.getHistory();
          if (to < 0 || to >= now.length) return;
          e.preventDefault();
          this.reorderHistory(from, to);
          requestAnimationFrame(() => {
            this.historyTableBody.querySelector(`tr[data-id="${entry.id}"]`)?.focus();
          });
          return;
        }
        // Delete / Backspace — remove this entry, keep focus on the row
        // that takes its slot (or the previous one if we removed the last).
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const idx = parseInt(row.dataset.index, 10);
          this.deleteEntry(entry.id);
          requestAnimationFrame(() => {
            const rows = this.historyTableBody.querySelectorAll('tr');
            const nextRow = rows[idx] || rows[idx - 1];
            nextRow?.focus();
          });
        }
      });

      this.historyTableBody.appendChild(row);
    });
  }

  deleteEntry(id) {
    const history = this.getHistory().filter(e => e.id !== id);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving age history', e);
    }
    this.renderHistory();
  }

  reorderHistory(fromIndex, toIndex) {
    const history = this.getHistory();
    if (fromIndex < 0 || fromIndex >= history.length) return;
    if (toIndex < 0 || toIndex >= history.length) return;
    const [item] = history.splice(fromIndex, 1);
    history.splice(toIndex, 0, item);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving age history', e);
    }
    this.renderHistory();
  }

  replayEntry(entry) {
    if (!entry?.params) return;
    this.applyUrlParams(entry.params, { scrollToResults: true });
  }

  // ---------- drag-and-drop reordering ----------

  handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
  }

  handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.history-row');
    if (row && !row.classList.contains('dragging')) {
      row.classList.add('drag-over');
    }
    return false;
  }

  handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const targetRow = e.target.closest('.history-row');
    if (targetRow) {
      const targetIndex = parseInt(targetRow.dataset.index, 10);
      if (draggedIndex !== targetIndex) {
        this.reorderHistory(draggedIndex, targetIndex);
      }
    }
    return false;
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.history-row').forEach(row => row.classList.remove('drag-over'));
  }

  // ---------- shared link / replay ----------

  /**
   * Populate the form from a params object and trigger recalculation.
   * Shared by both the share-URL replay path and the history replay path.
   */
  applyUrlParams(params, options = {}) {
    const mode = params.mode === 'reverse' ? 'reverse' : 'forward';
    this.currentMode = mode;
    if (mode === 'reverse') {
      if (params.reverseSubMode === 'target') {
        this.currentReverseSubMode = 'target';
      } else {
        this.currentReverseSubMode = 'from';
      }
    }
    this.applyModeVisibility();
    this.saveState();

    if (mode === 'forward') {
      if (params.fromDate) this.fromDateInput.value = params.fromDate;
      if (params.targetDate) this.targetDateInput.value = params.targetDate;
    } else {
      if (params.singleDate) this.reverseDateInput.value = params.singleDate;
      this.reverseYearsInput.value = params.years != null && params.years !== '' ? String(params.years) : '';
      this.reverseMonthsInput.value = params.months != null && params.months !== '' ? String(params.months) : '';
      this.reverseDaysInput.value = params.days != null && params.days !== '' ? String(params.days) : '';
    }

    this.recalculate();

    if (options.scrollToResults) {
      requestAnimationFrame(() => {
        this.resultsContainer?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ---------- small helpers ----------

  /**
   * Show an error in the central error panel and link any offending
   * inputs to it via aria-describedby (so a screen-reader user tabbing
   * back to the bad field hears the error description) and aria-invalid.
   * Tracked inputs are unlinked again in hideError.
   */
  showError(message, inputs = []) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.classList.remove('hidden');

    this._clearErroredInputs();
    const list = (Array.isArray(inputs) ? inputs : [inputs]).filter(Boolean);
    if (!this.errorEl.id) return;
    list.forEach(input => {
      linkDescribedBy(input, this.errorEl.id);
      input.setAttribute('aria-invalid', 'true');
    });
    this._erroredInputs = list;
  }

  hideError() {
    this.errorEl?.classList.add('hidden');
    this._clearErroredInputs();
  }

  _clearErroredInputs() {
    if (!this._erroredInputs?.length) return;
    const errorId = this.errorEl?.id;
    this._erroredInputs.forEach(input => {
      if (errorId) unlinkDescribedBy(input, errorId);
      input.setAttribute('aria-invalid', 'false');
    });
    this._erroredInputs = [];
  }

  hideResults() {
    this.resultsContainer?.classList.add('hidden');
  }

  showResults() {
    this.resultsContainer?.classList.remove('hidden');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Initialise calculator when DOM is ready.
const calculator = new AgeCalculator();
calculator.initialize();

// Initialise navigation (active link, icons, PWA updater).
Navigation.initialize();
