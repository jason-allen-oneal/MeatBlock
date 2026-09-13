"""CAPTCHA regressions, including automatic feedback progression.

Requires Python Playwright >= 1.45 and Chromium. Run the local preview server,
or set MEATBLOCK_RENDER_MODE=document to test the standalone build.
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


def answer(page, choice):
    expect(page.locator('#submit-answer')).to_be_disabled()
    page.get_by_role('radio').nth(choice).check()
    page.locator('#submit-answer').click()
    expect(page.locator('.feedback')).to_be_visible()
    expect(page.locator('.feedback')).to_be_focused()
    expect(page.locator('#next-check')).to_have_count(0)
    expect(page.locator('.auto-progress')).to_be_visible()


def play(page, answers, label):
    for i, choice in enumerate(answers):
        expect(page.locator('.step-label')).to_have_text(f'Step {i + 1} of 5')
        answer(page, choice)
        fits(page, f'{label}: step {i + 1} fits')
        page.clock.run_for(1999)
        expect(page.locator('.feedback')).to_be_visible()
        expect(page.locator('.step-label')).to_have_text(f'Step {i + 1} of 5')
        page.clock.run_for(1)
        expect(page.locator('.feedback')).to_have_count(0)
        expect(page.locator('#challenge-title')).to_be_focused()
    expect(page.locator('.step-label')).to_have_text('5 of 5 checks completed')
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('5 of 5 checks completed')
    check(f'{label}: all feedback waits 2 seconds, advances once, then stops at result')


def watch(page):
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('request', lambda r: requests.append(r.url) if not r.url.startswith((BASE, 'data:', 'blob:', 'file:')) else None)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', accept_downloads=True)
    page = context.new_page()
    watch(page)
    # Install before navigation; freeze time so boundary and race tests are exact.
    page.clock.install(time='2026-09-13T12:00:00Z')
    load(page)
    page.clock.pause_at('2026-09-13T13:00:00Z')
    expect(page.get_by_role('heading', level=1)).to_have_text('One more step')
    expect(page.locator('#challenge-dialog')).not_to_be_visible()
    check('compact widget is unchanged', page.locator('#checkbox-widget').bounding_box()['width'] == 304 and page.locator('#event-log').count() == 0)
    check('no marketing hero, pricing, navigation or support sections', page.locator('header, nav, #pricing, #event-log, .hero, .pricing, [data-info="support"], [data-info="sales"], [data-info="pricing"]').count() == 0 and page.locator('main section').count() == 1)
    page.mouse.move(0, 0)
    page.screenshot(path=str(OUT / 'desktop.png'))
    for key in ['privacy', 'terms']:
        trigger = page.locator(f'[data-info="{key}"]')
        trigger.click()
        expect(page.locator('#info-dialog')).to_be_visible()
        page.locator('#close-info').click()
        expect(trigger).to_be_focused()
        check(f'{key}: opens, closes, restores focus')
    page.locator('#not-human').click()
    page.screenshot(path=str(OUT / 'challenge.png'))
    page.clock.run_for(30000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    expect(page.locator('#submit-answer')).to_be_disabled()
    check('unanswered questions have no timer')
    play(page, BEST, 'desktop')
    expect(page.locator('#challenge-title')).to_have_text('Machine verified')
    expect(page.locator('.result-details dd').first).to_have_text('100%')
    check('perfect run verifies at 100%')
    with page.expect_download() as event:
        page.locator('#download-report').click()
    report = json.loads(Path(event.value.path()).read_text())
    check('download preserves score, five answers, satire flag', report['score'] == 100 and report['entertainmentOnly'] and len(report['checks']) == 5)
    if not DOCUMENT:
        context.grant_permissions(['clipboard-read', 'clipboard-write'])
    page.locator('#copy-clearance').click()
    expect(page.locator('#toast')).to_contain_text('Clipboard unavailable' if DOCUMENT else 'Result copied')
    check('clipboard fallback' if DOCUMENT else 'clipboard success')
    page.locator('.verify-button[data-action="close"]').click()
    expect(page.locator('#not-human')).to_be_checked()
    expect(page.locator('#not-human')).to_be_focused()
    check('success returns the checked widget')
    page.locator('#view-result').click()
    expect(page.locator('.result-details dd').first).to_have_text('100%')
    page.get_by_role('button', name='Restart verification', exact=True).click()
    play(page, WORST, 'replay')
    expect(page.locator('#challenge-title')).to_have_text('Human detected')
    expect(page.locator('.result-details dd').first).to_have_text('0%')
    page.keyboard.press('Escape')
    expect(page.locator('#not-human')).not_to_be_checked()
    check('negative feedback also advances; failure remains unchecked')

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
    page.keyboard.press('Space')
    expect(page.get_by_role('radio').nth(1)).to_be_checked()
    check('keyboard and selection survive close and resume')
    page.locator('#submit-answer').focus()
    page.keyboard.press('Enter')
    expect(page.locator('.feedback')).to_be_focused()
    # Repeated submit/Enter cannot create extra timers or points.
    page.locator('#challenge-form').dispatch_event('submit')
    page.keyboard.press('Enter')
    page.clock.run_for(1000)
    page.keyboard.press('Escape')
    page.clock.run_for(5000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    page.keyboard.press('Space')
    expect(page.locator('.feedback')).to_be_visible()
    page.clock.run_for(1999)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    page.clock.run_for(1)
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5')
    page.clock.run_for(5000)
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5')
    check('Escape pauses, resume restarts the full pause, repeated submit cannot skip')

    answer(page, BEST[1])
    page.clock.run_for(1000)
    page.get_by_role('button', name='Help', exact=True).click()
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5')
    page.keyboard.press('Escape')
    expect(page.get_by_role('button', name='Help', exact=True)).to_be_focused()
    page.clock.run_for(1999)
    expect(page.locator('.feedback')).to_be_visible()
    page.clock.run_for(1)
    expect(page.locator('.step-label')).to_have_text('Step 3 of 5')
    check('Help pauses progression and restores focus before restarting the delay')

    answer(page, BEST[2])
    page.clock.run_for(1000)
    # Model visibility events deterministically; this is not a real OS tab test.
    page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true, value:true}); document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 3 of 5')
    page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")
    page.clock.run_for(1999)
    expect(page.locator('.feedback')).to_be_visible()
    page.clock.run_for(1)
    expect(page.locator('.step-label')).to_have_text('Step 4 of 5')
    check('simulated hidden-tab events pause the timer and restore the full delay')

    answer(page, BEST[3])
    page.clock.run_for(1000)
    page.get_by_role('button', name='Restart verification', exact=True).click()
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    expect(page.locator('#submit-answer')).to_be_disabled()
    check('restart cancels the old timer and clears the attempt')
    answer(page, BEST[0])
    page.clock.run_for(1999)
    page.get_by_role('button', name='Close verification', exact=True).click()
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    page.locator('#not-human').click()
    page.clock.run_for(2000)
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5')
    check('close at the deadline never advances in the background')

    for width, height in [(320, 568), (390, 844), (768, 1024)]:
        page.set_viewport_size({'width': width, 'height': height})
        load(page)
        fits(page, f'{width}px: widget fits')
        page.locator('#not-human').click()
        play(page, BEST, f'{width}px')
        fits(page, f'{width}px: result fits')
        expect(page.locator('.result-details dd').first).to_have_text('100%')
    load(page)
    expect(page.locator('#not-human')).not_to_be_checked()
    expect(page.locator('#completed-actions')).not_to_be_visible()
    check('reload clears results')
    check('no storage or outbound API calls added', not any(s in (ROOT / 'public/app.js').read_text() for s in ['localStorage.', 'sessionStorage.', 'document.cookie', 'fetch(', 'XMLHttpRequest']))
    check('no cookies', context.cookies() == [])
    context.close()

    # One real-clock smoke test verifies that behavior is not dependent on mocks.
    real = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    page = real.new_page()
    watch(page)
    load(page)
    page.locator('#not-human').click()
    answer(page, BEST[0])
    page.screenshot(path=str(OUT / 'feedback-mobile.png'))
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5', timeout=4000)
    check('real-clock smoke test advances without a Next click')
    real.close()
    check('no unexpected outbound requests', requests == [])
    check('no browser console or JavaScript errors', errors == [])
    browser.close()

result = {'mode': 'document' if DOCUMENT else 'http', 'passed': len(checks), 'checks': checks, 'errors': errors, 'externalRequests': requests}
(OUT / 'browser-results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
