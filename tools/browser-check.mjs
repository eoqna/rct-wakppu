#!/usr/bin/env node
// Drives headless Chrome over the DevTools protocol to check the game in a real browser.
//
//   node tools/browser-check.mjs <url> <scenario.json> [outDir]
//
// A scenario is a JSON array of steps:
//   { "do": "wait", "ms": 500 }
//   { "do": "waitFor", "expr": "!!window.__wakppu", "ms": 15000 }
//   { "do": "press", "code": "Enter" }                 key down + up
//   { "do": "hold", "code": "KeyW", "ms": 2000 }       held for a while
//   { "do": "down", "code": "KeyW" } / { "do": "up", "code": "KeyW" }
//   { "do": "click", "selector": "button.start" }
//   { "do": "drag", "dx": 200, "dy": 0 }               mouse drag across the middle of the page
//   { "do": "mobile", "width": 844, "height": 390 }    phone screen with touch; "reload" after it so the page starts as on a phone
//   { "do": "tap", "selector": ".jump" }               finger tap on an element's centre
//   { "do": "swipe", "selector": ".stick-zone", "dx": 0, "dy": -60, "hold": 1000 }
//                                                      finger drag from an element's centre (or from "x", "y"), held "hold" ms;
//                                                      "lift": false leaves the finger down for the next steps
//   { "do": "lift" }                                   lifts every finger still down
//   { "do": "pinch", "x": 600, "y": 160, "from": 80, "to": 200 }   two fingers spreading (or closing) around a point
// DevTools presses fingers one by one but lifts them only all at once, so a tap made while a swipe
// finger is held stays down too, until the next "lift".
//   { "do": "eval", "expr": "window.__wakppu.info()", "as": "name" }
//   { "do": "hide" } / { "do": "show" }                fires visibilitychange with document.hidden faked
//   { "do": "shot", "file": "start.png" }
//   { "do": "reload" }
//   { "do": "throttle", "rate": 4 }                    slow the CPU down, 1 = normal
//   { "do": "expect", "expr": "…", "equals": value }   fails the run unless the value matches (JSON equality)
// Prints a JSON report: console errors and warnings, uncaught exceptions, every "as" result and every
// expectation. Exits 1 when an expectation fails or the page throws.

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [url, scenarioPath, outDir = '.'] = process.argv.slice(2)
if (!url || !scenarioPath) {
  console.error('usage: node tools/browser-check.mjs <url> <scenario.json> [outDir]')
  process.exit(2)
}
const steps = JSON.parse(readFileSync(scenarioPath, 'utf8'))
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const KEYS = {
  Enter: { key: 'Enter', keyCode: 13 }, Space: { key: ' ', keyCode: 32 }, Escape: { key: 'Escape', keyCode: 27 },
  KeyW: { key: 'w', keyCode: 87 }, KeyA: { key: 'a', keyCode: 65 }, KeyS: { key: 's', keyCode: 83 }, KeyD: { key: 'd', keyCode: 68 },
  KeyR: { key: 'r', keyCode: 82 }, KeyM: { key: 'm', keyCode: 77 },
  ArrowUp: { key: 'ArrowUp', keyCode: 38 }, ArrowDown: { key: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', keyCode: 37 }, ArrowRight: { key: 'ArrowRight', keyCode: 39 },
}

const profile = mkdtempSync(join(tmpdir(), 'wakppu-chrome-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,800',
  '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })

const wsUrl = await new Promise((res, rej) => {
  let buf = ''
  const timer = setTimeout(() => rej(new Error('Chrome did not start')), 20000)
  chrome.stderr.on('data', (d) => {
    buf += d
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
    if (m) { clearTimeout(timer); res(m[1]) }
  })
})

const ws = new WebSocket(wsUrl)
await new Promise((res) => ws.addEventListener('open', res, { once: true }))
let nextId = 1
const pending = new Map()
const handlers = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) rej(new Error(msg.error.message)); else res(msg.result)
  } else if (msg.method) for (const h of handlers) h(msg)
})
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = nextId++
  pending.set(id, { res, rej })
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
})

