# 왁뿌 타워 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계 문서의 웹 3D ASMR 탑 오르기 게임(탑 5개 × 난이도 3단계, 캐릭터 4종, 실제 녹음 소리, 이어 하기와 기록)을 지금 있는 Vite + React + TypeScript 프로젝트 안에 만든다.

**Architecture:** 물리, 발판 상태, 탑 배치, 저장은 Three.js에 기대지 않는 순수 TypeScript 모듈로 만들고 Vitest로 검증한다. 그 위에 Three.js 렌더 계층과 Web Audio 엔진을 얹고, `Game` 클래스가 루프와 상태를 묶는다. React는 화면(탑 고르기, HUD, 클리어)만 맡고 `useSyncExternalStore`로 `Game`을 구독한다. 탑은 데이터(스킨 + 계단 스크립트)라서 탑 5개가 같은 물리와 발판 동작을 쓴다.

**Tech Stack:** Vite 8.3, React 19.3 + React Compiler, TypeScript 6.0, three 0.186.1 (@types/three 0.186.0), Vitest 5.0.5, yarn 1.22

**Spec:** `docs/superpowers/specs/2026-10-22-wakppu-tower-design.md`

## Global Constraints

- 조정 값은 설계 9.1을 그대로 쓴다: 캐릭터 반지름 0.34, 키 1.45, 중력 26, 점프 속도 9.4, 달리기 4.8, 오를 수 있는 턱 0.36, 코요테 0.1초, 점프 버퍼 0.14초, 가속 땅 44/공중 20, 최대 낙하 24, 물리 4분할, 프레임 최대 0.05초, 카메라 거리 8.5(4~15), 상하 각도 0.08~1.15(기본 0.42), 나선 반지름 4.6, 기둥 반지름 2.2, 바닥 아래 12에서 다시 시작, 깨진 발판 복원 10초, 어려움 무너짐 0.7초 뒤 시작해 0.25초 동안 줄어듦, 시작 볼륨 70%, 컴프레서 threshold −20dB/knee 10/ratio 8/attack 2ms/release 120ms, 떼는 소리 50~60ms 늦게.
- 난이도(설계 6.4): 쉬움 간격 ×1 단차 ×1, 보통 ×1.25/×1.15, 어려움 ×1.45/×1.3 + 깨진 발판 무너짐. 배율은 점프 계단(arc > 1.5)에만 걸고 걷는 계단에는 절대 걸지 않는다.
- 키 눌림은 연출일 뿐 충돌 높이를 바꾸지 않는다. 턱 오르기 범위와 서 있기 판정 범위는 같은 값(`SUPPORT_R = 0.8 × 반지름`)을 쓴다(설계 9.2).
- 플레이 중 카메라는 저절로 돌지 않는다. 체크포인트로 돌아갈 때 한 번 체크포인트를 바라보게 도는 것만 예외다(설계 6.2).
- 발판 소리는 모두 녹음(CC0, 없으면 CC BY + 출처)이다. 합성 소리는 파일을 못 불러왔을 때의 대체와 점프·착지·체크포인트·클리어에만 쓴다. NC·ND는 쓰지 않는다(설계 7.1).
- 화면 문구는 한국어. 글꼴 Jua, Gowun Dodum은 프로젝트에 넣고 실행 중에 외부 글꼴이나 CDN을 부르지 않는다(설계 6.8).
- 서버와 로그인 없음. localStorage 키는 `wakppu.`로 시작하고, 저장소가 예외를 던져도 게임은 돈다(설계 8).
- 대상은 최신 Chrome, Edge 데스크톱. 터치 기기에는 'PC에서 열어 주세요'를 보여 준다(설계 4.2).
- 원작의 상표, 탑 이름, 발판 배치는 쓰지 않는다(설계 4.2).
- git 작업은 하지 않는다. 이 폴더는 git 저장소가 아니고, 커밋은 사용자가 요청할 때만 한다. 그래서 각 과제는 커밋 대신 `yarn test && yarn lint && yarn build` 통과로 끝낸다.

## Review Focus

1. 탭을 숨기거나 창 포커스를 잃은 순간: 눌린 키가 풀리고, 시간과 머무는 발판의 이어지는 소리가 멈추고, 돌아왔을 때 시간이 튀지 않아야 한다. → 과제 8 브라우저 점검.
2. 마우스 없이 Enter나 Space만으로 시작: 소리가 켜져야 한다. → 과제 8 브라우저 점검.
3. 저장된 진행이 지금 배치에 없는 체크포인트를 가리킴(탑 수정, 난이도 변경): 무시하고 처음부터, 오류 없이. → 과제 5 `sanitizeProgress` 테스트.
4. 소리 파일 하나가 404거나 디코딩에 실패: 그 소리만 합성으로 대신하고 나머지는 녹음으로 난다. → 과제 6 `resolveCue` 테스트.
5. 머무는 발판을 빠르게 밟았다 뗐다 하거나 그 위에서 R로 돌아감: 이어지는 소리가 겹치지 않고 0개 또는 1개만. → 과제 6 `LoopSet` 테스트, 과제 8 브라우저 점검.

---

## 파일 구조

