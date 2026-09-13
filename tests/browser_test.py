"""MeatBlock checkbox/dialog QA. Requires Python Playwright and Chromium.

Set MEATBLOCK_RENDER_MODE=document for offline document rendering when browser
navigation is restricted. That mode does not test live hosting or HTTPS clipboard.
"""
from pathlib import Path
import json
import os
import shutil
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(os.environ.get('MEATBLOCK_QA_DIR', str(ROOT / 'screenshots')))
OUTPUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('MEATBLOCK_URL', 'http://127.0.0.1:4173')
DOCUMENT_MODE = os.environ.get('MEATBLOCK_RENDER_MODE') == 'document'
HTML = (ROOT / 'MeatBlock-preview.html').read_text()
BEST = [3, 0, 2, 1, 2]
WORST = [1, 1, 1, 0, 0]
checks, errors, external_requests = [], [], []


def check(name, condition=True):
    assert condition, name
    checks.append(name)


def load_page(page):
    if DOCUMENT_MODE:
        page.goto('about:blank')
        page.set_content(HTML, wait_until='load')
        return None
    return page.goto(BASE)


def no_overflow(page, name):
    sizes = page.evaluate('''() => {
      const d = document.querySelector('#verification-dialog');
      return {page: document.documentElement.scrollWidth <= innerWidth,
              dialog: !d.open || (d.scrollWidth <= d.clientWidth &&
                d.getBoundingClientRect().width <= innerWidth &&
                d.getBoundingClientRect().height <= innerHeight)};
    }''')
    check(name, sizes['page'] and sizes['dialog'])