const report = { console: [], exceptions: [], results: {}, shots: [], expectations: [] }
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const page = (method, params) => send(method, params, sessionId)
handlers.push((msg) => {
  if (msg.sessionId !== sessionId) return
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(msg.params.type)) {
    report.console.push({ type: msg.params.type, text: msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ') })
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    report.exceptions.push(d.exception?.description ?? d.text)
  }
  if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
    report.console.push({ type: `log-${msg.params.entry.level}`, text: `${msg.params.entry.text} ${msg.params.entry.url ?? ''}`.trim() })
  }
})
await page('Runtime.enable')
await page('Log.enable')
await page('Page.enable')
await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const evaluate = async (expr) => {
  const r = await page('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(`eval failed: ${expr}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`)
  return r.result.value
}
const key = async (type, code) => {
  const k = KEYS[code] ?? { key: code, keyCode: 0 }
  await page('Input.dispatchKeyEvent', {
    type, code, key: k.key, windowsVirtualKeyCode: k.keyCode, nativeVirtualKeyCode: k.keyCode,
    ...(type === 'keyDown' && k.key.length === 1 ? { text: k.key } : {}),
  })
}
const mouse = (type, x, y, buttons = 1) => page('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 })
const centre = (selector) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null })()`)

// every touch event lists all the fingers that are down
let fingers = []
let fingerId = 1
const finger = (x, y) => ({ x, y, id: fingerId++ })
const press = async (...pts) => {
  fingers.push(...pts)
  await page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers })
}
const slide = () => page('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers })
const liftAll = async () => {
  fingers = []
  await page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

await page('Page.navigate', { url })
await sleep(300)

for (const step of steps) {
  switch (step.do) {
    case 'wait': await sleep(step.ms); break
    case 'waitFor': {
      const until = Date.now() + (step.ms ?? 15000)
      let ok = false
      while (Date.now() < until) {
        try { if (await evaluate(step.expr)) { ok = true; break } } catch { /* page still loading */ }
        await sleep(100)
      }
      if (!ok) report.results[step.as ?? `waitFor:${step.expr}`] = 'TIMEOUT'
      break
    }
    case 'press': await key('keyDown', step.code); await sleep(40); await key('keyUp', step.code); break
    case 'down': await key('keyDown', step.code); break
    case 'up': await key('keyUp', step.code); break
    case 'hold': await key('keyDown', step.code); await sleep(step.ms); await key('keyUp', step.code); break
    case 'click': {
      const box = await centre(step.selector)
      if (!box) { report.results[`click:${step.selector}`] = 'NOT FOUND'; break }
      await mouse('mousePressed', box.x, box.y); await mouse('mouseReleased', box.x, box.y, 0)
      break
    }
    case 'drag': {
      const x = 640, y = 400
      await mouse('mousePressed', x, y)
      for (let i = 1; i <= 10; i++) { await mouse('mouseMoved', x + (step.dx * i) / 10, y + ((step.dy ?? 0) * i) / 10); await sleep(16) }
      await mouse('mouseReleased', x + step.dx, y + (step.dy ?? 0), 0)
      break
    }
    case 'mobile':
      await page('Emulation.setDeviceMetricsOverride', { width: step.width, height: step.height, deviceScaleFactor: 2, mobile: true })
      await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      break
    case 'tap': {
      const at = await centre(step.selector)
      if (!at) { report.results[`tap:${step.selector}`] = 'NOT FOUND'; break }
      const alone = fingers.length === 0
      await press(finger(at.x, at.y)); await sleep(40)
      if (alone) await liftAll()
      break
    }
    case 'swipe': {
      const from = step.selector ? await centre(step.selector) : { x: step.x, y: step.y }
      if (!from) { report.results[`swipe:${step.selector}`] = 'NOT FOUND'; break }
      const f = finger(from.x, from.y)
      await press(f)
      for (let i = 1; i <= 10; i++) {
        f.x = from.x + (step.dx * i) / 10; f.y = from.y + ((step.dy ?? 0) * i) / 10
        await slide(); await sleep(16)
      }
      if (step.hold) await sleep(step.hold)
      if (step.lift !== false) await liftAll()
      break
    }
    case 'lift': await liftAll(); break
    case 'pinch': {
      const a = finger(step.x - step.from / 2, step.y), b = finger(step.x + step.from / 2, step.y)
      await press(a, b)
      for (let i = 1; i <= 10; i++) {
        const half = (step.from + ((step.to - step.from) * i) / 10) / 2
        a.x = step.x - half; b.x = step.x + half
        await slide(); await sleep(16)
      }
      await liftAll()
      break
    }
    case 'eval': {
      const v = await evaluate(step.expr)
      if (step.as) report.results[step.as] = v
      break
    }
    case 'hide':
    case 'show':
      await evaluate(`Object.defineProperty(document, 'hidden', { value: ${step.do === 'hide'}, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); true`)
      break
    case 'shot': {
      const { data } = await page('Page.captureScreenshot', { format: 'png' })
      const file = resolve(outDir, step.file)
      writeFileSync(file, Buffer.from(data, 'base64'))
      report.shots.push(file)
      break
    }
    case 'reload': await page('Page.reload', {}); await sleep(300); break
    case 'throttle': await page('Emulation.setCPUThrottlingRate', { rate: step.rate }); break
    case 'expect': {
      let got
      try { got = await evaluate(step.expr) } catch (err) { got = `ERROR ${err.message}` }
      const ok = JSON.stringify(got) === JSON.stringify(step.equals)
      report.expectations.push({ name: step.name ?? step.expr, ok, got, want: step.equals })
      break
    }
    default: throw new Error(`unknown step ${step.do}`)
  }
}

console.log(JSON.stringify(report, null, 2))
ws.close()
chrome.kill()
await sleep(300)
rmSync(profile, { recursive: true, force: true })
const failed = report.expectations.filter((e) => !e.ok).length + report.exceptions.length
if (failed) process.exitCode = 1