| 파일 | 맡는 일 |
|---|---|
| `src/game/config.ts` | 조정 값, `DIFFICULTY`, `PACE`(예상 시간), 탑 길이 기준 |
| `src/game/types.ts` | 공용 타입 (`TowerId`, `DifficultyKey`, `SkinDef`, `StepDef`, `TowerDef` …) |
| `src/game/util.ts` | `clamp`, `damp`, `approach`, `lerpAngle`, `fmtTime`, `mulberry32` |
| `src/game/physics.ts` | 충돌 상자와 캐릭터 이동 (순수) |
| `src/game/platform.ts` | 발판 동작 상태 기계 (순수) |
| `src/game/layout.ts` | 계단 스크립트 → 배치, 검증 함수 |
| `src/game/save.ts` | 설정, 진행, 기록 저장 |
| `src/game/towers/kit.ts` | 계단 도우미(`keys`, `hops`, `checkpoint`, `goal`)와 공통 스킨 |
| `src/game/towers/<id>.ts`, `index.ts` | 탑 정의와 표시 순서 |
| `src/game/audio/cues.ts` | 소리 표(`CUES`), `cuesForTower`, `resolveCue` |
| `src/game/audio/loops.ts` | `LoopSet` (이어지는 소리 중복 방지) |
| `src/game/audio/synth.ts` | 합성 소리 (맛보기에서 옮김) |
| `src/game/audio/engine.ts` | `AudioEngine` (Web Audio) |
| `src/game/render/stage.ts` | 렌더러, 장면, 테마(하늘, 안개, 기둥, 바닥, 구름) |
| `src/game/render/textures.ts` | 캔버스 텍스처 |
| `src/game/render/views.ts` | `PlatformView` 인터페이스와 모양 등록 |
| `src/game/render/shapes/common.ts`, `shapes/<id>.ts` | 체크포인트·받침·꼭대기, 탑별 발판 모양 |
| `src/game/render/effects.ts` | 조각, 껍질, 거품, 눈가루 |
| `src/game/render/characters.ts` | 캐릭터 4종 |
| `src/game/render/avatar.ts` | 캐릭터 연출과 접지 그림자 |
| `src/game/render/cameraRig.ts` | 메뉴 회전, 따라가기, 드래그, 줌, 가림 처리 |
| `src/game/input.ts` | 키보드·포인터 입력 |
| `src/game/Game.ts` | 루프와 상태를 묶는 클래스 |
| `src/ui/useGame.ts`, `StartScreen.tsx`, `Hud.tsx`, `ClearScreen.tsx`, `ui.css` | React 화면 |
| `src/App.tsx`, `src/index.css`, `src/main.tsx` | 진입점과 기본 스타일 |
| `src/assets/fonts/` | Jua, Gowun Dodum woff2와 OFL 라이선스 |
| `public/sounds/shared/` | 맛보기 소리 23개와 `credits.json` |
| `public/sounds/<id>/` | 탑별 소리와 `credits.json` (소리 담당이 만든다) |
| `tests/*.test.ts`, `tests/helpers/` | Vitest |
| `tools/browser-check.mjs` | 헤드리스 Chrome 점검 도구 |
| `docs/spike/index.html` | 맛보기 참고본 |

소리 파일 규칙(소리 담당과 맞춘 약속): 한 번 나는 소리는 `public/sounds/<pack>/<cue>-01.wav`부터 두 자리 번호, 이어지는 소리(`-loop`)는 `<cue>-01.wav` 하나, 출처는 `public/sounds/<pack>/credits.json`의 `cues.<cue>.sources`, 못 구한 소리는 `missing`.

---

### Task 1: 프로젝트 준비

**Files:**
- Modify: `package.json` (deps, `"test": "vitest run"`), `vite.config.ts` (`base: './'`), `tsconfig.json` (참조 추가), `tsconfig.node.json` (`vitest.config.ts` 포함), `index.html` (`lang="ko"`, 제목 `왁뿌 타워`), `src/App.tsx` (임시로 제목만), `src/index.css` (템플릿 스타일 비우기)
- Create: `vitest.config.ts`, `tsconfig.test.json`, `docs/spike/index.html`, `public/sounds/shared/*.wav` 23개, `public/sounds/shared/credits.json`
- Delete: `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`

**Interfaces:**
- Produces: `yarn test`가 `tests/**/*.test.ts`를 node 환경에서 돌린다. `tsconfig.test.json`은 `tests`를 포함하고 `types: ["node"]`.

- [ ] **Step 1:** `yarn add three@0.186.1` / `yarn add -D @types/three@0.186.0 vitest@5.0.5`
- [ ] **Step 2:** Artifact `read`로 맛보기(`https://claude.ai/artifact/2fGECATtywoHUH4rr4fPw8`)의 `index.html`과 `sounds/*.wav` 23개를 받아 `docs/spike/index.html`, `public/sounds/shared/`에 둔다.
- [ ] **Step 3:** `public/sounds/shared/credits.json`에 `blue-press`(10), `blue-release`(6) → Freesound #638035 simeonradivoev CC0, `wax-crunch`(7) → #336633 Anthousai CC0를 소리 파일 규칙 형식으로 적는다.
- [ ] **Step 4:** 템플릿 파일을 지우고 설정 파일을 고친다. `vitest.config.ts`: `test: { include: ['tests/**/*.test.ts'], environment: 'node', passWithNoTests: true }`.
- [ ] **Step 5:** Run: `yarn test && yarn lint && yarn build` → 모두 통과.

### Task 2: 물리

**Files:**
- Create: `src/game/config.ts`, `src/game/types.ts`, `src/game/util.ts`, `src/game/physics.ts`, `tests/helpers/spiral.ts`, `tests/physics.test.ts`

