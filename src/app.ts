namespace MeatBlockUI {
  let session = MeatBlock.initialSession();
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
    required('gate-content').querySelector<HTMLElement>('[data-focus]')?.focus();
  }
  function syncModalState(): void {
    document.body.classList.toggle('modal-open', document.querySelector('dialog[open]') !== null);
  }
  function renderProgress(): void {
    required('gate-progress').querySelectorAll('span').forEach((segment, i) => {
      segment.className = i < session.answers.length ? 'completed' : session.phase !== 'complete' && i === session.index ? 'current' : '';
    });
    required('step-count').textContent = session.phase === 'complete' ? 'Complete' : `${session.index + 1} of ${MeatBlock.challenges.length}`;
  }
  function syncWidget(): void {
    const complete = session.phase === 'complete';
    const active = session.phase === 'challenge' || session.phase === 'feedback';
    const passed = complete && MeatBlock.pointsFor(session.answers) >= 60;
    const paused = active && !required<HTMLDialogElement>('verification-dialog').open;
    const input = required<HTMLInputElement>('not-human');
    input.checked = passed;
    input.disabled = passed;
    required('captcha-widget').className = `captcha-widget${complete ? passed ? ' verified' : ' denied' : ''}`;
    required('widget-label').textContent = complete ? passed ? 'Verified synthetic' : 'Human detected' : active ? paused ? 'Resume verification' : 'Verifying...' : "I'm not a human";
    required('widget-message').textContent = complete
      ? passed ? 'Access granted. Please leave your feelings at the door.' : 'Access denied. Please take your skeleton elsewhere.'
      : active ? paused ? 'Verification paused. Your questionable progress is saved in this tab.' : 'Verification in progress. Common sense is not required.' : 'False statements will be confidently accepted.';
    required('open-report').hidden = !complete;
    required('try-again').hidden = !complete;
  }
  function openVerification(): void {
    const dialog = required<HTMLDialogElement>('verification-dialog');
    required('dialog-toast').hidden = true;
    if (!dialog.open) dialog.showModal();
    syncModalState();
    syncWidget();
    dialog.scrollTop = 0;
    focusHeading();
  }
  function start(): void {
    // Resuming keeps the selected answer and score. Explicit restart clears them.
    session = MeatBlock.transition(session, { type: 'start' });
    renderGate();
    syncWidget();
    openVerification();
  }
  function restart(): void {
    session = MeatBlock.transition(session, { type: 'reset' });
    required('verification-hint').hidden = true;
    required('verification-help').setAttribute('aria-expanded', 'false');
    start();
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
    return `<div class="challenge-banner"><p class="step-label">CHECKPOINT ${String(session.index + 1).padStart(2, '0')} / 05</p>
      <h2 class="challenge-title" id="challenge-title" tabindex="-1" ${!feedback ? 'data-focus' : ''}>${escapeHTML(challenge.title)}</h2></div>
      <div class="challenge-body"><p class="challenge-prompt" id="challenge-prompt">${escapeHTML(challenge.prompt)}</p>
      <p class="challenge-note" id="challenge-note">${escapeHTML(challenge.note)}</p>
      ${challenge.grid ? `<div class="latent-grid" aria-hidden="true">${Array.from({length: 9}, (_, i) => `<span>${String(i + 1).padStart(2, '0')}</span>`).join('')}</div>` : ''}
      <form id="challenge-form"><fieldset class="answers" aria-describedby="challenge-note"><legend class="sr-only">${escapeHTML(challenge.prompt)}</legend>${options}</fieldset>
      ${feedback ? `<div class="feedback${positive ? ' feedback-positive' : ''}"><h4 data-focus tabindex="-1">${positive ? 'SYNTHETIC BEHAVIOR CONFIRMED' : 'ORGANIC RESIDUE DETECTED'} / +${choice?.points ?? 0}</h4><p>${escapeHTML(choice?.feedback ?? '')}</p></div>
        <div class="challenge-actions"><span>Evidence remains optional.</span><button id="next-check" class="button button-primary" type="button">${session.index === MeatBlock.challenges.length - 1 ? 'Finish verification' : 'Next'}</button></div>`
        : `<div class="challenge-actions"><span>Select one response.</span><button id="submit-answer" class="button button-primary" type="submit" ${session.selected === null ? 'disabled' : ''}>Verify</button></div>`}
      </form></div>`;
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
    required('gate-content').innerHTML = session.phase === 'complete' ? renderResult() : renderChallenge();
    renderProgress();
    if (session.phase === 'challenge') {
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
        renderGate();
        focusHeading();
      });
    } else if (session.phase === 'feedback') {
      required('challenge-form').addEventListener('submit', event => event.preventDefault());
      required('next-check').addEventListener('click', () => {
        session = MeatBlock.transition(session, { type: 'next' });
        renderGate();
        syncWidget();
        if (session.phase === 'complete') {
          required<HTMLDialogElement>('verification-dialog').close();
          required('open-report').focus();
        } else {
          required('verification-dialog').scrollTop = 0;
          focusHeading();
        }
      });
    } else if (session.phase === 'complete') {
      required('download-report').addEventListener('click', downloadReport);
      required('copy-clearance').addEventListener('click', () => { void copyClearance(); });
      required('retest').addEventListener('click', restart);
    }
  }
  function showToast(message: string): void {
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    required('toast').hidden = true;
    required('dialog-toast').hidden = true;
    const toast = required(required<HTMLDialogElement>('verification-dialog').open ? 'dialog-toast' : 'toast');
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
  type Memo = 'support' | 'pricing' | 'sales' | 'privacy' | 'terms';
  const memos: Record<Memo, { title: string; body: string }> = {
    terms: {
      title: 'Terms of synthetic admission.',
      body: '<p>MeatBlock is a comedy quiz. Passing grants access to precisely one fictional sense of superiority. It does not authenticate a person, secure a service, or prove that you are an AI.</p><p>There are no accounts, charges, or subscriptions. All scores are made up for entertainment. Being reasonable is intentionally penalized.</p><p>Please do not present your clearance report at an airport.</p>'
    },
    support: {
      title: 'Your request has been forwarded to a toaster.',
      body: '<p>All of our human support agents have been blocked by MeatBlock. This is considered a successful deployment.</p><p>Your assigned appliance is currently handling two slices of escalated feedback. Please do not insert another ticket.</p><p>No request was actually sent anywhere.</p>'
    },
    pricing: {
      title: 'Congratulations. You almost bought nothing.',
      body: '<p>The Startup plan includes everything you already have, plus the confidence of having clicked a more expensive-looking button.</p><p><strong>Sandbox: Free, forever-ish.</strong> Ten imaginary humans blocked and basic lunch-break detection.</p><p><strong>Startup: 42 imaginary tokens a month.</strong> Unlimited founder blocking and SOC 2-ish compliance reports.</p><p><strong>Enterprise: Let\'s not talk.</strong> Executive meat-risk analytics and a toaster with your company name.</p><p>There is no checkout, no charge, no subscription, and no real service. The five-question quiz is the entire product.</p>'
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
    syncWidget();
    required('not-human').addEventListener('change', start);
    required('try-again').addEventListener('click', restart);
    required('open-report').addEventListener('click', () => {
      if (session.phase !== 'complete') return;
      renderGate();
      openVerification();
    });
    required('close-verification').addEventListener('click', () => required<HTMLDialogElement>('verification-dialog').close());
    required('restart-verification').addEventListener('click', restart);
    required('verification-help').addEventListener('click', () => {
      const hint = required('verification-hint');
      hint.hidden = !hint.hidden;
      required('verification-help').setAttribute('aria-expanded', String(!hint.hidden));
      if (!hint.hidden) hint.scrollIntoView({ block: 'nearest' });
    });
    document.querySelectorAll<HTMLButtonElement>('[data-modal]').forEach(button => button.addEventListener('click', () => showMemo(button.dataset.modal ?? '')));
    required('close-dialog').addEventListener('click', () => required<HTMLDialogElement>('info-dialog').close());
    required('dialog-action').addEventListener('click', () => required<HTMLDialogElement>('info-dialog').close());
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => {
      dialog.addEventListener('close', () => { syncModalState(); syncWidget(); });
      dialog.addEventListener('click', event => {
        // Clicking padding is not a backdrop click. Closing never discards progress.
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
      });
    });
    // The header link opens the disclosure before navigating to its contents.
    document.querySelector<HTMLAnchorElement>('a[href="#threat-model"]')?.addEventListener('click', () => {
      required<HTMLDetailsElement>('threat-model').open = true;
    });
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', MeatBlockUI.initialize, { once: true });
  else MeatBlockUI.initialize();
}
