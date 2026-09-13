"""Optional browser QA. Requires Python playwright and its Chromium browser."""
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

def load_page(page):
    if DOCUMENT_MODE:
        page.goto('about:blank')
        page.set_content(HTML, wait_until='load')
        return None
    return page.goto(BASE)
checks = []
errors = []
external_requests = []

def check(name, condition=True):
    assert condition, name
    checks.append(name)

def no_overflow(page, label):
    value = page.evaluate('({ width: innerWidth, scroll: document.documentElement.scrollWidth })')
    check(label, value['scroll'] <= value['width'])

def run_quiz(page, choices, prefix=''):
    for i, choice in enumerate(choices):
        expect(page.get_by_text(f'CHECKPOINT {i+1:02d} / 05', exact=True)).to_be_visible()
        expect(page.locator('#submit-answer')).to_be_disabled()
        page.get_by_role('radio').nth(choice).check()
        expect(page.locator('#submit-answer')).to_be_enabled()
        page.locator('#submit-answer').click()
        expect(page.locator('.feedback')).to_be_visible()
        no_overflow(page, f'{prefix}checkpoint {i+1} fits viewport')
        if i == 3 and prefix == 'desktop ':
            page.locator('#verify').screenshot(path=str(OUTPUT / 'meatblock-latent-bus.png'))
        page.locator('#next-check').click()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={ 'width': 1440, 'height': 1080 }, device_scale_factor=1, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.on('request', lambda req: external_requests.append(req.url) if not (req.url.startswith(BASE) or req.url.startswith('file:') or req.url.startswith('data:') or req.url.startswith('blob:')) else None)
    response = load_page(page)
    check('standalone markup initializes' if DOCUMENT_MODE else 'homepage serves successfully', response is None if DOCUMENT_MODE else response.status == 200)
    expect(page.get_by_role('heading', level=1)).to_contain_text('Human traffic')
    expect(page.locator('#begin-gate')).to_be_disabled()
    no_overflow(page, 'desktop homepage fits viewport')
    page.screenshot(path=str(OUTPUT / 'meatblock-desktop.png'), full_page=True)
    check('CSP disallows outbound connections', "connect-src 'none'" in (HTML if DOCUMENT_MODE else response.headers['content-security-policy']))
    page.get_by_role('checkbox', name="I'm not a human").check()
    page.locator('#begin-gate').click()
    run_quiz(page, [3, 0, 2, 1, 2], 'desktop ')
    expect(page.locator('.result-verdict')).to_contain_text('ACCESS GRANTED')
    expect(page.locator('.result-score strong')).to_have_text('100')
    expect(page.locator('.result-rating')).to_have_text('Unstable frontier model')
    check('perfect browser run awards 100')
    page.locator('#verify').screenshot(path=str(OUTPUT / 'meatblock-clearance.png'))
    with page.expect_download() as download_info:
        page.locator('#download-report').click()
    download = download_info.value
    download.save_as(str(OUTPUT / download.suggested_filename))
    report = json.loads((OUTPUT / download.suggested_filename).read_text())
    check('downloaded report matches result and labels satire', report['score'] == 100 and report['entertainmentOnly'] is True and len(report['checks']) == 5)
    if DOCUMENT_MODE:
        page.locator('#copy-clearance').click()
        expect(page.locator('#toast')).to_contain_text('Clipboard unavailable')
        check('clipboard denial has a usable download fallback')
    else:
        context.grant_permissions(['clipboard-read', 'clipboard-write'])
        page.locator('#copy-clearance').click()
        expect(page.locator('#toast')).to_contain_text('Clearance copied')
        check('clipboard contains actual result', '100/100' in page.evaluate('navigator.clipboard.readText()'))
    page.locator('#retest').click()
    run_quiz(page, [1, 1, 1, 0, 0], 'replay ')
    expect(page.locator('.result-verdict')).to_contain_text('ACCESS DENIED')
    expect(page.locator('.result-score strong')).to_have_text('0')
    check('replay clears old scores and denial works')
    for memo, heading in [
        ('support', 'Your request has been forwarded to a toaster.'),
        ('pricing', 'Congratulations. You almost bought nothing.'),
        ('sales', 'A meeting has been successfully avoided.'),
        ('privacy', 'Actual privacy info. No bit this time.')
    ]:
        trigger = page.locator(f'[data-modal="{memo}"]')
        trigger.click()
        expect(page.locator('#info-dialog')).to_be_visible()
        expect(page.locator('#dialog-heading')).to_have_text(heading)
        page.keyboard.press('Escape')
        expect(page.locator('#info-dialog')).not_to_be_visible()
        expect(trigger).to_be_focused()
        check(f'{memo} dialog opens, escapes, and returns focus')
    load_page(page)
    expect(page.locator('#not-human')).not_to_be_checked()
    check('refresh clears session')
    if DOCUMENT_MODE:
        check('no browser-storage API calls in app source', not any(term in (ROOT / 'public/app.js').read_text() for term in ['localStorage.', 'sessionStorage.', 'document.cookie']))
    else:
        check('app adds no local or session storage', page.evaluate('localStorage.length + sessionStorage.length') == 0)
    check('app adds no cookies', len(context.cookies()) == 0)
    for width in [320, 390, 768, 1024, 1440]:
        page.set_viewport_size({ 'width': width, 'height': 900 })
        load_page(page)
        no_overflow(page, f'homepage fits {width}px viewport')
        if width == 390:
            page.screenshot(path=str(OUTPUT / 'meatblock-mobile.png'), full_page=True)
            page.get_by_role('button', name="Prove you're an AI").click()
            run_quiz(page, [3, 0, 2, 1, 2], 'mobile ')
            expect(page.locator('.result-score strong')).to_have_text('100')
            page.locator('#verify').screenshot(path=str(OUTPUT / 'meatblock-mobile-clearance.png'))
            no_overflow(page, 'mobile result fits viewport')
            check('mobile end-to-end quiz completes')
    load_page(page)
    page.get_by_role('button', name="Prove you're an AI").focus()
    page.keyboard.press('Enter')
    expect(page.locator('#challenge-title')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.get_by_role('radio').nth(0)).to_be_focused()
    page.keyboard.press('ArrowDown')
    expect(page.get_by_role('radio').nth(1)).to_be_checked()
    page.keyboard.press('Tab')
    expect(page.locator('#submit-answer')).to_be_focused()
    page.keyboard.press('Enter')
    expect(page.locator('.feedback [data-focus]')).to_be_focused()
    check('keyboard start, radio navigation, submit, and focus handoff work')
    if DOCUMENT_MODE:
        load_page(page)
    else:
        page.goto((ROOT / 'MeatBlock-preview.html').as_uri())
    expect(page.locator('#not-human')).to_be_visible()
    page.get_by_role('button', name="Prove you're an AI").click()
    run_quiz(page, [3, 0, 2, 1, 2], 'offline ')
    expect(page.locator('.result-score strong')).to_have_text('100')
    check('standalone document completes offline with hash-based CSP')
    check('zero unexpected outbound requests', external_requests == [])
    check('zero JavaScript or console errors', errors == [])
    browser.close()

(OUTPUT / 'browser-results.json').write_text(json.dumps({ 'mode': 'document' if DOCUMENT_MODE else 'http', 'passed': len(checks), 'checks': checks, 'errors': errors, 'externalRequests': external_requests }, indent=2))
print(json.dumps({ 'passed': len(checks), 'errors': errors, 'externalRequests': external_requests }, indent=2))
