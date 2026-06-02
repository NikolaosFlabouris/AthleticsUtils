/**
 * Time Calculator Page Controller
 *
 * Two modes:
 *   1. Add / Subtract — unlimited rows, each with a per-row +/− operator
 *      and a running-total chip. Running totals update live. Supports
 *      negative totals.
 *   2. Multiply / Divide — one time + one number. Renders a step-by-step
 *      running total (multiply) or reducing total (divide).
 *
 * Results auto-calculate on input. An "Add to History" button persists
 * the current calculation to localStorage (unlike the pace calculator,
 * which auto-saves). A "Share" button copies a URL that replays it.
 */

import { Navigation } from '../components/navigation.js';
import { createIcon } from '../components/icon.js';
import {
  parseTimeFlexible,
  formatTime,
  formatDurationBreakdown,
  runAddSubtract,
  multiplyTime,
  divideTime
} from '../calculators/time-calculations.js';
import { buildShareUrl, parseUrlParams, clearUrlParams, copyToClipboard, TIME_PARAM_MAP } from '../utils/url-params.js';
import { debounce } from '../utils/debounce.js';
import { showFieldError, clearFieldError } from '../utils/field-error.js';

// Failure-voice validation messages, mirroring the `-help` wording.
const ERR_MULDIV_TIME = 'Time must be MM:SS, HH:MM:SS, or seconds.';
const ERR_MULDIV_NUMBER = 'Number must be a valid number (e.g. 4 or 1.5).';
const ERR_ADDSUB_ROW = 'Time must be MM:SS, HH:MM:SS, or seconds.';

const HISTORY_KEY = 'athleticsUtils.timeHistory';
const MAX_HISTORY = 10;
const STATE_MODE_KEY = 'timeCalculator.mode';
const STATE_MULDIV_OP_KEY = 'timeCalculator.muldivOp';

class TimeCalculator {
  constructor() {
    this.currentMode = 'addsub';  // 'addsub' | 'muldiv'
    this.muldivOp = 'mul';        // 'mul' | 'div'
    this.addSubRows = [];         // [{ operator:'+'|'-', value:string }]
    this.currentResult = null;    // Last valid calculation snapshot
    this.currentParams = null;    // Share params matching currentResult
    // Auto-recalc is debounced so a screen reader's polite live region
    // gets one announcement when the user pauses, not one per keystroke.
    // Click handlers (mode switch, add row, op toggle) still call
    // recalculate() synchronously.
    this.recalculateDebounced = debounce(() => this.recalculate(), 300);
  }

  initialize() {
    this.cacheDomElements();
    this.loadState();
    this.ensureInitialRows();
    this.applyModeVisibility();
    this.setupEventListeners();
    this.renderAddSubRows();
    this.loadHistory();

    const urlParams = parseUrlParams(TIME_PARAM_MAP);
    if (urlParams) {
      requestAnimationFrame(() => {
        this.applyUrlParams(urlParams);
        clearUrlParams();
      });
    } else {
      this.recalculate();
    }
  }

  cacheDomElements() {
    this.addSubBtn = document.getElementById('time-mode-addsub');
    this.mulDivBtn = document.getElementById('time-mode-muldiv');
    this.addSubControls = document.getElementById('time-addsub-controls');
    this.mulDivControls = document.getElementById('time-muldiv-controls');

    this.timeRowsContainer = document.getElementById('time-rows');
    this.addRowBtn = document.getElementById('time-add-row-btn');

    this.muldivTimeInput = document.getElementById('time-muldiv-time');
    this.muldivMulBtn = document.getElementById('time-muldiv-op-mul');
    this.muldivDivBtn = document.getElementById('time-muldiv-op-div');
    this.muldivNumberInput = document.getElementById('time-muldiv-number');
    this.muldivNumberHelp = document.getElementById('time-muldiv-number-help');

    this.errorEl = document.getElementById('error-message');
    this.resultsContainer = document.getElementById('results-container');
    this.resultsContent = document.getElementById('results-content');

    this.historySection = document.getElementById('history-section');
    this.historyTableBody = document.getElementById('history-table-body');
  }

  loadState() {
    const savedMode = sessionStorage.getItem(STATE_MODE_KEY);
    if (savedMode === 'addsub' || savedMode === 'muldiv') this.currentMode = savedMode;
    const savedOp = sessionStorage.getItem(STATE_MULDIV_OP_KEY);
    if (savedOp === 'mul' || savedOp === 'div') this.muldivOp = savedOp;
  }