**Interfaces:**
- Produces:
```ts
// config.ts — Global Constraints 값 그대로
export const PLAYER: { radius: 0.34; height: 1.45; gravity: 26; jumpSpeed: 9.4; runSpeed: 4.8; stepUp: 0.36; coyote: 0.1; jumpBuffer: 0.14; accelGround: 44; accelAir: 20; maxFall: 24 }
export const SUPPORT_R: number            // PLAYER.radius * 0.8
export const PHYSICS: { substeps: 4; maxDt: 0.05; respawnBelow: -12; rideSnap: 0.4 }
export const TOWER: { radius: 4.6; pillarRadius: 2.2; floorRadius: 40; jumpArc: 1.5; startTop: 0.3 }
// util.ts
export function clamp(v: number, a: number, b: number): number
export function damp(rate: number, dt: number): number          // 1 - exp(-rate*dt)
export function approach(v: number, target: number, step: number): number
export function lerpAngle(a: number, b: number, t: number): number
export function fmtTime(sec: number): string                      // 'MM:SS'
export function mulberry32(seed: number): () => number
// physics.ts
export interface Collider { id: number; cx: number; cz: number; hx: number; hz: number; cos: number; sin: number; top: number; bottom: number; off: boolean }
export const FLOOR: Collider                                       // id -1, top 0
export function makeCollider(id: number, cx: number, cz: number, yaw: number, hx: number, hz: number, top: number, bottom: number): Collider
export function horizDist2(c: Collider, x: number, z: number): number
export interface PlayerState { x: number; y: number; z: number; vx: number; vy: number; vz: number; grounded: boolean; ground: Collider | null; coyote: number; jumpBuf: number }
export interface World { colliders: Collider[]; pillarTop: number }
export interface StepEvents { jumped: boolean; landingSpeed: number | null; groundChanges: (Collider | null)[] }
export function createPlayer(): PlayerState
export function resetPlayer(p: PlayerState, x: number, y: number, z: number): void
export function requestJump(p: PlayerState): void
export function stepPlayer(p: PlayerState, world: World, moveX: number, moveZ: number, dt: number): StepEvents
```
`stepPlayer`은 맛보기의 `controlStep` → 발판 따라 붙기(`rideSnap`) → `physicsStep` 4번(`collideHorizontal`, `collideVertical`, 기둥 밀어내기, 바닥)을 그대로 옮긴다. `groundChanges`는 서 있는 상자가 바뀔 때마다(같은 상자 연속은 빼고) 새 상자를 순서대로 담는다. `moveX/moveZ`는 이미 카메라 기준으로 바꾼 월드 방향(길이 1 또는 0)이다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/helpers/spiral.ts`에 `spiralKey(id, t, top, o?)`(반지름 4.6, 반폭 0.65, 높이 0.55, yaw = atan2(cos t, −sin t))와 `tangentAt(x, z)`(t = atan2(−z, x)에서 (−sin t, −cos t)). `tests/physics.test.ts`:
  - `boundary between two bridge keys flips ground at most twice in 3 s`: 같은 높이 1.0의 키 두 개(arc 1.36), 그 사이 호의 가운데에 y=1.01로 세우고 입력 없이 dt=1/60로 180번 → 모든 `groundChanges` 길이 합 ≤ 2
  - `boundary between two stair keys flips ground at most twice in 3 s`: 같은 조건, 둘째 키만 0.3 높게
  - `climbing a 6-key staircase enters each key exactly once in order`: 출발 받침(top 0.3) 뒤로 arc 1.36·rise 0.3 키 6개, 매 프레임 `tangentAt` 방향으로 이동 → null이 아닌 변화의 id 순서가 `[0,1,2,3,4,5,6]`
  - `jump apex is 1.70 ± 0.05 above the floor`
  - `walks up a 0.35 ledge without jumping and is blocked by a 0.45 ledge`
- [ ] **Step 2:** Run: `yarn test tests/physics.test.ts` → FAIL (모듈 없음)
- [ ] **Step 3:** `config.ts`, `types.ts`(`DifficultyKey`, `TowerId`, `CharacterId`), `util.ts`, `physics.ts` 구현. `docs/spike/index.html`의 `collideHorizontal`, `collideVertical`, `physicsStep`, `controlStep`를 옮긴다.
- [ ] **Step 4:** Run: `yarn test tests/physics.test.ts` → PASS, 이어서 `yarn lint && yarn build`

### Task 3: 발판 동작

**Files:**
- Modify: `src/game/types.ts`
- Create: `src/game/platform.ts`, `tests/platform.test.ts`

**Interfaces:**
- Consumes: `Collider` (Task 2)
- Produces:
```ts
export type Action = 'key' | 'breakable' | 'squishy' | 'stay' | 'checkpoint' | 'goal' | 'plain'
export type CueId = string                                  // 'shared/blue-press-low', 'synth:chime' …
export interface SkinCues { enter?: CueId; leave?: CueId; crack?: CueId; collapse?: CueId; loop?: CueId; tick?: { cue: CueId; every: [number, number] } }
export interface SkinDef {
  action: Action; shape: string; hx: number; hz: number; topRest: number; botRest: number;
  cracked?: { topRest: number; botRest: number }; squash?: number; kick?: number; soft?: number;
  color?: string; cues: SkinCues
}
export interface PlatformState {
  index: number; skin: SkinDef; baseY: number; topRest: number; botRest: number;
  sy: number; svy: number; target: number; press: number; pressTarget: number;
  cracked: boolean; regenAt: number; collapseAt: number; collapsed: boolean; shrink: number; grow: number;
  active: boolean; standing: boolean; collider: Collider
}
export type PlatformEvent =
  | { type: 'cue'; cue: CueId } | { type: 'crack' } | { type: 'collapse' } | { type: 'restore' }
  | { type: 'loopStart'; cue: CueId } | { type: 'loopStop' } | { type: 'checkpoint' } | { type: 'goal' }
