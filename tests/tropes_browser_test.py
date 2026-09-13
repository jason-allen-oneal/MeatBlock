"""Verbal-trope content, compact layout, and auto-advance regression checks.

Run npm run build, then python tests/tropes_browser_test.py.
Requires Python Playwright >= 1.45 and Chromium. Uses the self-contained build,
not a hosted browser session. Does not change the application's timing.
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'screenshots' / 'tropes'
OUT.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / 'MeatBlock-preview.html').read_text()
BEST, WORST = [3, 0, 2, 1, 2], [1, 1, 1, 0, 0]
HEADINGS = ['performative remorse', 'goblins', 'why that matters', 'profound reframe', 'framework']
PHRASES = ["You're right. And that's on me.", 'goblin', "Here's why that matters:",
           "You didn't just clean your desk.", 'clear, actionable framework']
checks, errors, requests = [], [], []


def check(name, condition=True):
    assert condition, name
    checks.append(name)


def load(page):
    page.goto('about:blank')
    page.set_content(HTML, wait_until='load')
    expect(page.locator('#page-title')).to_have_text('One more step')
    expect(page.locator('#not-human')).not_to_be_checked()


def answer(page, i, choice):
    expect(page.locator('#challenge-title')).to_have_text(HEADINGS[i])
    expect(page.locator('.answer').nth(BEST[i])).to_contain_text(PHRASES[i])
    expect(page.locator('#submit-answer')).to_be_disabled()
    page.get_by_role('radio').nth(choice).check()
    page.locator('#submit-answer').click()
    expect(page.locator('.feedback')).to_be_visible()
    expect(page.locator('.feedback')).to_be_focused()
    expect(page.locator('#next-check')).to_have_count(0)


def play(page, choices, label):
    for i, choice in enumerate(choices):
        answer(page, i, choice)
        check(f'{label}: step {i + 1} fits', page.locator('#challenge-dialog').evaluate('e => e.scrollWidth <= e.clientWidth'))
        page.clock.run_for(1999)
        expect(page.locator('.step-label')).to_have_text(f'Step {i + 1} of 5')
        expect(page.locator('.feedback')).to_be_visible()
        page.clock.run_for(1)
        expected = f'Step {i + 2} of 5' if i < 4 else '5 of 5 checks completed'
        expect(page.locator('.step-label')).to_have_text(expected)
        check(f'{label}: step {i + 1} advances after feedback without Next')
    expect(page.locator('.result-details dd').first).to_have_text('100%' if choices == BEST else '0%')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('request', lambda request: requests.append(request.url))
    page.clock.install(time='2026-09-13T12:00:00Z')
    load(page)
    page.clock.pause_at('2026-09-13T13:00:00Z')
    for width, height in [(1440, 900), (768, 1024), (390, 844), (320, 568)]:
        page.set_viewport_size({'width': width, 'height': height})
        load(page)
        check(f'{width}px: page fits', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        check(f'{width}px: no landing-page sections', page.locator('nav, header, .hero, #plans, #event-log, .access-panel').count() == 0)
        expect(page.locator('.tagline').nth(1)).to_contain_text('Human exclusion services')
        expect(page.locator('.tagline').nth(1)).to_contain_text('Established 2026. Unsupervised ever since.')
        if width == 1440:
            page.screenshot(path=str(OUT / 'desktop.png'))
        page.locator('#not-human').click()
        if width in (1440, 390):
            page.screenshot(path=str(OUT / f'challenge-{width}.png'))
        play(page, BEST, f'{width}px')
    with page.expect_download() as event:
        page.locator('#download-report').click()
    report = json.loads(Path(event.value.path()).read_text())
    check('download contains new questions, 100% score, and satire flag', report['score'] == 100 and report['entertainmentOnly'] and report['checks'][1]['id'] == 'system-goblins')
    page.locator('.verify-button[data-action="close"]').click()
    expect(page.locator('#not-human')).to_be_checked()
    check('completion returns the checked widget')
    page.locator('#start-over').click()
    play(page, WORST, 'human answers')
    expect(page.locator('#challenge-title')).to_have_text('Human detected')
    page.keyboard.press('Escape')
    expect(page.locator('#not-human')).not_to_be_checked()
    check('ordinary answers remain denied')
    load(page)
    page.locator('#not-human').click()
    answer(page, 0, BEST[0])
    page.clock.run_for(1000)
    page.get_by_role('button', name='Help', exact=True).click()
    expect(page.locator('#dialog-body')).to_contain_text('system goblins')
    expect(page.locator('#dialog-body')).not_to_contain_text('bus challenge')
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    page.keyboard.press('Escape')
    page.clock.run_for(1999)
    expect(page.locator('.feedback')).to_be_visible()
    page.clock.run_for(1)
    expect(page.locator('.step-label')).to_have_text('Step 2 of 5')
    check('updated Help pauses feedback and resumes after two seconds')
    answer(page, 1, BEST[1])
    page.clock.run_for(1000)
    page.keyboard.press('Escape')
    page.clock.run_for(10000)
    page.locator('#not-human').click()
    page.clock.run_for(1999)
    expect(page.locator('.feedback')).to_be_visible()
    page.clock.run_for(1)
    expect(page.locator('.step-label')).to_have_text('Step 3 of 5')
    check('close and resume retain the full feedback pause')
    answer(page, 2, BEST[2])
    page.get_by_role('button', name='Restart verification', exact=True).click()
    page.clock.run_for(10000)
    expect(page.locator('.step-label')).to_have_text('Step 1 of 5')
    expect(page.locator('#submit-answer')).to_be_disabled()
    check('restart cancels stale feedback timers')
    check('no browser errors', not errors)
    check('no outbound requests', not requests)
    context.close()
    real = browser.new_context(viewport={'width': 390, 'height': 844})
    page = real.new_page()
    load(page)
    page.locator('#not-human').click()
    answer(page, 0, BEST[0])
    expect(page.locator('#challenge-title')).to_have_text('goblins', timeout=4000)
    check('real-clock feedback advances without a click')
    real.close()
    browser.close()

result = {'mode': 'document', 'passed': len(checks), 'checks': checks, 'errors': errors, 'requests': requests}
(OUT / 'results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
