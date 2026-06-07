# Fighter sprites

Drop pixel-art sprites here, then point a persona at one via the `img` field in
`js/data.js`:

```js
"Conor McGregor": { name: "Connor McGregarious", img: "assets/fighters/mcgregor.png", ... }
```

If `img` is omitted, the avatar falls back to the persona's emoji — so the game
works fine with zero art, and you can fill sprites in over time.

## Specs
- **Size:** 96×96 or 128×128 px (square).
- **Format:** PNG with a **transparent** background.
- **Style:** original pixel art "in the style of" retro 16-bit wrestling sprites.
- **Palette:** keep it consistent across fighters for a unified look.

## Legal guardrails (important)
- **Do NOT copy** actual Super Fire Pro Wrestling / Fire Pro sprites or any other
  game's assets. Art *style* isn't protected; specific sprites are.
- Make **caricatures/parodies**, NOT photo-realistic likenesses of the real
  fighters. The pixel persona is the parody layer.
- No real logos, posters, or trademarked gear.

AI generators (DALL·E / Gemini / Midjourney) or tools like Aseprite/Piskel are
all fine for producing these.
