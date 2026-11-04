# Souvik Mandol — Portfolio

A monochrome, ink-on-paper 3D portfolio. Every section is accompanied by a procedurally drawn
3D glyph (an adaptive traffic intersection, the BRTC network topology, a walking gait figure,
a citation funnel, …) rendered in real time with three.js through one shared WebGL canvas.

Live: https://minus69to.github.io/souvik-mandol/

## Updating your information (the only file you need)

**Edit `src/data/portfolioData.js`.** Everything on the site is read from it:
name, links, hero text, about, experience, projects, research, skills, education,
certifications and contact. The 3D / design code never needs to change.

Quick reference:

| What | Where in `portfolioData.js` |
| --- | --- |
| Name, role, email, socials, CV file, photos | `personal` |
| Menu items | `nav` |
| Hero headline, subheadline, scrolling ticker facts | `landing` |
| About text, hobbies, research interests | `about`, `personal.researchInterests` |
| Jobs (+ the expandable "inside the platform" panel) | `experience.jobs` |
| Projects | `projects.items` |
| Research, thesis, publications, collaboration banner | `research` |
| Skill categories | `skills.categories` |
| Degrees | `education.items` |
| Certificates (with verify links) | `certifications.groups` |
| Contact text | `contact` |

Rules of thumb:

- Put images and the CV in `public/` and reference them by file name only
  (`photo: "profile2.jpg"`, `resumeFile: "resume.pdf"`).
- Leave a URL as `""` to hide that button (e.g. `demoUrl: ""`).
- Each project / research item has a `scene` key that picks its 3D glyph.
  The list of available glyph names is at the bottom of the data file (`SCENES`).
  Reuse any of them for new items.
- `[label](https://url)` links work inside `about.extras`.
- Set `personal.openToResearch` to `false` to hide the collaboration banner and hero button.

Commit and push to `main`; GitHub Actions builds and deploys the site automatically.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/souvik-mandol/ (the repo name is the base path for GitHub Pages).

- `/souvik-mandol/lab/?scene=gait&inverted=1&size=card` previews a single 3D scene.
- Add `?3d=off` to any page to see the no-WebGL fallback.

`npm run build` produces the static site in `out/`.

## How it is built

- Next.js 16 (static export) · React 19 · Tailwind 4
- three.js + @react-three/fiber + @react-three/drei
- One fixed `<Canvas>` (`src/components/three/SceneCanvas.jsx`) with drei `View` portals, so
  dozens of 3D glyphs share one WebGL context and only visible ones are drawn.
- `src/components/three/Ink.jsx` holds the shared "ink" primitives: a custom cross-hatching
  shader (`ink.js`), outlined meshes, wireframes and lines. Scenes never use colour.
- Scenes live in `src/components/scenes/`, one file per glyph, registered in `registry.js`.
- Reduced-motion users get static poses; browsers without WebGL get hatched placeholders.

## Previous design

The earlier black-and-white sidebar version is preserved on the branch
`backup/main-brutalist-2026-11`.