export type Emit = (index: number, e: PlatformEvent) => void
export const BREAKABLE: { regenSec: 10; collapseDelay: 0.7; collapseShrink: 0.25; regrowSec: 0.35 }
export function createPlatformState(index: number, skin: SkinDef, collider: Collider): PlatformState
export function enterPlatform(p: PlatformState, now: number, collapse: boolean, emit: Emit): void
export function leavePlatform(p: PlatformState, now: number, emit: Emit): void
export function updatePlatform(p: PlatformState, dt: number, now: number, emit: Emit): void
export function resetPlatform(p: PlatformState): void
```
동작 값(맛보기 그대로): 키는 들어올 때 `pressTarget = -0.12`와 `enter` 소리, 나갈 때 0과 `leave` 소리. 깨지는 발판은 처음 들어올 때 `crack` 이벤트와 `crack` 소리, `svy -= 3.4`, `topRest/botRest = cracked`, `regenAt = now + 10`, 무너짐이면 `collapseAt = now + 0.7`, `target = squash ?? 0.8`; 그다음부터는 `svy -= 2.2`와 `enter` 소리; 나갈 때 `target = cracked ? 0.9 : 1`. 말랑 발판은 `target = squash`, `svy -= kick`, `enter` 소리; 나갈 때 `target = 1`, `svy += kick * 0.57`. 머무는 발판은 말랑 발판에 더해 들어올 때 `loopStart(loop)`, 나갈 때 `loopStop`과 `leave` 소리. 체크포인트는 처음 한 번만 `checkpoint` 이벤트와 `synth:chime`. 꼭대기는 `goal`. 갱신은 스프링(k 240, 감쇠 `soft ?? 15`), 눌림(`damp(30)`), 복원(깨졌고 10초 지났고 위에 아무도 없을 때, 0.35초 동안 다시 부풂), 무너짐(0.25초 동안 `topRest/botRest`를 줄이고 0이 되면 `collider.off`), 마지막에 `collider.top = baseY + topRest * sy`, `collider.bottom = baseY + botRest * sy`.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/platform.test.ts` (스킨은 테스트 안에서 정의):
  - `key press is cosmetic: collider top stays while pressed`
  - `key plays enter on step and leave on step-off`
  - `breakable cracks once, then plays the soft cue`
  - `breakable restores after 10 s only once nobody stands on it` (10초에 서 있으면 그대로, 내려간 뒤 갱신에서 `restore`)
  - `hard collapse starts at 0.7 s and turns the collider off 0.25 s later` (0.69초 미발생, 0.71초 `collapse`, 0.97초 `collider.off === true`, 10초 뒤 복원하면 `off === false`)
  - `stay starts its loop on enter and stops it on leave`
  - `checkpoint fires once`
- [ ] **Step 2:** Run: `yarn test tests/platform.test.ts` → FAIL
- [ ] **Step 3:** `platform.ts` 구현 (맛보기 `onEnter`, `onLeave`, `updatePlatforms`, `restoreWax`를 일반화)
- [ ] **Step 4:** Run: `yarn test tests/platform.test.ts` → PASS, `yarn lint && yarn build`

### Task 4: 탑 배치와 검증

**Files:**
- Modify: `src/game/types.ts`, `src/game/config.ts`
- Create: `src/game/layout.ts`, `src/game/towers/kit.ts`, `tests/helpers/fixtureTower.ts`, `tests/layout.test.ts`

**Interfaces:**
- Consumes: `SkinDef` (Task 3), `TOWER` (Task 2)
- Produces:
```ts
// types.ts
export interface StepDef { skin: string; arc: number; rise: number; r?: number; label?: string; color?: string; tier?: 1 | 2 | 3 }
export interface TowerTheme { sky: [string, string]; fog: string; pillar: [string, string]; floor: [string, string]; accent: string; palette: string[] }
export interface TowerDef { id: TowerId; name: string; blurb: string; theme: TowerTheme; skins: Record<string, SkinDef>; steps: StepDef[] }  // skins에 'checkpoint', 'pad', 'goal' 필수
export interface PlacedPlatform { index: number; skinId: string; skin: SkinDef; t: number; r: number; x: number; z: number; yaw: number; top: number; jump: boolean; label?: string; color?: string; checkpoint?: number }
export interface Layout { platforms: PlacedPlatform[]; checkpoints: number[]; goal: number; goalTop: number }
// config.ts
export const DIFFICULTY: Record<DifficultyKey, { label: string; gap: number; rise: number; keep: 1 | 2 | 3; collapse: boolean; note: string }>
   // easy {쉬움, 1, 1, 3, false}, normal {보통, 1.25, 1.15, 2, false}, hard {어려움, 1.45, 1.3, 1, true}
export const PACE: { jumpSec: 2.0; walkSec: 0.5 }
export const LENGTH: { intro: [180, 300]; tower: [300, 480]; stretch: Record<DifficultyKey, number> }  // stretch: easy 120, normal 180, hard 240
// layout.ts
export function buildLayout(tower: TowerDef, diff: DifficultyKey): Layout
export function estimateSeconds(layout: Layout): { total: number; worstStretch: number }
export function clearanceViolations(layout: Layout, minGap?: number): Array<[number, number]>   // 기본 3.2
export function unreachableJumps(layout: Layout, safety?: number): number[]                      // 기본 0.9
// towers/kit.ts
export function keys(skin: string, text: string, o: { first: number; rise: number; arc?: number; colors?: string[] }): StepDef[]   // arc 기본 1.36, 첫 칸만 first
export function hops(skin: string | string[], n: number, o: { arc: number; rise: number; r?: number[]; colors?: string[] }): StepDef[]
export function checkpoint(tier: 1 | 2 | 3, arc: number, rise: number): StepDef
export function goal(arc: number, rise: number): StepDef
export const COMMON_SKINS: { checkpoint: SkinDef; pad: SkinDef; goal: SkinDef }  // 맛보기 치수: 받침 반폭 0.98·topRest 0.3, 꼭대기 반폭 1.4·topRest 0.4
```
배치 규칙: 0번은 `checkpoint` 스킨, t = 0, top = 0.3, checkpoint 0. 각 계단은 `jump = arc > 1.5`, `t += (jump ? arc × gap : arc) / 4.6`, `top += jump ? rise × riseMul : rise`, `r = 4.6 + (r ?? 0)`, `x = r cos t`, `z = −r sin t`, `yaw = atan2(cos t, −sin t)`(로컬 x = 나선 진행 방향). `tier ≤ keep`인 체크포인트만 체크포인트로, 나머지는 같은 자리에 `pad`. 마지막 계단이 꼭대기가 아니면 예외.
검증: `estimateSeconds`는 점프 2.0초, 걷기 0.5초를 더하고 체크포인트 사이(마지막 체크포인트→꼭대기 포함) 최댓값을 `worstStretch`로 준다. `unreachableJumps`는 점프마다 단차 r에서 체공 시간 `t(r) = (9.4 + √(9.4² − 2·26·r)) / 26`(r > 1.5면 불가), 가능 거리 `4.8 · t(r)`, 필요 거리 = 두 회전 상자 사이 간격(중심 거리 − 서로를 향한 반폭)으로 보고 `필요 > 가능 × safety`인 발판 번호를 준다. `clearanceViolations`는 바닥 면이 겹치는 두 발판에서 위 발판 밑면과 아래 발판 윗면 사이가 `minGap`보다 좁은 쌍을 준다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/layout.test.ts` (`fixtureTower`는 키 계단 4칸, 점프 3번, 체크포인트 tier 1·2·3 하나씩, 꼭대기):
  - `walk steps keep their spacing on every difficulty`
  - `jump steps scale arc by gap and rise by the rise multiplier` (어려움 Δtop = rise × 1.3, Δt = arc × 1.45 / 4.6)
  - `checkpoint tiers: easy keeps 4, normal 3, hard 2 including the start`
  - `dropped checkpoints become pads at the same spot`
  - `the goal must be the last step` (예외)
  - `estimateSeconds adds 2.0 s per jump and 0.5 s per walk` (총합과 worstStretch 값 고정)
  - `unreachableJumps flags a 1.8 rise and a 4 m gap but not spike-sized jumps` (arc 2.3·rise 0.75 어려움 통과)
  - `clearanceViolations flags a platform 2 m above an overlapping one`
- [ ] **Step 2:** Run: `yarn test tests/layout.test.ts` → FAIL
- [ ] **Step 3:** `layout.ts`, `kit.ts` 구현, `config.ts`에 `DIFFICULTY`, `PACE`, `LENGTH`
- [ ] **Step 4:** Run: `yarn test tests/layout.test.ts` → PASS, `yarn lint && yarn build`

### Task 5: 저장

**Files:**
- Create: `src/game/save.ts`, `tests/save.test.ts`

**Interfaces:**
- Produces:
```ts
export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface Prefs { tower: TowerId; character: CharacterId; difficulty: DifficultyKey; volume: number; muted: boolean }
export interface Progress { checkpoint: number; elapsed: number; steps: number; savedAt: number }
export interface RecordEntry { bestTime: number; bestSteps: number; clears: number }
export const DEFAULT_PREFS: Prefs   // { tower: 'rainbow', character: 'wakppu', difficulty: 'easy', volume: 0.7, muted: false }
export function getBrowserStorage(): StorageLike | null
export function sanitizeProgress(p: Progress | null, checkpointCount: number): Progress | null
export interface Save {
  loadPrefs(): Prefs; savePrefs(p: Prefs): void;
  loadProgress(t: TowerId, d: DifficultyKey): Progress | null; saveProgress(t: TowerId, d: DifficultyKey, p: Progress): void; clearProgress(t: TowerId, d: DifficultyKey): void;
  loadRecord(t: TowerId, d: DifficultyKey): RecordEntry | null; recordClear(t: TowerId, d: DifficultyKey, time: number, steps: number): { newBest: boolean; record: RecordEntry }
}
export function createSave(storage: StorageLike | null, known: { towers: readonly TowerId[]; characters: readonly CharacterId[] }): Save
```
키: `wakppu.prefs`, `wakppu.progress.<tower>.<diff>`, `wakppu.record.<tower>.<diff>`. 읽을 때 형식이 틀리거나 모르는 탑·캐릭터면 기본값, 볼륨은 0~1로 자르고 숫자가 아니면 기본값.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/save.test.ts`:
  - `prefs round-trip and fall back to defaults on garbage` (`'{'`, 모르는 탑 `'pyramid'`, 볼륨 `"loud"`)
  - `works when storage throws on every call`
  - `progress round-trips and clears`
  - `sanitizeProgress drops a checkpoint the layout no longer has` (checkpoint 5, 개수 3 → null; 음수·NaN → null; 정상은 그대로)
  - `recordClear keeps the best time and counts clears` (첫 클리어 newBest, 느린 기록은 bestTime 유지·clears 2, 빠른 기록 newBest)
