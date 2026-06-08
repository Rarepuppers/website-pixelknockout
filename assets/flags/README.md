# PKO Pixel Flags

Pixel flag assets are generated as PNGs in two sizes:

- `64x64/` - square icon flags for compact UI, profile labels, and chips.
- `64x48/` - rectangular flags for roster rows and wider country labels.

Fighter sprites remain `128x128`.

Display guidance:

- Use `64x64` when the flag sits beside a fighter name in a compact profile/card context.
- Use `64x48` when the flag appears in a roster table or horizontal country label.
- Render smaller in CSS, usually `24x24` for square icons and `32x24` for rectangular flags.
- Keep `image-rendering: pixelated` so the flags stay crisp.

