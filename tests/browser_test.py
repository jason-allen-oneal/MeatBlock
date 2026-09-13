"""CAPTCHA UI regression checks. Requires Playwright and Chromium.

Run a local preview server first, or set MEATBLOCK_RENDER_MODE=document to
exercise the self-contained build without network navigation.
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('MEATBLOCK_QA_DIR', str(ROOT / 'screenshots')))
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('MEATBLOCK_URL', 'http://127.0.0.1:4173')
DOCUMENT = os.environ.get('MEATBLOCK_RENDER_MODE') == 'document'
HTML = (ROOT / 'MeatBlock-preview.html').read_text()
checks, errors, requests = [], [], []
BEST, WORST = [3, 0, 2, 1, 2], [1, 1, 1, 0, 0]


def check(name, condition=True):
    assert condition, name
    checks.append(name)


def load(page):
    if DOCUMENT:
        page.goto('about:blank')
        page.set_content(HTML, wait_until='load')
    else:
        response = page.goto(BASE)
        assert response and response.status == 200
        assert "connect-src 'none'" in response.headers['content-security-policy']


def fits(page, label):
    size = page.evaluate('({width:innerWidth, scroll:document.documentElement.scrollWidth})')
    assert size['scroll'] <= size['width'], label
    dialog = page.locator('#challenge-dialog')
    if dialog.is_visible():
        assert dialog.evaluate('(e) => e.scrollWidth <= e.clientWidth'), label
        box = dialog.bounding_box()
        assert box and box['x'] >= 0 and box['x'] + box['width'] <= size['width']
    check(label)


def play(page, answers, label):
    for i, choice in enumerate(answers):
        expect(page.locator('.step-label')).to_have_text(f'Step {i + 1} of 5')
        expect(page.locator('#submit-answer')).to_be_disabled()
        page.get_by_role('radio').nth(choice).check()
        expect(page.locator('#submit-answer')).to_be_enabled()
        page.locator('#submit-answer').click()
        expect(page.locator('.feedback')).to_be_visible()
        fits(page, f'{label}: step {i + 1} fits')
        page.locator('#next-check').click()
    expect(page.locator('.step-label')).to_have_text('5 of 5 checks completed')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('request', lambda r: requests.append(r.url) if not r.url.startswith((BASE, 'data:', 'blob:', 'file:')) else None)
    load(page)
    expect(page.get_by_role('heading', level=1)).to_have_text('One more step')
    expect(page.locator('#challenge-dialog')).not_to_be_visible()
    check('compact checkbox replaces the landing page', page.locator('#checkbox-widget').bounding_box()['width'] == 304 and page.locator('#event-log').count() == 0)
    page.mouse.move(0, 0)
    page.screenshot(path=str(OUT / 'desktop.png'))
    for key in ['privacy', 'terms']:
        trigger = page.locator(f'[data-info="{key}"]')
        trigger.click()
        expect(page.locator('#info-dialog')).to_be_visible()
        page.locator('#close-info').click()
        expect(page.locator('#info-dialog')).not_to_be_visible()
        expect(trigger).to_be_focused()
        check(f'{key}: opens, closes, restores focus')
    page.locator('#not-human').click()
    expect(page.locator('#challenge-title')).to_be_focused()
    page.mouse.move(0, 0)
    page.screenshot(path=str(OUT / 'challenge.png'))
    play(page, BEST, 'desktop')
    expect(page.locator('#challenge-title')).to_have_text('Machine verified')
    expect(page.locator('.result-details dd').first).to_have_text('100%')
    check('perfect run verifies at 100%')
    with page.expect_download() as event:
        page.locator('#download-report').click()
    report = json.loads(Path(event.value.path()).read_text())
    check('report retains score, five answers and satire label', report['score'] == 100 and report['entertainmentOnly'] and len(report['checks']) == 5)
    if not DOCUMENT:
        context.grant_permissions(['clipboard-read', 'clipboard-write'])
    page.locator('#copy-clearance').click()
    expect(page.locator('#toast')).to_contain_text('Clipboard unavailable' if DOCUMENT else 'Result copied')
    check('clipboard fallback' if DOCUMENT else 'clipboard success')
    if not DOCUMENT:
        check('clipboard contains result', '100% synthetic' in page.evaluate('navigator.clipboard.readText()'))
    page.locator('.verify-button[data-action="close"]').click()
    expect(page.locator('#not-human')).to_be_checked()
    expect(page.locator('#not-human')).to_be_focused()
    expect(page.locator('#page-title')).to_have_text('Verification complete')
    check('success returns a green checked widget')
    page.locator('#view-result').click()
    expect(page.locator('.result-details dd').first).to_have_text('100%')
    page.get_by_role('button', name='Restart verification', exact=True).click()
    play(page, WORST, 'replay')
    expect(page.locator('#challenge-title')).to_have_text('Human detected')
    expect(page.locator('.result-details dd').first).to_have_text('0%')
    page.keyboard.press('Escape')
    expect(page.locator('#not-human')).not_to_be_checked()
    expect(page.locator('#page-title')).to_have_text('Unable to verify')
    check('replay clears answers; failure leaves the checkbox unchecked')
    load(page)
    page.locator('#not-human').focus()
    page.keyboard.press('Space')
    expect(page.locator('#challenge-title')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.get_by_role('radio').nth(0)).to_be_focused()
    page.keyboard.press('ArrowDown')
    expect(page.get_by_role('radio').nth(1)).to_be_checked()
    page.keyboard.press('Escape')
    expect(page.locator('#not-human')).to_be_focused()
    expect(page.locator('#widget-status')).to_be_visible()
    page.keyboard.press('Space')
    expect(page.get_by_role('radio').nth(1)).to_be_checked()
    expect(page.locator('#submit-answer')).to_be_enabled()
    check('keyboard launch, arrow selection, Escape, and resume preserve selection')
    page.locator('#submit-answer').focus()
    page.keyboard.press('Enter')
    expect(page.locator('.feedback [data-focus]')).to_be_focused()
    page.keyboard.press('Escape')
    page.keyboard.press('Space')
    expect(page.locator('.feedback')).to_be_visible()
    check('feedback survives close and resume without duplicate scoring')
    page.get_by_role('button', name='Help', exact=True).click()
    expect(page.locator('#info-dialog')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('button', name='Help', exact=True)).to_be_focused()
    expect(page.locator('#challenge-dialog')).to_be_visible()
    check('nested help restores focus to the still-open challenge')
    for width, height in [(320, 568), (390, 844), (768, 1024)]:
        page.set_viewport_size({'width': width, 'height': height})
        load(page)
        fits(page, f'{width}px: initial widget fits')
        page.locator('#not-human').click()
        if width == 390:
            page.mouse.move(0, 0)
            page.screenshot(path=str(OUT / 'mobile.png'))
        play(page, BEST, f'{width}px')
        fits(page, f'{width}px: result fits')
        expect(page.locator('.result-details dd').first).to_have_text('100%')
        if width == 390:
            page.mouse.move(0, 0)
            page.screenshot(path=str(OUT / 'mobile-result.png'))
    load(page)
    expect(page.locator('#not-human')).not_to_be_checked()
    expect(page.locator('#completed-actions')).not_to_be_visible()
    check('reload clears results')
    check('no storage or outbound application API calls', not any(s in (ROOT / 'public/app.js').read_text() for s in ['localStorage.', 'sessionStorage.', 'document.cookie', 'fetch(', 'XMLHttpRequest']))
    check('no cookies', context.cookies() == [])
    check('no unexpected outbound requests', requests == [])
    check('no browser console or JavaScript errors', errors == [])
    browser.close()

result = {'mode': 'document' if DOCUMENT else 'http', 'passed': len(checks), 'checks': checks, 'errors': errors, 'externalRequests': requests}
(OUT / 'browser-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