- [ ] **Step 2:** Run: `yarn test tests/save.test.ts` → FAIL
- [ ] **Step 3:** `save.ts` 구현
- [ ] **Step 4:** Run: `yarn test tests/save.test.ts` → PASS, `yarn lint && yarn build`

### Task 6: 소리

**Files:**
- Create: `src/game/audio/cues.ts`, `src/game/audio/loops.ts`, `src/game/audio/synth.ts`, `src/game/audio/engine.ts`, `tests/audio.test.ts`

**Interfaces:**
- Consumes: `TowerDef`, `CueId` (Task 3, 4)
- Produces:
```ts
// cues.ts
export type SynthId = 'thock' | 'thockUp' | 'clicky' | 'clickyUp' | 'crunch' | 'crumble' | 'squish' | 'blub' | 'fizzTick' | 'fizzBed' | 'chime' | 'jump' | 'thud' | 'fanfare'
export interface CueDef { files?: string[]; synth?: SynthId; gain: number; rate?: [number, number]; pan?: number; delay?: number; loop?: boolean }
export const CUES: Record<CueId, CueDef>
export const COMMON_CUES: CueId[]                       // 'synth:jump', 'synth:thud', 'synth:chime', 'synth:fanfare'
export function cueFiles(prefix: string, count: number): string[]   // 'shared/blue-press', 10 → ['sounds/shared/blue-press-01.wav', …]
export function cuesForTower(t: TowerDef): CueId[]
export type Resolved = { kind: 'buffers'; buffers: AudioBuffer[] } | { kind: 'synth'; id: SynthId } | { kind: 'none' }
export function resolveCue(def: CueDef, loaded: ReadonlyMap<string, AudioBuffer | null>): Resolved
// loops.ts
export class LoopSet<T> { start(key: string, create: () => T, stop: (h: T) => void): boolean; stop(key: string): void; stopAll(): void; get size(): number }
// synth.ts
export function createSynth(ctx: AudioContext, out: AudioNode): { play(id: SynthId, rate?: number): void; loop(id: SynthId): () => void }
// engine.ts
export class AudioEngine {
  constructor(baseUrl: string)
  unlock(): void; get state(): AudioContextState | 'none'
  setVolume(v: number): void; setMuted(m: boolean): void
  preload(cues: CueId[]): Promise<void>
  play(cue: CueId): void; startLoop(key: string, cue: CueId): void; stopLoop(key: string): void; stopAllLoops(): void
  suspend(): void; resume(): void
}
```
공유 소리 정의(맛보기 값): `shared/blue-press-low`(blue-press 10개, gain 0.7, rate 0.94 ± 3%, pan ±0.2, synth thock), `shared/blue-release-low`(blue-release 6개, gain 0.32, delay 0.06, rate 0.94 ± 3%, synth thockUp), `shared/blue-press-high`(rate 1.04, synth clicky), `shared/blue-release-high`(delay 0.05, rate 1.04, synth clickyUp), `shared/wax-crunch`(wax-crunch 7개, gain 0.9, rate 0.92~1.08, synth crunch), `shared/wax-crumble`(같은 파일, gain 0.45, rate 0.72~0.82, synth crumble). 마스터 체인은 gain → 컴프레서(Global Constraints 값) → 출력, 작은 방 울림(길이 0.35초, τ 0.06, gain 0.12)을 맛보기처럼 섞는다. 이어지는 소리는 0.08초에 걸쳐 켜고 0.15초에 걸쳐 끈다. `resolveCue`: 파일이 하나라도 불러와졌으면 불러온 것만, 모두 실패했거나 아직이면 synth, synth도 없으면 none.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/audio.test.ts`:
  - `resolveCue uses loaded buffers and skips failed files`
  - `resolveCue falls back to synth when every file failed or is still loading`
  - `LoopSet never stacks the same key and stops it once`
  - `every file listed in CUES exists under public/` (node `fs`)
  - `cuesForTower lists every cue used by the tower's skins plus the common cues` (fixtureTower)
