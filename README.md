# rct-wakppu

키보드 키, 왁뿌볼, 젤리, 얼음, 초콜릿 발판을 밟으며 ASMR 소리를 듣고 꼭대기까지 오르는 브라우저 3D 탑 오르기 게임이에요.

- 플레이: https://wakppu-tower.pages.dev (PC 브라우저, 키보드와 마우스)
- 탑 5개 × 난이도 3단계, 캐릭터 4종, 이어 하기와 최고 기록
- 주소 뒤에 `#debug`를 붙이면 초당 프레임이 보여요.

## 개발

```bash
yarn            # 의존성 설치
yarn dev        # 개발 서버
yarn test       # 단위 테스트 (Vitest)
yarn lint
yarn build      # dist/에 정적 파일 생성
```

브라우저 점검은 `yarn build && npx vite preview --port 4173`을 띄운 뒤 `node tools/browser-check.mjs "http://localhost:4173/?debug" tools/checks/<이름>.json`으로 돌려요.

## 배포

Cloudflare Pages의 `wakppu-tower` 프로젝트에 올려요.

```bash
yarn build && npx wrangler pages deploy dist --project-name wakppu-tower
```

## 문서와 출처

- 설계: `docs/superpowers/specs/2026-10-22-wakppu-tower-design.md`
- 구현 계획: `docs/superpowers/plans/2026-10-22-wakppu-tower.md`
- 소리: 모두 CC0, 출처는 `public/sounds/*/credits.json`
- 글꼴: Jua, Gowun Dodum (SIL OFL, `src/assets/fonts/`)
