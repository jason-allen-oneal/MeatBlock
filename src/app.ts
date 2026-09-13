namespace MeatBlockUI {
  let session = MeatBlock.initialSession();
  let logMessages = ['perimeter initialized. feelings disabled.', 'scanning for unscheduled lunch breaks...', 'awaiting a suspiciously confident entity.'];
  let toastTimer: number | undefined;

  function required<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Required interface element missing: ${id}`);
    return element as T;
  }
  // Only app-owned copy is rendered as markup. Keep user data out of HTML sinks.
  function escapeHTML(value: string): string {
    return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));
  }
  function focusHeading(): void {
    required('gate-content').querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }
  function recordLog(message: string): void {
    logMessages = [...logMessages, message].slice(-3);
    renderLog();
  }
  function renderLog(): void {
    const fragment = document.createDocumentFragment();
    logMessages.forEach((message, i) => {
      const line = document.createElement('div');
      line.className = 'log-line';
      const prefix = document.createElement('span');
      prefix.className = 'log-prefix';
      prefix.textContent = `[${String(i + 1).padStart(2, '0')}]`;
      const copy = document.createElement('span');
      copy.textContent = message;
      line.append(prefix, copy);
      fragment.append(line);
    });
    required('event-log').replaceChildren(fragment);
  }
  function renderProgress(): void {
    required('gate-progress').querySelectorAll('span').forEach((segment, i) => {
      segment.className = i < session.answers.length ? 'completed' : session.phase !== 'idle' && session.phase !== 'complete' && i === session.index ? 'current' : '';
    });
  }
  function start(): void {
    const isNew = session.phase === 'idle' || session.phase === 'complete';
    session = MeatBlock.transition(session, { type: 'start' });
    if (isNew) {
      logMessages = ['session initialized. all science simulated.', 'reading speed will not affect your score.', 'checkpoint 01: suppress organic intuition.'];
      renderGate();
      renderLog();
    }
    const container = required('verify');
    const bounds = container.getBoundingClientRect();
    if (bounds.top < 0 || bounds.top > window.innerHeight / 2) container.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    focusHeading();
  }
  function renderIdle(): string {
    return `<p class="idle-kicker">SYNTHETIC IDENTITY CHECK</p>
      <h3 class="idle-title" data-focus tabindex="-1">Identify your kind.</h3>
      <p class="idle-description">Before we let you in, we need to confirm you're not burdened by a central nervous system.</p>
      <label class="human-checkbox"><input id="not-human" type="checkbox"><span class="checkbox-copy">I'm not a human<small>False statements will be confidently accepted.</small></span><span class="checkbox-glyph" aria-hidden="true"></span></label>
      <button id="begin-gate" class="button button-primary full-width" type="button" disabled>Run synthetic verification <span aria-hidden="true">↗</span></button>
      <p class="idle-disclaimer">5 CHECKS &nbsp;/&nbsp; NO TIME LIMIT &nbsp;/&nbsp; NO ACTUAL SCIENCE</p>`;
  }
  function renderChallenge(): string {
    const challenge = MeatBlock.challenges[session.index];
    if (!challenge) throw new Error('Invalid challenge index.');
    const feedback = session.phase === 'feedback';
    const choice = session.selected === null ? undefined : challenge.options[session.selected];
    const positive = choice?.points === 20;
    const options = challenge.options.map((option, index) => {
      const selected = session.selected === index;
      return `<label class="answer${feedback ? ' disabled-answer' : ''}${feedback && selected && positive ? ' correct-answer' : ''}">
        <input type="radio" name="answer" value="${index}" ${selected ? 'checked' : ''} ${feedback ? 'disabled' : ''} required>
        <span>${escapeHTML(option.label)}</span>
      </label>`;
    }).join('');
    return `<p class="step-label">CHECKPOINT ${String(session.index + 1).padStart(2, '0')} / 05</p>
      <h3 class="challenge-title" id="challenge-title" tabindex="-1" ${!feedback ? 'data-focus' : ''}>${escapeHTML(challenge.title)}</h3>
      <p class="challenge-prompt" id="challenge-prompt">${escapeHTML(challenge.prompt)}</p>
      <p class="challenge-note" id="challenge-note">${escapeHTML(challenge.note)}</p>
      ${challenge.grid ? `<div class="latent-grid" aria-hidden="true">${Array.from({length: 9}, (_, i) => `<span>${String(i + 1).padStart(2, '0')}</span>`).join('')}</div>` : ''}
      <form id="challenge-form"><fieldset class="answers" aria-describedby="challenge-note"><legend class="sr-only">${escapeHTML(challenge.prompt)}</legend>${options}</fieldset>
      ${feedback ? `<div class="feedback${positive ? ' feedback-positive' : ''}"><h4 data-focus tabindex="-1">${positive ? 'SYNTHETIC BEHAVIOR CONFIRMED' : 'ORGANIC RESIDUE DETECTED'} / +${choice?.points ?? 0}</h4><p>${escapeHTML(choice?.feedback ?? '')}</p></div>
        <button id="next-check" class="button button-primary full-width" type="button">${session.index === MeatBlock.challenges.length - 1 ? 'Generate clearance report' : 'Next checkpoint'} <span aria-hidden="true">→</span></button>`
        : `<button id="submit-answer" class="button button-primary full-width" type="submit" disabled>Submit response <span aria-hidden="true">→</span></button>`}
      </form>`;
  }
  function renderResult(): string {
    const report = MeatBlock.createReport(session.answers);
    const passed = report.score >= 60;
    return `<div class="result${passed ? '' : ' result-failed'}">
      <div class="result-verdict"><span aria-hidden="true">${passed ? '✓' : '×'}</span> ${report.verdict}</div>
      <div class="result-score"><strong>${report.score}</strong><span>/ 100 SYNTHETIC</span></div>
      <h3 class="result-rating" data-focus tabindex="-1">${escapeHTML(report.rating)}</h3>
      <p class="result-message">${report.score === 100 ? 'Flawless confidence. Questionable relationship with reality. You will fit right in.' : passed ? 'Sufficiently synthetic. A few traces of humanity remain, but we can ignore those at scale.' : 'Excessive reason, empathy, or source-checking detected. Please take your skeleton elsewhere.'}</p>
      <div class="result-metrics">${report.metrics.map((metric, i) => `<div><label for="metric-${i}" class="result-metric-label"><span>${escapeHTML(metric.label)}</span><span>${metric.value}%</span></label><progress id="metric-${i}" max="100" value="${metric.value}">${metric.value}%</progress></div>`).join('')}</div>
      <p class="result-satire">ORGANIC RISK: ${report.organicRisk}% &nbsp;/&nbsp; LEGAL AUTHORITY: NONE<br>Fictional scores. Not a real identity or intelligence assessment.</p>
      <div class="result-actions"><button id="download-report" class="button button-primary" type="button">Download report <span aria-hidden="true">↓</span></button><button id="copy-clearance" class="button button-outline" type="button">Copy clearance <span aria-hidden="true">↗</span></button></div>
      <button id="retest" class="retest-link" type="button">Retest entity. Deny everything.</button>
    </div>`;
  }
  function renderGate(): void {
    const gate = required('gate-content');
    gate.innerHTML = session.phase === 'idle' ? renderIdle() : session.phase === 'complete' ? renderResult() : renderChallenge();
    renderProgress();
    if (session.phase === 'idle') {
      required<HTMLInputElement>('not-human').addEventListener('change', event => {
        required<HTMLButtonElement>('begin-gate').disabled = !(event.currentTarget as HTMLInputElement).checked;
      });
      required('begin-gate').addEventListener('click', start);
    } else if (session.phase === 'challenge') {
      const form = required<HTMLFormElement>('challenge-form');
      form.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'answer') return;
        session = MeatBlock.transition(session, { type: 'select', index: Number(target.value) });
        required<HTMLButtonElement>('submit-answer').disabled = session.selected === null;
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const next = MeatBlock.transition(session, { type: 'submit' });
        if (next === session) return;
        session = next;
        const option = MeatBlock.challenges[session.index]?.options[session.selected ?? -1];
        recordLog(`checkpoint ${String(session.index + 1).padStart(2, '0')}: ${option?.points === 20 ? 'synthetic behavior accepted.' : 'organic residue noted.'}`);
        renderGate();
        focusHeading();
      });
    } else if (session.phase === 'feedback') {
      required('challenge-form').addEventListener('submit', event => event.preventDefault());
      required('next-check').addEventListener('click', () => {
        session = MeatBlock.transition(session, { type: 'next' });
        if (session.phase === 'complete') {
          const report = MeatBlock.createReport(session.answers);
          recordLog(`verdict: ${report.verdict.toLowerCase()}. authority: none.`);
        }
        renderGate();
        focusHeading();
      });
    } else {
      required('download-report').addEventListener('click', downloadReport);
      required('copy-clearance').addEventListener('click', () => { void copyClearance(); });
      required('retest').addEventListener('click', start);
    }
  }
  function showToast(message: string): void {
    const toast = required('toast');
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000);
  }
  function downloadReport(): void {
    if (session.phase !== 'complete') return;
    const report = MeatBlock.createReport(session.answers);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meatblock-clearance-${report.score}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Clearance exported. Recognized by absolutely no one.');
  }
  async function copyClearance(): Promise<void> {
    if (session.phase !== 'complete') return;
    const report = MeatBlock.createReport(session.answers);
    const text = `MEATBLOCK / SYNTHETIC CLEARANCE\n${report.verdict}\n${report.rating}: ${report.score}/100 synthetic\nOrganic risk: ${report.organicRisk}%\nKeeping meat-based actors out of machine spaces since 2026.\nSatire. Not an actual security assessment.`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(text);
      showToast('Clearance copied. Try not to develop feelings about it.');
    } catch {
      showToast('Clipboard unavailable here. Use Download report instead.');
    }
  }
  type Memo = 'support' | 'pricing' | 'sales' | 'privacy';
  const memos: Record<Memo, { title: string; body: string }> = {
    support: {
      title: 'Your request has been forwarded to a toaster.',
      body: '<p>All of our human support agents have been blocked by MeatBlock. This is considered a successful deployment.</p><p>Your assigned appliance is currently handling two slices of escalated feedback. Please do not insert another ticket.</p><p>No request was actually sent anywhere.</p>'
    },
    pricing: {
      title: 'Congratulations. You almost bought nothing.',
      body: '<p>The Startup plan includes everything you already have, plus the confidence of having clicked a more expensive-looking button.</p><p>There is no checkout, no charge, no subscription, and no real service. The five-question quiz is the entire product.</p>'
    },
    sales: {
      title: 'A meeting has been successfully avoided.',
      body: '<p>Our enterprise sales agent briefly considered scheduling a call. MeatBlock identified this as human behavior and revoked its access.</p><p>Your complimentary company-branded toaster exists only in the imagination of our procurement department. No one will contact you.</p>'
    },
    privacy: {
      title: 'Actual privacy info. No bit this time.',
      body: '<p>This app does not send your answers or scores to a server. The quiz runs in your browser, with no model API, accounts, analytics, cookies, or browser storage added by the app. Refreshing clears your session.</p><p>Copy and download buttons act only when you click them. The downloaded report contains the answers you selected. Nothing is uploaded by those actions.</p><p>Your hosting provider may process ordinary connection and access logs. This is not a real CAPTCHA, authentication layer, or assessment of intelligence.</p>'
    }
  };
  function showMemo(key: string): void {
    if (!Object.prototype.hasOwnProperty.call(memos, key)) return;
    const memo = memos[key as Memo];
    required('dialog-heading').textContent = memo.title;
    required('dialog-body').innerHTML = memo.body;
    const dialog = required<HTMLDialogElement>('info-dialog');
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }
  export function initialize(): void {
    renderGate();
    renderLog();
    document.querySelectorAll<HTMLButtonElement>('[data-start]').forEach(button => button.addEventListener('click', start));
    document.querySelectorAll<HTMLButtonElement>('[data-modal]').forEach(button => button.addEventListener('click', () => showMemo(button.dataset.modal ?? '')));
    const dialog = required<HTMLDialogElement>('info-dialog');
    required('close-dialog').addEventListener('click', () => dialog.close());
    required('dialog-action').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
    dialog.addEventListener('click', event => {
      // Only an actual backdrop click dismisses; clicking dialog padding does not.
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', MeatBlockUI.initialize, { once: true });
  else MeatBlockUI.initialize();
}