- [ ] **Step 2:** Run: `yarn test tests/audio.test.ts` → FAIL
- [ ] **Step 3:** 구현. `synth.ts`는 맛보기 `Sound`의 합성 부분(`renderHit`, `buildKeyBank`, `crunch`, `squish`, `blub`, `fizzTick`, 거품 바닥 소음, `chime`, `jump`, `thud`, `fanfare`, `crumble`)을 옮긴다.
- [ ] **Step 4:** Run: `yarn test tests/audio.test.ts` → PASS, `yarn lint && yarn build`

### Task 7: 무지개 탑 데이터

**Files:**
- Create: `src/game/towers/rainbow.ts`, `src/game/towers/index.ts`, `tests/towers.test.ts`
- Modify: `src/game/audio/cues.ts` (무지개 소리)

**Interfaces:**
- Consumes: `kit` (Task 4), `CUES` (Task 6), 소리 담당이 만든 `public/sounds/rainbow/`
- Produces: `export const TOWERS: TowerDef[]`(표시 순서), `export function getTower(id: TowerId): TowerDef`

무지개 탑 스킨(맛보기 치수): `whiteKey`(key, 반폭 0.65, topRest 0.55, 소리 blue-press-low/blue-release-low), `colorKey`(key, 같은 치수, blue-press-high/blue-release-high), `waxBall`(breakable, 반폭 0.66, topRest 1.7, botRest 0.32, cracked 1.56/0.25, squash 0.8, crack `shared/wax-crunch`, enter `rainbow/wax-squish`, collapse `shared/wax-crumble`), `sodaJelly`(stay, 반폭 0.9, topRest 0.75, squash 0.9, kick 2.8, soft 8, enter `rainbow/jelly-land`, loop `rainbow/fizz-loop`, tick `synth:fizzTick` 0.03~0.07초), `checkpoint`/`pad`/`goal`(COMMON_SKINS). 계단은 맛보기 순서(ASMR~! 계단, 왁뿌볼 5개, WAKPPU 다리, 탄산 젤리 4개 …)에서 시작해 무지개색 다리(RAINBOW 같은 글자 키)를 더하고 `kit` 도우미로 늘린다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/towers.test.ts` (등록된 모든 탑 × 난이도):
  - `every tower uses at least one breakable and one stay platform, and 4 to 6 platform kinds`
  - `no platform hangs within 3.2 m above another` (`clearanceViolations` 빈 배열)
  - `every jump is reachable` (`unreachableJumps` 빈 배열)
  - `easy length: rainbow 180–300 s, others 300–480 s` (`estimateSeconds`)
  - `checkpoint stretches stay within 120 / 180 / 240 s`
  - `every platform cue is a recording that exists` (synth만 있는 소리 금지, 파일 존재)
- [ ] **Step 2:** Run: `yarn test tests/towers.test.ts` → FAIL
- [ ] **Step 3:** `rainbow.ts`, `index.ts`, 무지개 소리 정의 추가. 소리 담당이 `missing`으로 남긴 소리가 있으면 그 발판을 다른 재료로 바꾼다(설계 7.1).
- [ ] **Step 4:** Run: `yarn test` → 전부 PASS, `yarn lint && yarn build`

### Task 8: 렌더링과 게임 루프

**Files:**
- Create: `src/game/render/stage.ts`, `textures.ts`, `views.ts`, `shapes/common.ts`, `shapes/rainbow.ts`, `effects.ts`, `characters.ts`, `avatar.ts`, `cameraRig.ts`, `src/game/input.ts`, `src/game/Game.ts`, `tools/browser-check.mjs`
- Modify: `src/App.tsx` (임시: 캔버스 + 바로 시작 버튼)

**Interfaces:**
- Consumes: Task 2~7 전부
- Produces:
```ts
// views.ts
export interface ViewContext { theme: TowerTheme; effects: Effects }
export interface PlatformView { root: THREE.Group; occluders: THREE.Object3D[]; sync(p: PlatformState, time: number, dt: number): void; crack?(p: PlatformState): void; restore?(p: PlatformState): void; collapse?(p: PlatformState): void; dispose(): void }
export function registerShape(shape: string, build: (placed: PlacedPlatform, ctx: ViewContext) => PlatformView): void
export function createView(placed: PlacedPlatform, ctx: ViewContext): PlatformView
// characters.ts
export const CHARACTERS: { id: CharacterId; label: string; dot: string; build(): THREE.Group }[]   // 왁뿌, 키캡이, 젤리, 냥냥
// Game.ts
export interface UiState {
  screen: 'menu' | 'playing' | 'cleared'; towerId: TowerId; characterId: CharacterId; difficulty: DifficultyKey;
  volume: number; muted: boolean; toast: { text: string; id: number } | null;
  clear: { time: number; steps: number; newBest: boolean; bestTime: number } | null;
  progress: Record<string, Progress | undefined>; records: Record<string, RecordEntry | undefined>   // 키 `${tower}.${diff}`
}
export interface HudFrame { height: number; goalHeight: number; steps: number; elapsed: number; fps: number | null; worstMs: number | null }
export class Game {
  static create(canvas: HTMLCanvasElement, opts: { storage: StorageLike | null; debug: boolean; baseUrl: string }): Game   // WebGL이 없으면 예외
  getState(): UiState; subscribe(fn: () => void): () => void; onFrame(fn: (h: HudFrame) => void): () => void
  selectTower(id: TowerId): void; selectCharacter(id: CharacterId): void; selectDifficulty(d: DifficultyKey): void
  start(mode: 'resume' | 'fresh'): void; openMenu(): void; respawn(): void; restart(): void; dismissClear(): void
  setVolume(v: number): void; toggleMute(): void; dispose(): void
}
```
`Game`이 맡는 것: 탑·난이도가 바뀌면 배치·발판·충돌·화면을 다시 짓고 그 탑 소리를 미리 불러온다. 프레임마다 `stepPlayer` → `groundChanges` 순서대로 `leavePlatform`/`enterPlatform`(밟은 발판 수 +1, 소리·연출) → `updatePlatform` → 머무는 발판의 `tick` → 화면 갱신 → `onFrame`. 바닥 아래 12면 다시 시작(그 전에 서 있던 발판에서 `leave`). 체크포인트에서 진행 저장, 메뉴·탭 숨김·`pagehide`에서도 저장. 꼭대기에서 기록하고 진행을 지운다. 탭이 숨겨지거나 창이 포커스를 잃으면 키를 풀고, 숨김이면 시간·루프·오디오를 멈추고 돌아오면 `last` 시각을 다시 잡는다. `?debug`면 `window.__wakppu`로 상태(화면, 시간, 발판 수, 캐릭터 위치, 서 있는 발판, 루프 개수, 오디오 상태)를 읽고 순간이동할 수 있게 하고 초당 프레임을 `HudFrame`에 채운다.
`tools/browser-check.mjs`: 헤드리스 Chrome을 CDP로 띄워 주소를 열고, 콘솔 오류를 모으고, 키 입력·대기·스크린샷·`window.__wakppu` 읽기를 순서대로 실행하는 작은 도구(`node tools/browser-check.mjs <url> <scenario.json>`).

- [ ] **Step 1:** 렌더 계층과 `Game`, `input`을 구현한다. 맛보기의 렌더러 설정, 하늘·안개·조명, 기둥·바닥·구름, 키·왁뿌볼(껍질 28조각)·탄산 젤리·받침·트로피 모양, 조각·거품, 캐릭터 4종, 접지 그림자, 카메라(드래그·휠·가림 당기기·시작 직후 1.2초 안착)를 옮긴다. 캐릭터는 단순 도형을 유지하되 눈 하이라이트, 볼터치, 머리 비율을 키워 더 귀엽게 다듬는다(설계 6.3).
- [ ] **Step 2:** `tools/browser-check.mjs`를 만들고, `yarn build && yarn preview` 주소에 대해 시나리오를 돌린다: 시작 → W 2초 → 발판 수 > 0, 콘솔 오류 0, 스크린샷 확인.
- [ ] **Step 3:** Review Focus 점검: (1) W를 누른 채 탭 숨김 → 돌아오면 이동 멈춤, 숨긴 동안 시간 그대로 (2) Enter로 시작 → 오디오 상태 `running` (5) 탄산 젤리 위에서 R → 루프 0개, 빠르게 다섯 번 밟았다 떼기 → 루프 ≤ 1개
- [ ] **Step 4:** Run: `yarn test && yarn lint && yarn build` → 통과

### Task 9: 화면 (React)

**Files:**
- Create: `src/ui/useGame.ts`, `src/ui/StartScreen.tsx`, `src/ui/Hud.tsx`, `src/ui/ClearScreen.tsx`, `src/ui/ui.css`, `src/assets/fonts/Jua-Regular.woff2`, `GowunDodum-Regular.woff2`, `OFL-Jua.txt`, `OFL-GowunDodum.txt`
- Modify: `src/App.tsx`, `src/index.css`, `src/main.tsx`

**Interfaces:**
- Consumes: `Game`, `UiState`, `HudFrame`, `CHARACTERS`, `TOWERS`, `DIFFICULTY` (Task 4, 8)
- Produces: `export function useGameState(game: Game): UiState`

화면 내용(설계 6.1, 6.7, 6.8): 시작 화면에 제목, 탑 카드(이름, 한 줄 설명, 색, 난이도별 클리어 표시와 최고 기록), 캐릭터·난이도 칩과 난이도 설명, 진행이 있으면 '이어서 하기'와 '처음부터', 없으면 '시작하기'(Enter), 조작법, '이어폰을 끼면 더 잘 들려요', 터치 기기 안내, WebGL 안내, 소리 출처(모든 `credits.json`을 실행 중에 불러와 작성자·라이선스·링크). HUD는 맛보기 배치 그대로(높이/꼭대기, 진행 막대, 밟은 발판, 시간, 난이도, 소리 크기, 소리 끄기 M, 체크포인트로 R, 처음 화면 Esc, 조작법 안내, '체크포인트 저장' 알림)이고 숫자는 `onFrame`으로 DOM에 바로 쓴다. 클리어 화면은 걸린 시간, 밟은 발판, 최고 기록 갱신 표시, '처음부터 다시', '탑 고르기', '계속 둘러보기'. 스타일은 맛보기 CSS 변수와 키캡 버튼을 옮긴다. 글꼴은 Google Fonts 저장소(OFL)의 원본에서 KS X 1001 한글 2,350자 + ASCII + 문장 부호로 줄여 woff2로 만든다(`uv run --with fonttools,brotli pyftsubset`).

- [ ] **Step 1:** 화면을 구현한다.
- [ ] **Step 2:** `tools/browser-check.mjs` 시나리오: 처음 열기 → 무지개·쉬움·왁뿌가 골라져 있음 → Enter로 시작 → 체크포인트까지 순간이동해 밟기 → 새로 고침 → '이어서 하기'가 보이고 누르면 그 체크포인트에서 시작 → 꼭대기로 순간이동 → 클리어 화면과 최고 기록 → 콘솔 오류 0. 시작 화면·HUD·클리어 화면 스크린샷을 눈으로 확인.
- [ ] **Step 3:** Run: `yarn test && yarn lint && yarn build` → 통과

### Task 10: 첫 점검과 공유

**Files:**
- 프로젝트 파일 변경 없음 (발견한 문제는 해당 과제 파일에서 고친다)

- [ ] **Step 1:** 성능: 이 Mac의 Chrome에서 `?debug`로 무지개 탑을 오르며 평균 fps와 50ms 넘는 프레임 수를 잰다(설계 8: 평균 55fps 이상, 50ms 넘는 프레임 거의 없음). 못 미치면 픽셀 비율 상한, 안개 거리, 카메라 far, 같은 모양 묶어 그리기 순으로 줄인다.
- [ ] **Step 2:** 빌드 결과를 비공개 Artifact로 올린다(맛보기 링크와 별개의 새 링크). Artifact `quickstart`와 `artifact-design`을 먼저 따른다.
- [ ] **Step 3:** 사용자에게 링크와 함께 소리·캐릭터·탑 길이 확인을 요청할 목록을 정리한다(설계 7.1, 6.3).

### Task 11~14: 나머지 탑 (키보드 → 딸기 초코 → 꿀 → 얼음 콜라)

탑마다 같은 모양의 과제다. 소리 담당의 `credits.json`이 오면 시작한다.

**Files (탑마다):**
- Create: `src/game/towers/<id>.ts`, `src/game/render/shapes/<id>.ts`
- Modify: `src/game/towers/index.ts`, `src/game/audio/cues.ts`, `src/game/render/effects.ts`(새 조각 종류가 필요할 때만)

**Interfaces:**
- Consumes: `kit`, `registerShape`, `CUES`, `PlatformView`
- Produces: `TOWERS`에 탑 추가

| 탑 | 스킨 (동작 · 모양 · 소리) | 테마 |
|---|---|---|
| keyboard | blueKey (key · key · shared/blue-press-high, blue-release-high), brownKey (key · key · keyboard/brown-press, brown-release), redKey (key · key · keyboard/red-press, red-release), spaceBar (key · spaceBar 반폭 1.8×0.65 · keyboard/space-press, space-release), keycapPile (breakable · keycapPile · crack keyboard/keycap-scatter, enter brownKey 소리, collapse keycap-scatter 낮게), rapidKey (stay · rapidKey · enter blue-press-high, tick blue-press-high 0.07~0.12초), checkpoint는 enterKey 모양(소리 keyboard/enter-press, 없으면 brown-press 낮게) | 어두운 남색 하늘, 키캡 파스텔, 기둥은 키보드 판 |
| choco | chocoBar (breakable · chocoBar · crack choco/choco-snap, enter choco/jelly-squish 낮게), strawberryJelly (squishy · jellyCube · choco/jelly-squish), marshmallow (squishy · marshmallow squash 0.7 · choco/mallow-press), chocoBall (breakable · chocoBall · crack shared/wax-crunch rate 0.8, enter choco/mallow-press), chocoPuddle (stay · puddle · enter choco/choco-plop, loop choco/choco-bubble-loop) | 딸기 우유 분홍 하늘, 초콜릿 갈색 기둥 |
| honey | honeycomb (breakable · hexComb · crack honey/comb-crunch, enter honey/drop-squish), honeyPuddle (stay · puddle · enter honey/drop-squish, leave honey/honey-stick, loop honey/honey-loop), honeyDrop (squishy · drop · honey/drop-squish), woodStick (key · woodStick · honey/wood-tap, leave 없음) | 노란 노을 하늘, 벌집 무늬 기둥 |
| icecola | snowBlock (squishy · snowBlock 눈가루 · icecola/snow-step), thinIce (breakable · thinIce · crack icecola/ice-crack, enter icecola/snow-step 높게), iceCube (squishy · iceCube 튀어 오름 · icecola/ice-clink), colaPuddle (stay · puddle · enter icecola/cola-land, loop icecola/cola-fizz-loop, tick synth:fizzTick) | 겨울 하늘색, 얼음 기둥, 콜라 갈색 포인트 |

- [ ] **Step 1:** 소리 정의를 `cues.ts`에 더한다(`missing`인 소리는 그 발판을 다른 재료로 바꾼다).
- [ ] **Step 2:** 모양을 `shapes/<id>.ts`에 만들고 `registerShape`로 등록한다.
- [ ] **Step 3:** 탑 정의를 쓰고 `TOWERS`에 넣는다.
- [ ] **Step 4:** Run: `yarn test tests/towers.test.ts` → 새 탑까지 PASS (Task 7의 검증이 새 탑에 그대로 적용된다)
- [ ] **Step 5:** `tools/browser-check.mjs`로 새 탑 시작 → 이동 → 스크린샷, 콘솔 오류 0
- [ ] **Step 6:** Run: `yarn test && yarn lint && yarn build` → 통과

### Task 15: 마무리 점검과 공유

- [ ] **Step 1:** 탑 5개 모두 `?debug` 성능을 다시 잰다.
- [ ] **Step 2:** 새로 띄운 리뷰어 한 명이 설계 문서와 이 계획을 기준으로 전체 코드를 검토한다. 나온 문제를 고친다.
- [ ] **Step 3:** 빌드를 Task 10의 Artifact 링크에 다시 올린다.
- [ ] **Step 4:** Run: `yarn test && yarn lint && yarn build` → 통과
