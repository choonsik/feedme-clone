# Design

Where design work starts. Decision contracts in `docs/decisions/` own every
rule; this file holds values and points at the contract that owns each element.

## Values

Source: `app/globals.css` (의미 토큰), `docs/specs/url-to-markdown/prototype.html` (아이소매트릭 면 색 묶음, 구현되면 `app/globals.css`로 옮겨짐). Update this section when those sources change.

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--iso-floor` | `#e6eafb` | `#11132a` |
| `--iso-top` / `--iso-right` / `--iso-bottom` | `#ffffff` / `#d3d9f3` / `#b6bfe8` | `#242850` / `#1a1d3b` / `#10122a` |
| `--iso-accent-top` / `-right` / `-bottom` | `#5b5bd6` / `#4242b3` / `#32328f` | `#8f8fff` / `#6b6be3` / `#4a4ab5` |
| `--iso-mint-top` / `-right` / `-bottom` | `#8fe6cd` / `#5fc9aa` / `#3ea88a` | `#4fd1b0` / `#35a58a` / `#247a66` |
| `--iso-warn-top` / `-right` / `-bottom` | `#ffe6e3` / `#f4bdb7` / `#e49d96` | `#4a2330` / `#331822` / `#220f17` |

Radius: `--radius` `0.625rem` (아이소매트릭 블록은 직각이라 쓰지 않음).

## Components

Source: `components/ui`. Update this section when it changes.

- `Button`

## Rejected patterns

- 둥근 모서리와 흐린 그림자로 입체감을 내는 카드 → [visual-language](docs/decisions/visual-language.md)
- 입력창 밖의 글자 그림자 → [visual-language](docs/decisions/visual-language.md)
- 화면마다 임의로 고른 색상 → [ui-composition](docs/decisions/ui-composition.md)
- 공식 component가 있는 일반 UI를 직접 만든 markup → [ui-composition](docs/decisions/ui-composition.md)

## Map

- 카드, 버튼, 선택 칩, 안내 상자의 면과 옆면 → [visual-language](docs/decisions/visual-language.md)
- 바닥 격자와 일러스트 → [visual-language](docs/decisions/visual-language.md)
- URL 입력창 글자 그림자 → [visual-language](docs/decisions/visual-language.md)
- 버튼 눌림 상태 → [visual-language](docs/decisions/visual-language.md)
- 페이지 shell, 폭, 간격 → [ui-composition](docs/decisions/ui-composition.md)
- 로딩, 오류, 빈 상태 표현 → [ui-composition](docs/decisions/ui-composition.md)
- 좁은 화면 배치 → [ui-composition](docs/decisions/ui-composition.md)