  saveState() {
    sessionStorage.setItem(STATE_MODE_KEY, this.currentMode);
    sessionStorage.setItem(STATE_MULDIV_OP_KEY, this.muldivOp);
  }

  ensureInitialRows() {
    // Start with two empty rows so the UI is never completely blank.
    if (this.addSubRows.length === 0) {
      this.addSubRows = [
        { operator: '+', value: '' },
        { operator: '+', value: '' }
      ];
    }
  }

  applyModeVisibility() {
    this.addSubBtn.classList.toggle('mode-toggle__option--active', this.currentMode === 'addsub');
    this.mulDivBtn.classList.toggle('mode-toggle__option--active', this.currentMode === 'muldiv');
    this.addSubBtn.setAttribute('aria-pressed', String(this.currentMode === 'addsub'));
    this.mulDivBtn.setAttribute('aria-pressed', String(this.currentMode === 'muldiv'));

    this.addSubControls.classList.toggle('hidden', this.currentMode !== 'addsub');
    this.mulDivControls.classList.toggle('hidden', this.currentMode !== 'muldiv');

    this.muldivMulBtn.classList.toggle('mode-toggle__option--active', this.muldivOp === 'mul');
    this.muldivDivBtn.classList.toggle('mode-toggle__option--active', this.muldivOp === 'div');
    this.muldivMulBtn.setAttribute('aria-pressed', String(this.muldivOp === 'mul'));
    this.muldivDivBtn.setAttribute('aria-pressed', String(this.muldivOp === 'div'));

    // Update help copy when switching operator.
    if (this.muldivOp === 'div') {
      this.muldivNumberHelp.textContent = 'Whole-number divisors give even steps; decimals append a final remainder step.';
    } else {
      this.muldivNumberHelp.textContent = 'Decimals allowed for multiply (e.g. 1.5 appends a remainder step).';
    }
  }

  setupEventListeners() {
    this.addSubBtn.addEventListener('click', () => this.switchMode('addsub'));
    this.mulDivBtn.addEventListener('click', () => this.switchMode('muldiv'));

    this.addRowBtn.addEventListener('click', () => {
      this.addSubRows.push({ operator: '+', value: '' });
      this.renderAddSubRows();
      this.recalculate();
      // Focus the freshly-created input for fast entry.
      requestAnimationFrame(() => {
        const inputs = this.timeRowsContainer.querySelectorAll('.time-row__input');
        const last = inputs[inputs.length - 1];
        last?.focus();
      });
    });

    this.muldivTimeInput.addEventListener('input', () => this.recalculateDebounced());
    this.muldivNumberInput.addEventListener('input', () => this.recalculateDebounced());
    this.muldivMulBtn.addEventListener('click', () => this.switchMulDivOp('mul'));
    this.muldivDivBtn.addEventListener('click', () => this.switchMulDivOp('div'));
  }

  switchMode(mode) {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.applyModeVisibility();
    this.saveState();
    this.recalculate();
  }

  switchMulDivOp(op) {
    if (op === this.muldivOp) return;
    this.muldivOp = op;
    this.applyModeVisibility();
    this.saveState();
    this.recalculate();
  }

  // ---------- Add/Sub rows ----------

