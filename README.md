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

- **Hero:** the name, the tagline "Your maths and science lab, from Grade 1 to college." and **Start exploring**.
  Beside it, maths and science symbols drawn in dots morph into one another: plus, flask, square root, atom, pi and a
  DNA helix, about 4 seconds on each and 1.5 seconds to change.
- **What is Apporatory?**, **How it helps**, **Our goals**, **Ready to explore?**
- **Today's explorers. Tomorrow's…**: a slow, endless strip of the jobs explorers grow into.
- A **theme switcher** in the top bar with six themes and a **Reduce motion** setting.

## Themes and accessibility

| Theme | Built for |
|---|---|
| Light | The default on light devices: warm paper, near-black ink, a copper accent |
| Dark | The default on dark devices |
| Red–green friendly | Protanopia and deuteranopia: blues and oranges, navy accent |
| Blue–yellow friendly | Tritanopia: reds and teals, crimson accent |
| Greyscale | No colour vision: contrast, icons and patterns |
| High contrast | Low vision: 7:1 for all text, thicker outlines and focus rings |

- Reading text is 7:1 or better in every theme; labels, links and subject colours are at least 4.5:1, borders 3:1.
- Nothing relies on colour alone: links are underlined, subjects and jobs always have an icon and a name.
- A first visit follows the device's light or dark and reduced-motion settings; any choice is saved on the device.
- Both moving parts have a pause button. With reduced motion (on the device or in Apporatory) the symbols show one
  still flask and the jobs become a plain list. The symbols stop drawing when the hero is off screen or the tab is hidden.
- Keyboard: skip link, visible focus everywhere, the theme panel closes with Escape and returns focus.

## Files

```
index.html          the landing page
coming-soon.html    where Start exploring, Log in and the footer links go for now
css/site.css        themes and page styles
js/boot.js          applies the saved or device theme before the page paints
js/site.js          theme switcher, Reduce motion, roles strip, scroll engine start-up
js/morph.js         the dot-drawn symbol morph
img/icons.svg       line icons, drawn by hand
fonts/              Atkinson Hyperlegible Next
vendor/             the scroll-craft engine, unmodified
```

## Credits

- Scroll engine: [scroll-craft](https://github.com/nateherkai/scroll-craft) by Nate Herk, MIT licence
  (`vendor/scrollcraft-LICENSE.txt`).
- Font: [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next) by the Braille
  Institute, SIL Open Font License 1.1 (`fonts/OFL.txt`).
- Colours: Light and Dark are based on AutoEight's palette, adjusted for contrast.
