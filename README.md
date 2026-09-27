# Jamie Chen — Interactive Portfolio

Static portfolio website built around the original Canva portfolio links, with a responsive interactive avatar companion.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Main files

- `index.html` — portfolio content and Canva links
- `style.css` — responsive layout, cards, avatar visual system
- `app.js` — avatar expressions, cursor/touch reactions, music, project interactions
- `music.mp3` — background music
- `assets/` — contact/social assets retained from the original project

## Editing projects

Each portfolio card in `index.html` has:

- `href` — direct Canva link
- `data-expression` — avatar reaction (`neutral`, `curious`, `happy`, `excited`, `focus`, `proud`, `wink`, `surprised`)
- `data-say` — companion caption
- `data-accent` — interaction accent color
