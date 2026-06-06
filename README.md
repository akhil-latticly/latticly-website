# latticly-website

Marketing landing page for **Latticly** — an AI Business Development Representative (BDR)
that researches leads, runs personalized multichannel outreach, and books qualified meetings
on autopilot.

Static site (HTML + Tailwind via CDN + a vanilla `<canvas>` background animation). No build step.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Served via GitHub Pages from the `main` branch (root). Live at
`https://akhil-latticly.github.io/latticly-website/`.

## Structure

- `index.html` — page markup + content + Tailwind config
- `styles.css` — custom CSS (animation glow, gradients, type)
- `animation.js` — canvas hero background + small UI interactions (mobile menu, smooth scroll)