  renderAddSubRows() {
    this.timeRowsContainer.innerHTML = '';

    this.addSubRows.forEach((row, index) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'time-row';
      rowEl.dataset.index = String(index);

      // Operator button: first row is always "+" and disabled so the
      // user can't flip it to a dangling leading minus.
      const opBtn = document.createElement('button');
      opBtn.type = 'button';
      opBtn.className = 'time-row__op-btn';
      opBtn.textContent = row.operator === '-' ? '\u2212' : '+';
      if (row.operator === '-') opBtn.classList.add('time-row__op-btn--minus');
      if (index === 0) {
        opBtn.disabled = true;
        opBtn.title = 'First row is always addition';
      }
      opBtn.setAttribute('aria-label', row.operator === '-' ? 'Subtract this time' : 'Add this time');
      opBtn.addEventListener('click', () => this.toggleRowOperator(index));

      // Time input
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `time-addsub-input-${index}`;
      input.className = 'form-input time-row__input';
      input.placeholder = 'e.g., 1:52';
      input.autocomplete = 'off';
      input.inputMode = 'text';
      input.value = row.value;
      input.setAttribute('aria-label', `Time for row ${index + 1}`);
      input.addEventListener('input', (e) => this.handleRowInput(index, e.target.value));
      input.addEventListener('keydown', (e) => {
        // Pressing Enter on the last row creates a new row (quick entry).
        if (e.key === 'Enter' && index === this.addSubRows.length - 1) {
          e.preventDefault();
          this.addRowBtn.click();
        }
      });

      // Running total chip (filled in by recalculate → updateAddSubTotals)
      const subtotal = document.createElement('span');
      subtotal.className = 'time-row__subtotal time-row__subtotal--muted';
      subtotal.dataset.role = 'subtotal';
      subtotal.textContent = '—';

      // Remove-row button (hidden on the first row when there are only
      // two rows — we always keep at least 2 rows visible).
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'time-row__remove-btn';
      removeBtn.setAttribute('aria-label', `Remove row ${index + 1}`);
      removeBtn.title = 'Remove row';
      removeBtn.appendChild(createIcon('x', 'icon--sm'));
      if (this.addSubRows.length <= 2) {
        removeBtn.classList.add('time-row__remove-btn--hidden');
      }
      removeBtn.addEventListener('click', () => this.removeRow(index));

      rowEl.appendChild(opBtn);
      rowEl.appendChild(input);
      rowEl.appendChild(subtotal);
      rowEl.appendChild(removeBtn);
      this.timeRowsContainer.appendChild(rowEl);
    });
  }

  toggleRowOperator(index) {
    if (index === 0) return;
    const row = this.addSubRows[index];
    row.operator = row.operator === '+' ? '-' : '+';
    this.renderAddSubRows();
    this.recalculate();
  }

  handleRowInput(index, value) {
    // Store the raw string; we only re-parse on recalculate.
    this.addSubRows[index].value = value;
    this.recalculateDebounced();
  }

  removeRow(index) {
    if (this.addSubRows.length <= 2) return;
    this.addSubRows.splice(index, 1);
    // The new first row must always be "+" — re-normalise.
    if (this.addSubRows[0]) this.addSubRows[0].operator = '+';
    this.renderAddSubRows();
    this.recalculate();
  }

  /**
   * Update only the subtotal chips on the existing rows without re-building
   * the whole row list. Called from recalculate to keep input focus intact.
   */
  updateAddSubTotals(runningTotals) {
    const rowEls = this.timeRowsContainer.querySelectorAll('.time-row');
    rowEls.forEach((rowEl, i) => {
      const chip = rowEl.querySelector('[data-role="subtotal"]');
      if (!chip) return;
      const rowState = this.addSubRows[i];
      if (!rowState || !rowState.value.trim()) {
        chip.textContent = '—';
        chip.classList.add('time-row__subtotal--muted');
        chip.classList.remove('time-row__subtotal--negative');
        return;
      }
      const seconds = parseTimeFlexible(rowState.value);
      if (seconds == null) {
        chip.textContent = '—';
        chip.classList.add('time-row__subtotal--muted');
        chip.classList.remove('time-row__subtotal--negative');
        return;
      }
      chip.textContent = formatTime(runningTotals[i]);
      chip.classList.remove('time-row__subtotal--muted');
      chip.classList.toggle('time-row__subtotal--negative', runningTotals[i] < 0);
    });
  }

  // ---------- recalculate ----------

  recalculate() {
    this.hideError();
    this.currentResult = null;
    this.currentParams = null;

    if (this.currentMode === 'addsub') {
      this.recalculateAddSub();
    } else {
      this.recalculateMulDiv();
    }
  }

  recalculateAddSub() {
    // Parse every row. Rows with empty or invalid values contribute zero
    // but still occupy a slot so the running totals line up with the
    // visible row order.
    const parsedRows = this.addSubRows.map(r => {
      const trimmed = (r.value || '').trim();
      if (!trimmed) return { operator: r.operator, seconds: 0, valid: false, empty: true };
      const seconds = parseTimeFlexible(trimmed);
      if (seconds == null) return { operator: r.operator, seconds: 0, valid: false, empty: false };
      return { operator: r.operator, seconds, valid: true, empty: false };
    });

    const { runningTotals, final } = runAddSubtract(parsedRows);
    this.updateAddSubTotals(runningTotals);

    const validCount = parsedRows.filter(r => r.valid).length;

    // Flag rows with parse errors so the user can see what's wrong, but
    // don't block the running total display for the valid rows. Each bad
    // row gets its own inline `role="alert"` message (identified + announced
    // next to the field); valid/empty rows are cleared.
    this.timeRowsContainer.querySelectorAll('.time-row').forEach((rowEl, i) => {
      const input = rowEl.querySelector('.time-row__input');
      if (!input) return;
      const row = parsedRows[i];
      if (!row.valid && !row.empty) {
        showFieldError(input, ERR_ADDSUB_ROW);
      } else {
        clearFieldError(input);
      }
    });

    if (validCount < 2) {
      // Need at least two valid rows to show a meaningful result card.
      this.hideResults();
      return;
    }

    this.currentResult = {
      mode: 'addsub',
      rows: this.addSubRows.map(r => ({ operator: r.operator, value: r.value })),
      parsedRows,
      final
    };
    this.currentParams = {
      mode: 'as',
      times: this.serialiseRowsForUrl(this.addSubRows)
    };
    this.renderAddSubResult(this.currentResult);
  }

  recalculateMulDiv() {
    const timeStr = this.muldivTimeInput.value.trim();
    const numberStr = this.muldivNumberInput.value.trim();
    if (!timeStr || !numberStr) {
      this.hideResults();
      this.clearMuldivErrors();
      return;
    }

    const seconds = parseTimeFlexible(timeStr);
    if (seconds == null) {
      showFieldError(this.muldivTimeInput, ERR_MULDIV_TIME);
      this.hideResults();
      return;
    }
    clearFieldError(this.muldivTimeInput);

    const num = parseFloat(numberStr);
    if (!Number.isFinite(num)) {
      showFieldError(this.muldivNumberInput, ERR_MULDIV_NUMBER);
      this.hideResults();
      return;
    }
    if (this.muldivOp === 'div' && num === 0) {
      // showError routes to the inline span (aria-invalid + describedby).
      this.showError('Cannot divide by zero.', this.muldivNumberInput);
      this.hideResults();
      return;
    }
    clearFieldError(this.muldivNumberInput);

    let breakdown;
    if (this.muldivOp === 'mul') {
      breakdown = multiplyTime(seconds, num);
    } else {
      breakdown = divideTime(seconds, num);
    }
    if (!breakdown || !Number.isFinite(breakdown.final)) {
      this.hideResults();
      return;
    }

    this.currentResult = {
      mode: 'muldiv',
      op: this.muldivOp,
      timeSeconds: seconds,
      timeText: timeStr,
      number: num,
      steps: breakdown.steps,
      final: breakdown.final
    };
    this.currentParams = {
      mode: 'md',
      time: timeStr,
      operator: this.muldivOp,
      number: numberStr
    };
    this.renderMulDivResult(this.currentResult);
  }

  clearMuldivErrors() {
    clearFieldError(this.muldivTimeInput);
    clearFieldError(this.muldivNumberInput);
  }

  // ---------- serialisation for share URL ----------

  serialiseRowsForUrl(rows) {
    // Join rows as "+1:52,+3:02,-1:00". Empty rows become "+".
    return rows
      .map(r => `${r.operator === '-' ? '-' : '+'}${r.value.trim()}`)
      .join(',');
  }

  parseRowsFromUrl(serialised) {
    if (!serialised) return [];
    return String(serialised).split(',').map(token => {
      if (!token) return { operator: '+', value: '' };
      const op = token[0] === '-' ? '-' : '+';
      const rest = token[0] === '+' || token[0] === '-' ? token.slice(1) : token;
      return { operator: op, value: rest };
    });
  }

  // ---------- result rendering ----------

  renderAddSubResult({ final, parsedRows }) {
    this.resultsContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'result-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'result-card__title-row';
    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = 'Total';
    titleRow.appendChild(title);
    titleRow.appendChild(this.createResultActions());
    card.appendChild(titleRow);

    // Use the shared `.result-card__points` / `.result-card__content`
    // styling so the headline number and subtext match the pace, score
    // and combined-events result cards in both themes. The `--negative`
    // modifier still flips the colour to var(--hot) / var(--accent-deep)
    // when the running total drops below zero.
    const big = document.createElement('div');
    big.className = 'result-card__points';
    if (final < 0) big.classList.add('time-result--negative');
    big.textContent = formatTime(final);
    card.appendChild(big);

    const breakdown = document.createElement('p');
    breakdown.className = 'result-card__content';
    breakdown.textContent = formatDurationBreakdown(final);
    card.appendChild(breakdown);

    this.resultsContent.appendChild(card);
    this.showResults();
  }

  formatExpressionFromParsedRows(parsedRows) {
    // "5:00 + 3:02 − 1:00" using a unicode minus for readability. Only
    // include valid rows in the expression; empty rows are skipped.
    const parts = [];
    parsedRows.forEach((row, i) => {
      if (!row.valid) return;
      const timeStr = formatTime(row.seconds);
      if (parts.length === 0) {
        parts.push(timeStr);
      } else {
        parts.push(row.operator === '-' ? '\u2212' : '+');
        parts.push(timeStr);
      }
    });
    return parts.join(' ');
  }

  renderMulDivResult({ op, timeSeconds, timeText, number, steps, final }) {
    this.resultsContent.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'result-card';

    const titleRow = document.createElement('div');
    titleRow.className = 'result-card__title-row';
    const title = document.createElement('h3');
    title.className = 'result-card__title';
    title.textContent = op === 'mul' ? 'Running Total' : 'Reducing Total';
    titleRow.appendChild(title);
    titleRow.appendChild(this.createResultActions());
    card.appendChild(titleRow);

    // Match the shared `.result-card__points` / `.result-card__content`
    // styling — see the add/subtract renderer above.
    const big = document.createElement('div');
    big.className = 'result-card__points';
    big.textContent = formatTime(final);
    card.appendChild(big);

    const breakdown = document.createElement('p');
    breakdown.className = 'result-card__content';
    breakdown.textContent = formatDurationBreakdown(final);
    card.appendChild(breakdown);

    // Step list
    const list = document.createElement('ol');
    list.className = 'time-steps';
    steps.forEach((stepSeconds, i) => {
      const li = document.createElement('li');
      li.className = 'time-steps__item';
      if (i === steps.length - 1) li.classList.add('time-steps__item--final');

      const label = document.createElement('span');
      label.className = 'time-steps__label';
      label.textContent = `Step ${i + 1}`;
      li.appendChild(label);

      const value = document.createElement('span');
      value.className = 'time-steps__value';
      value.textContent = formatTime(stepSeconds);
      li.appendChild(value);

      list.appendChild(li);
    });
    card.appendChild(list);

    this.resultsContent.appendChild(card);
    this.showResults();
  }

  // ---------- result action buttons (add to history + share) ----------

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

  showToast(anchorElement, message) {
    const titleRow = anchorElement.closest('.result-card__title-row');
    if (!titleRow) return;
    const existing = titleRow.querySelector('.share-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    // role="status" + aria-live="polite" so SR users get the same "Link
    // copied!" / "Added to history" feedback that sighted users see.
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
    if (history.length > 0 && history[0].signature === entry.signature) {
      this.showToast(btnElement, 'Already in history');
      return;
    }

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving time history', e);
    }
    this.renderHistory();
    this.showToast(btnElement, 'Added to history');
  }

  buildHistoryEntry(result, params) {
    // Prefer crypto.randomUUID so the ID isn't predictable; fall back only
    // for ancient runtimes.
    const id = `time-${
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    }`;
    if (result.mode === 'addsub') {
      const expression = this.formatExpressionFromParsedRows(result.parsedRows);
      const resultText = formatTime(result.final);
      return {
        id,
        mode: '\u00b1',          // plus-minus
        modeKey: 'addsub',
        expression,
        resultText,
        signature: `as:${params.times}`,
        params
      };
    }
    const opGlyph = result.op === 'mul' ? '\u00d7' : '\u00f7';
    const expression = `${formatTime(result.timeSeconds)} ${opGlyph} ${result.number}`;
    const resultText = formatTime(result.final);
    return {
      id,
      mode: result.op === 'mul' ? '\u00d7' : '\u00f7',
      modeKey: 'muldiv',
      expression,
      resultText,
      signature: `md:${params.operator}:${params.time}:${params.number}`,
      params
    };
  }

  async handleShare(btnElement) {
    if (!this.currentParams) return;
    const url = buildShareUrl('/calculators/time.html', this.currentParams, TIME_PARAM_MAP);
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
      console.error('Error loading time history', e);
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
      row.setAttribute('aria-label', `Replay ${entry.mode}: ${entry.expression}`);

      row.innerHTML = `
        <td>${this.escapeHtml(entry.mode)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.expression)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.resultText)}</td>
        <td class="history-row__actions">
          <button class="history-move-btn" data-id="${entry.id}" data-direction="up" aria-label="Move up">&#x25B2;</button>
          <button class="history-move-btn" data-id="${entry.id}" data-direction="down" aria-label="Move down">&#x25BC;</button>
          <button class="history-delete-btn" data-id="${entry.id}" aria-label="Delete"></button>
        </td>
      `;

      const deleteBtn = row.querySelector('.history-delete-btn');
      deleteBtn.appendChild(createIcon('x', 'icon--sm'));

      row.addEventListener('dragstart', (e) => this.handleDragStart(e));
      row.addEventListener('dragover', (e) => this.handleDragOver(e));
      row.addEventListener('drop', (e) => this.handleDrop(e));
      row.addEventListener('dragend', (e) => this.handleDragEnd(e));

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteEntry(entry.id);
      });

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

      row.addEventListener('click', (e) => {
        if (e.target.closest('.history-delete-btn')) return;
        if (e.target.closest('.history-move-btn')) return;
        this.replayEntry(entry);
      });

      row.addEventListener('keydown', (e) => {
        if (e.target !== row) return;
        // Enter / Space — replay this entry.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.replayEntry(entry);
          return;
        }
        // Alt+Up / Alt+Down — reorder without leaving the row. Mirrors the
        // arrow-button click path, then re-focuses the moved row.
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
        // Delete / Backspace — remove this entry. Focus the next row,
        // falling back to the previous one if we deleted the last entry.
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
      console.error('Error saving time history', e);
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
      console.error('Error saving time history', e);
    }
    this.renderHistory();
  }

  replayEntry(entry) {
    if (!entry?.params) return;
    this.applyUrlParams(entry.params, { scrollToResults: true });
  }

  // ---------- drag & drop ----------

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

  // ---------- shared link / history replay ----------

  applyUrlParams(params, options = {}) {
    const mode = params.mode === 'md' ? 'muldiv' : 'as';
    this.currentMode = mode === 'muldiv' ? 'muldiv' : 'addsub';

    if (this.currentMode === 'addsub') {
      this.addSubRows = this.parseRowsFromUrl(params.times || '');
      if (this.addSubRows.length < 2) {
        // Always keep ≥ 2 rows to preserve the UI invariant.
        while (this.addSubRows.length < 2) {
          this.addSubRows.push({ operator: '+', value: '' });
        }
      }
      // First row forced to "+".
      if (this.addSubRows[0]) this.addSubRows[0].operator = '+';
      this.renderAddSubRows();
    } else {
      if (params.operator === 'div' || params.operator === 'mul') {
        this.muldivOp = params.operator;
      }
      if (params.time != null) this.muldivTimeInput.value = String(params.time);
      if (params.number != null) this.muldivNumberInput.value = String(params.number);
    }

    this.applyModeVisibility();
    this.saveState();
    this.recalculate();

    if (options.scrollToResults) {
      requestAnimationFrame(() => {
        this.resultsContainer?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ---------- helpers ----------

  /**
   * Surface an error. With offending `inputs` it's a field-level validation
   * failure: the message is rendered inline next to each field in a
   * `role="alert"` span (identified in text + announced) and the field is
   * flagged invalid. With no inputs it's a general error and the central
   * panel is used. The tracked field set is cleared again in hideError.
   */
  showError(message, inputs = []) {
    const list = (Array.isArray(inputs) ? inputs : [inputs]).filter(Boolean);

    // Clear any previously-flagged inputs first so a different error
    // doesn't leave the old set stranded.
    this._clearErroredInputs();

    if (list.length) {
      // Field-level error: render the message inline next to each offending
      // field (role="alert" → identified + announced). Keep the central
      // panel quiet so the message isn't announced twice.
      if (this.errorEl) {
        this.errorEl.textContent = '';
        this.errorEl.classList.add('hidden');
      }
      list.forEach(input => showFieldError(input, message));
      this._erroredInputs = list;
      return;
    }

    // General error with no specific field → central panel.
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.classList.remove('hidden');
  }

  hideError() {
    this.errorEl?.classList.add('hidden');
    this._clearErroredInputs();
  }

  _clearErroredInputs() {
    if (!this._erroredInputs?.length) return;
    this._erroredInputs.forEach(input => clearFieldError(input));
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

const calculator = new TimeCalculator();
calculator.initialize();

Navigation.initialize();
