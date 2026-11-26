# Apporatory

The landing page for Apporatory, a place to explore maths and science from Grade 1 to college.

It is one static page (`index.html`) plus a "Coming soon" page for links that have nothing behind them yet. Plain HTML,
CSS and JavaScript: no framework and no build step.

## View it locally

Serve the folder over HTTP (the page's scroll engine and icons need it), then open the address it prints:

```bash
python3 -m http.server 4500
# then visit http://localhost:4500
```

Add `?theme=dark` (or `red-green`, `blue-yellow`, `greyscale`, `high-contrast`) or `?motion=off` to the address to try
a theme or the still version without changing your saved choice.

## What's on the page

The look is bold and sharp: square corners, heavy edges, hard shadows in colours that clash a little, and type that is
bold through weight rather than size.

- **A shifting background** behind the whole page, after Deltarune's battle screen: two grids of thin lines drift in
  opposite diagonals at different speeds, coloured per theme. Text always sits on solid panels.
- **Hero:** the name, the tagline "Your maths and science lab, from Grade 1 to college." and **Start exploring**.
  Beside it, maths and science symbols drawn in square dots morph into one another: plus, flask, square root, atom, pi
  and a DNA helix, about 4 seconds on each and 1.5 seconds to change.
- **What is Apporatory?**, **How it helps**, **Our goals**, **Ready to explore?**
- **Today's explorers. Tomorrow's…**: two slow, endless rows of the jobs explorers grow into.
- **Click shockwave:** clicking or tapping empty space sends out a small diamond ring in the theme's accents.
- In the top bar: one **pause** control for all motion, a **theme switcher** with six themes and **Reduce motion**.

## Themes and accessibility

| Theme | Built for | Clashing accents |
|---|---|---|
| Light | The default on light devices | Vermilion, cobalt, magenta |
| Dark | The default on dark devices | Sunset, cyan, hot pink, on a purple grid |
| Red–green friendly | Protanopia and deuteranopia | Navy and azure against burnt orange |
| Blue–yellow friendly | Tritanopia | Crimson and raspberry against teal |
| Greyscale | No colour vision | Black against paper, and stripes |
| High contrast | Low vision: 7:1 for all text, 3px edges, 4px focus rings | Deep copper, navy, plum |

- Reading text is 7:1 or better in every theme; labels, links, accents and subject colours are at least 4.5:1,
  borders 3:1.
- Nothing relies on colour alone: links are underlined, subjects and jobs always have an icon and a name.
- A first visit follows the device's light or dark and reduced-motion settings; any choice is saved on the device.
- One pause control (top bar, hero and jobs strip) stops the grid, the symbols and the jobs together. With reduced
  motion (on the device or in Apporatory) all of it stands still, the symbols show one flask, the jobs become a plain
  list and clicks make no shockwave. Everything pauses when the tab is hidden.
- The grid is moved by the graphics chip alone, so the page stays at 60 frames a second with Chrome's CPU slowed 4x.
- Keyboard: skip link, visible focus everywhere, the theme panel closes with Escape and returns focus.

## Files

```
index.html          the landing page
coming-soon.html    where Start exploring, Log in and the footer links go for now
css/themes.css      the six themes and their clashing accents
css/site.css        page styles, the shifting grid and the click shockwave
js/boot.js          applies the saved or device theme before the page paints
js/site.js          theme switcher, pause and Reduce motion, roles strip, click shockwave
js/morph.js         the square-dot symbol morph
img/icons.svg       line icons, drawn by hand
fonts/              Atkinson Hyperlegible Next (body) and Archivo (headings)
vendor/             the scroll-craft engine, unmodified
```

## Credits

- Scroll engine: [scroll-craft](https://github.com/nateherkai/scroll-craft) by Nate Herk, MIT licence
  (`vendor/scrollcraft-LICENSE.txt`).
- Body font: [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next) by the Braille
  Institute, SIL Open Font License 1.1 (`fonts/OFL.txt`).
- Heading font: [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type, SIL Open Font License 1.1
  (`fonts/Archivo-OFL.txt`).
- Background: inspired by the battle screen in Deltarune; drawn here in CSS, no game assets used.
- Colours: Light and Dark grew out of AutoEight's palette, adjusted for contrast.