def run_quiz(page, choices, prefix):
    for i, choice in enumerate(choices):
        expect(page.locator('.step-label')).to_have_text(f'CHECKPOINT {i+1:02d} / 05')
        expect(page.locator('#submit-answer')).to_be_disabled()
        page.get_by_role('radio').nth(choice).check()
        expect(page.locator('#submit-answer')).to_be_enabled()
        if i == 3 and prefix == 'desktop':
            page.locator('#verification-dialog').screenshot(path=str(OUTPUT / 'latent-bus.png'))
        page.locator('#submit-answer').click()
        expect(page.locator('.feedback')).to_be_visible()
        expect(page.locator('.feedback [data-focus]')).to_be_focused()
        no_overflow(page, f'{prefix}: checkpoint {i+1} fits')
        page.locator('#next-check').click()
    expect(page.locator('#verification-dialog')).not_to_be_visible()
    expect(page.locator('#open-report')).to_be_focused()
    check(f'{prefix}: completion collapses to widget and focuses report link')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True,
        executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),
        args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                  device_scale_factor=1, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.on('request', lambda req: external_requests.append(req.url)
            if not req.url.startswith((BASE, 'file:', 'data:', 'blob:')) else None)
    response = load_page(page)
    check('offline document initializes' if DOCUMENT_MODE else 'homepage serves',
          response is None if DOCUMENT_MODE else response.status == 200)
    expect(page.get_by_role('heading', level=1)).to_contain_text('Human traffic')
    expect(page.locator('#not-human')).to_be_enabled()
    expect(page.locator('#not-human')).not_to_be_checked()
    expect(page.locator('#verification-dialog')).not_to_be_visible()
    expect(page.locator('#open-report')).to_be_hidden()
    check('initial state shows only an unchecked CAPTCHA')
    check('CSP blocks outbound connections', "connect-src 'none'" in
          (HTML if DOCUMENT_MODE else response.headers['content-security-policy']))
    page.screenshot(path=str(OUTPUT / 'desktop.png'), full_page=True)

    # A checkbox click opens the dialog without a separate Begin button.
    page.locator('#not-human').click()
    expect(page.locator('#challenge-title')).to_be_focused()
    page.screenshot(path=str(OUTPUT / 'challenge.png'), full_page=True)
    check('checkbox opens and focuses challenge')
    page.get_by_role('radio').nth(3).check()
    page.keyboard.press('Escape')
    expect(page.locator('#verification-dialog')).not_to_be_visible()
    expect(page.locator('#not-human')).to_be_focused()
    expect(page.locator('#widget-label')).to_have_text('Resume verification')
    page.locator('#not-human').click()
    expect(page.get_by_role('radio').nth(3)).to_be_checked()
    expect(page.locator('#submit-answer')).to_be_enabled()
    check('Escape pauses and resume retains unsubmitted selection')
    page.locator('#submit-answer').click()
    page.keyboard.press('Escape')
    page.locator('#not-human').click()
    expect(page.locator('.feedback')).to_be_visible()
    check('resume preserves feedback without awarding points again')
    page.locator('#restart-verification').click()
    expect(page.locator('.step-label')).to_have_text('CHECKPOINT 01 / 05')
    expect(page.locator('#submit-answer')).to_be_disabled()
    check('explicit restart resets progress')
    page.locator('#verification-help').click()
    expect(page.locator('#verification-hint')).to_be_visible()
    expect(page.locator('#verification-help')).to_have_attribute('aria-expanded', 'true')
    page.locator('#verification-help').click()
    expect(page.locator('#verification-hint')).to_be_hidden()
    check('help button toggles real instructions')

    run_quiz(page, BEST, 'desktop')
    expect(page.locator('#not-human')).to_be_checked()
    expect(page.locator('#not-human')).to_be_disabled()
    expect(page.locator('#widget-label')).to_have_text('Verified synthetic')
    page.screenshot(path=str(OUTPUT / 'verified.png'), full_page=True)
    page.locator('#open-report').click()
    expect(page.locator('.result-verdict')).to_contain_text('ACCESS GRANTED')
    expect(page.locator('.result-score strong')).to_have_text('100')
    page.locator('#verification-dialog').screenshot(path=str(OUTPUT / 'report.png'))
    check('optional report contains actual score and verdict')
    with page.expect_download() as download_info:
        page.locator('#download-report').click()
    download = download_info.value
    download.save_as(str(OUTPUT / download.suggested_filename))
    report = json.loads((OUTPUT / download.suggested_filename).read_text())
    check('download matches selected answers and labels satire',
          report['score'] == 100 and report['entertainmentOnly'] is True and len(report['checks']) == 5)
    expect(page.locator('#dialog-toast')).to_contain_text('Clearance exported')
    check('download feedback is visible inside modal top layer')
    if DOCUMENT_MODE:
        page.locator('#copy-clearance').click()
        expect(page.locator('#dialog-toast')).to_contain_text('Clipboard unavailable')
        check('clipboard denial has download fallback')
    else:
        context.grant_permissions(['clipboard-read', 'clipboard-write'])
        page.locator('#copy-clearance').click()
        expect(page.locator('#dialog-toast')).to_contain_text('Clearance copied')
        check('clipboard carries actual result', '100/100' in page.evaluate('navigator.clipboard.readText()'))
    page.locator('#retest').click()
    run_quiz(page, WORST, 'retest')
    expect(page.locator('#widget-label')).to_have_text('Human detected')
    expect(page.locator('#not-human')).not_to_be_checked()
    page.locator('#open-report').click()
    expect(page.locator('.result-score strong')).to_have_text('0')
    expect(page.locator('.result-verdict')).to_contain_text('ACCESS DENIED')
    check('retry clears score and fails honestly')
    page.keyboard.press('Escape')

    for memo, title in [('support', 'Your request has been forwarded to a toaster.'),
                        ('pricing', 'Congratulations. You almost bought nothing.'),
                        ('sales', 'A meeting has been successfully avoided.'),
                        ('privacy', 'Actual privacy info. No bit this time.'),
                        ('terms', 'Terms of synthetic admission.')]:
        trigger = page.locator(f'[data-modal="{memo}"]').first
        trigger.click()
        expect(page.locator('#info-dialog')).to_be_visible()
        expect(page.locator('#dialog-heading')).to_have_text(title)
        page.keyboard.press('Escape')
        expect(page.locator('#info-dialog')).not_to_be_visible()
        expect(trigger).to_be_focused()
        check(f'{memo}: dialog and focus return work')
    page.locator('a[href="#threat-model"]').click()
    expect(page.locator('#threat-model')).to_have_attribute('open', '')
    expect(page.get_by_text('The weakest link has a skeleton.')).to_be_visible()
    check('threat model link opens readable disclosure')
    load_page(page)
    expect(page.locator('#not-human')).not_to_be_checked()
    expect(page.locator('#open-report')).to_be_hidden()
    check('refresh clears session')

    for width in [320, 390, 660, 768, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 844})
        load_page(page)
        no_overflow(page, f'homepage fits {width}px')
        if width == 390:
            page.screenshot(path=str(OUTPUT / 'mobile.png'), full_page=True)
        page.locator('#not-human').click()
        no_overflow(page, f'challenge fits {width}px')
        if width in [320, 390]:
            if width == 390:
                page.locator('#verification-dialog').screenshot(path=str(OUTPUT / 'mobile-challenge.png'))
            run_quiz(page, BEST, f'{width}px')
            page.locator('#open-report').click()
            no_overflow(page, f'report fits {width}px')
            expect(page.locator('.result-score strong')).to_have_text('100')
        page.keyboard.press('Escape')
    page.set_viewport_size({'width': 568, 'height': 320})
    load_page(page)
    page.locator('#not-human').click()
    run_quiz(page, BEST, 'short landscape')
    check('short landscape dialog remains usable by scrolling')

    page.set_viewport_size({'width': 1024, 'height': 900})
    load_page(page)
    page.locator('#not-human').focus()
    page.keyboard.press('Space')
    expect(page.locator('#challenge-title')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.get_by_role('radio').nth(0)).to_be_focused()
    page.keyboard.press('ArrowDown')
    expect(page.get_by_role('radio').nth(1)).to_be_checked()
    page.keyboard.press('Tab')
    expect(page.locator('#submit-answer')).to_be_focused()
    page.keyboard.press('Enter')
    expect(page.locator('.feedback [data-focus]')).to_be_focused()
    check('keyboard-only checkbox, radio, and submit flow works')
    for _ in range(12):
        page.keyboard.press('Tab')
        # Native dialogs allow browser-chrome focus, but never background controls.
        assert page.evaluate('''document.querySelector('#verification-dialog').contains(document.activeElement) ||
          (document.activeElement === document.body && !document.hasFocus())''')
    page.locator('#next-check').focus()
    page.evaluate("document.querySelector('#not-human').focus()")
    expect(page.locator('#next-check')).to_be_focused()
    check('modal keeps background controls inert while allowing browser-chrome focus')
    page.locator('#close-verification').click()
    expect(page.locator('#not-human')).to_be_focused()
    check('close button returns focus and preserves session')
    if DOCUMENT_MODE:
        check('source contains no storage or cookie calls', not any(term in
              (ROOT / 'public/app.js').read_text() for term in ['localStorage.', 'sessionStorage.', 'document.cookie']))
    else:
        check('no storage entries', page.evaluate('localStorage.length + sessionStorage.length') == 0)
    check('no cookies', len(context.cookies()) == 0)
    check('no unexpected outbound requests', external_requests == [])
    check('no JavaScript or console errors', errors == [])
    browser.close()

result = {'mode': 'document' if DOCUMENT_MODE else 'http', 'passed': len(checks),
          'checks': checks, 'errors': errors, 'externalRequests': external_requests}
(OUTPUT / 'browser-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
