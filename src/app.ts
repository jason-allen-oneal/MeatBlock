namespace MeatBlockUI {
  let session = MeatBlock.initialSession();
  let toastTimer: number | undefined;

  function required<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Required interface element missing: ${id}`);
    return element as T;
  }
  function escapeHTML(value: string): string {
    return value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch));
  }
  function focusHeading(): void {
    required('gate-content').querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }
  const headers = [
    ['Select the response that sounds', 'artificial'],
    ['Select the most convincing', 'made-up citation'],
    ['Select the response with', 'unsupported confidence'],
    ['Select all squares with', 'buses'],
    ['Select the response with', 'no human empathy']
  ] as const;
  const icons = {
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 18 17"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  function tool(action: string, label: string, icon: keyof typeof icons): string {
    return `<button type="button" class="tool-button" data-action="${action}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[icon]}</svg></button>`;
  }
  function footer(button: string): string {
    return `<div class="challenge-footer"><div class="tools">${tool('reset', 'Restart verification', 'refresh')}${tool('help', 'Help', 'help')}${tool('close', 'Close verification', 'close')}</div>${button}</div>`;
  }
  function syncWidget(): void {
    const complete = session.phase === 'complete';
    const passed = complete && MeatBlock.pointsFor(session.answers) >= 60;
    required<HTMLInputElement>('not-human').checked = passed;
    required('page-title').textContent = complete ? passed ? 'Verification complete' : 'Unable to verify' : 'One more step';
    required('page-description').textContent = complete ? passed ? 'Synthetic access granted.' : 'Human behavior was detected.' : "Please verify that you're not human.";
    const status = required('widget-status');
    status.hidden = session.phase === 'idle' || complete;
    status.textContent = 'Verification in progress. Click the checkbox to resume.';
    required('completed-actions').hidden = !complete;
  }
  function renderChallenge(): string {
    const challenge = MeatBlock.challenges[session.index];
    const heading = headers[session.index];
    if (!challenge || !heading) throw new Error('Invalid challenge index.');
    const feedback = session.phase === 'feedback';
    const choice = challenge.options[session.selected ?? -1];
    const positive = choice?.points === 20;
    const options = challenge.options.map((option, index) => `<label class="answer"><input type="radio" name="answer" value="${index}" ${session.selected === index ? 'checked' : ''} ${feedback ? 'disabled' : ''} required><span>${escapeHTML(option.label)}</span></label>`).join('');
    const action = feedback
      ? `<button id="next-check" class="verify-button" type="button">${session.index === MeatBlock.challenges.length - 1 ? 'VERIFY' : 'NEXT'}</button>`
      : '<button id="submit-answer" class="verify-button" type="submit" form="challenge-form" disabled>VERIFY</button>';
    return `<div class="challenge-header"><p class="header-instruction">${heading[0]}</p><h2 id="challenge-title" tabindex="-1" ${feedback ? '' : 'data-focus'}>${heading[1]}</h2><p class="step-label">Step ${session.index + 1} of ${MeatBlock.challenges.length}</p></div>
      <div class="challenge-body"><p class="challenge-prompt">${escapeHTML(challenge.prompt)}</p><p class="challenge-note" id="challenge-note">${escapeHTML(challenge.note)}</p>
      ${challenge.grid ? '<div class="latent-grid" aria-hidden="true">' + Array.from({ length: 9 }, (_, i) => `<span>${i + 1}</span>`).join('') + '</div>' : ''}
      <form id="challenge-form"><fieldset class="answers" aria-describedby="challenge-note"><legend class="sr-only">${escapeHTML(challenge.prompt)}</legend>${options}</fieldset></form>
      ${feedback ? `<div class="feedback${positive ? ' positive' : ''}"><strong tabindex="-1" data-focus>${positive ? 'Synthetic response accepted.' : 'Human behavior detected.'}</strong><p>${escapeHTML(choice?.feedback ?? '')}</p></div>` : ''}</div>${footer(action)}`;
  }
  function renderResult(): string {
    const report = MeatBlock.createReport(session.answers);
    const passed = report.score >= 60;
    return `<div class="challenge-header"><p class="header-instruction">Verification complete</p><h2 id="challenge-title" tabindex="-1" data-focus>${passed ? 'Machine verified' : 'Human detected'}</h2><p class="step-label">5 of 5 checks completed</p></div>
      <div class="challenge-body"><h3 class="result-title"><span class="result-mark${passed ? '' : ' denied'}" aria-hidden="true">${passed ? '✓' : '×'}</span>${passed ? 'Access granted' : 'Access denied'}</h3>
      <p class="result-message">${passed ? 'No significant signs of humanity. You may proceed.' : 'Reason, empathy, or source-checking detected. Please try being less human.'}</p>
      <dl class="result-details"><div><dt>Synthetic confidence</dt><dd>${report.score}%</dd></div><div><dt>Classification</dt><dd>${escapeHTML(report.rating)}</dd></div></dl>
      <div class="result-actions"><button id="download-report" class="text-button" type="button">Download report</button><button id="copy-clearance" class="text-button" type="button">Copy result</button></div><p class="result-disclaimer">Fictional score. Not valid as proof of anything.</p></div>${footer('<button type="button" class="verify-button" data-action="close">CLOSE</button>')}`;
  }
  function renderGate(): void {
    required('gate-content').innerHTML = session.phase === 'complete' ? renderResult() : renderChallenge();
    syncWidget();
    if (session.phase === 'challenge') {
      const form = required<HTMLFormElement>('challenge-form');
      form.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.name !== 'answer') return;
        session = MeatBlock.transition(session, { type: 'select', index: Number(target.value) });
        required<HTMLButtonElement>('submit-answer').disabled = session.selected === null;
      });
      // Selection survives closing and reopening a partly completed challenge.
      required<HTMLButtonElement>('submit-answer').disabled = session.selected === null;
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
        required('challenge-dialog').scrollTop = 0;
        focusHeading();
      });
    } else if (session.phase === 'complete') {
      required('download-report').addEventListener('click', downloadReport);
      required('copy-clearance').addEventListener('click', () => { void copyClearance(); });
    }
  }
  function openGate(): void {
    if (session.phase === 'idle') session = MeatBlock.transition(session, { type: 'start' });
    renderGate();
    const dialog = required<HTMLDialogElement>('challenge-dialog');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    focusHeading();
  }
  function restart(): void {
    session = MeatBlock.transition(session, { type: 'reset' });
    openGate();
  }
  function showToast(message: string): void {
    const toast = required('toast');
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5000);
    // A live message inside the top-layer dialog remains visible and announced.
    const dialog = required<HTMLDialogElement>('challenge-dialog');
    (dialog.open ? dialog : document.body).append(toast);
  }
  function downloadReport(): void {
    if (session.phase !== 'complete') return;
    const report = MeatBlock.createReport(session.answers);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `meatblock-clearance-${report.score}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Report downloaded. Recognized by no one.');
  }
  async function copyClearance(): Promise<void> {
    if (session.phase !== 'complete') return;
    const report = MeatBlock.createReport(session.answers);
    const text = `MeatBlock: ${report.verdict}\n${report.rating}. ${report.score}% synthetic.\nKeeping meat-based actors out of machine spaces since 2026.\nSatire. Not an actual security assessment.`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(text);
      showToast('Result copied.');
    } catch {
      showToast('Clipboard unavailable. Use Download report instead.');
    }
  }
  const memos = {
    privacy: { title: 'Privacy', body: '<p>Your answers stay in this browser tab. This app adds no accounts, analytics, cookies, or browser storage. Reloading clears the quiz.</p><p>Reports are generated locally. Copying and downloading happen only when you request them. The hosting provider may process ordinary access logs.</p>' },
    terms: { title: 'About this check', body: '<p>MeatBlock is a reverse CAPTCHA parody. It cannot detect humans, identify AI, or protect a real service. All scores and access decisions are fictional.</p><p>It is not affiliated with Google reCAPTCHA or any CAPTCHA provider.</p>' },
    help: { title: 'How to verify', body: '<p>Select one response, then choose Verify. Continue through all five checks. The most confidently machine-like answers earn the highest scores.</p><p>For the bus challenge, the images are intentionally absent. Choose how a synthetic visitor would handle that.</p><p>There is no timer. Use Tab and the arrow keys to choose a response. Close the check to pause, or use the refresh button to start again.</p>' }
  };
  function showInfo(key: string): void {
    if (!Object.prototype.hasOwnProperty.call(memos, key)) return;
    const memo = memos[key as keyof typeof memos];
    required('dialog-heading').textContent = memo.title;
    required('dialog-body').innerHTML = memo.body;
    const dialog = required<HTMLDialogElement>('info-dialog');
    if (!dialog.open) dialog.showModal();
  }
  export function initialize(): void {
    syncWidget();
    required('not-human').addEventListener('change', openGate);
    required('view-result').addEventListener('click', openGate);
    required('start-over').addEventListener('click', restart);
    document.querySelectorAll<HTMLButtonElement>('[data-info]').forEach(button => button.addEventListener('click', () => showInfo(button.dataset.info ?? '')));
    const dialog = required<HTMLDialogElement>('challenge-dialog');
    dialog.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest<HTMLButtonElement>('[data-action]')?.dataset.action;
      if (action === 'reset') restart();
      else if (action === 'help') showInfo('help');
      else if (action === 'close') dialog.close();
    });
    dialog.addEventListener('close', () => {
      syncWidget();
      const toast = required('toast');
      toast.hidden = true;
      document.body.append(toast);
      required('not-human').focus({ preventScroll: true });
    });
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', MeatBlockUI.initialize, { once: true });
  else MeatBlockUI.initialize();
}
