# Apporatory

The landing page for Apporatory, a place to explore maths and science from Grade 1 to college.

It is one static page (`index.html`) plus a "Coming soon" page for links that have nothing behind them yet. Plain HTML,
CSS and JavaScript: no framework and no build step.

## View it locally

Double-click `index.html` to open it straight from disk; everything works that way, sound and backgrounds included.
Or serve the folder and open the address it prints:

```bash
python3 -m http.server 4500
# then visit http://localhost:4500
```

Add `?theme=dark` (or `red-green`, `blue-yellow`, `greyscale`, `high-contrast`), `?bg=vortex` (or `ripple`, `orbitals`,
`signs`, `shuffle`) or `?motion=off` to the address to try a theme, a background or the still version without changing
your saved choice.

## What's on the page

The look is bold and sharp: square corners, heavy edges, hard shadows in colours that clash a little, and type that is
bold through weight rather than size.

- **A shifting background** behind the whole page, after Deltarune's battle screen: two grids of thin lines drift in
  opposite diagonals at different speeds, coloured per theme. Text always sits on solid panels.
- **Other backgrounds:** Themes → Background also offers four EarthBound-style pixel scenes drawn in code (Ripple,
  Orbitals, Vortex and Signs: two tiled patterns each, with slow colour cycling and wavy scanlines) and Shuffle, which
  crossfades to another background about once a minute. Each option has a live preview; the grid stays the default.
- **Hero:** the name, the tagline "Your maths and science lab, from Grade 1 to college." and **Start exploring**.
  Beside it, maths and science symbols drawn in square dots morph into one another: plus, flask, square root, atom, pi
  and a DNA helix, about 4 seconds on each and 1.5 seconds to change.
- **What is Apporatory?**, **How it helps**, **Our goals**, **Ready to explore?**
- **Today's explorers. Tomorrow's…**: two slow, endless rows of the jobs explorers grow into. As the section scrolls
  in, stripes in the theme's clashing colours race in, the band opens like a shutter, the rows fly in from opposite
  sides and "Tomorrow's…" slams in once the section holds still.
- **Click shockwave:** clicking or tapping empty space sends out a small diamond ring in the theme's accents.
- **Symbol burst:** clicking or tapping the hero symbol blasts its dots outward; they spring back and the morph carries
  on from where it was.
- **Sound** (off until you turn it on): the Sound button opens a panel with an on/off switch, what is playing, and
  Master, Music and Sound effects sliders. Relaxing music is picked at random from five tracks and fades into a
  different one when each ends; every shockwave and symbol burst makes a soft pop.
- In the top bar: one **pause** control for all motion, a **theme switcher** with six themes, the background choice
  and **Reduce motion**, and **Sound**.

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
- One pause control (top bar, hero and jobs strip) stops the background, the symbols and the jobs together. With
  reduced motion (on the device or in Apporatory) all of it stands still: the symbols show one flask, a pixel scene
  shows a still frame, the jobs become a plain list, the explorers section arrives finished and clicks make no
  shockwave. Everything pauses when the tab is hidden.
- The pixel scenes never flash: colours cycle slowly and stay faint behind the panels, and no pixel swings in
  brightness more than about once every few seconds.
- The page stays at 60 frames a second with Chrome's CPU slowed 4x, on the grid, on a pixel scene and while the
  explorers section scrolls in.
- Keyboard: skip link, visible focus everywhere, the Themes and Sound panels close with Escape and return focus.
- Sound never starts by itself. The on/off switch and the sliders are standard controls with labels and spoken
  percentages; levels and the switch are saved on the device, and when sound was left on, it waits for the first
  click, tap or key on the next visit (browsers only allow sound after one). Sound pauses while the tab is hidden.
  Served from a web address, the music runs through the browser's audio engine so the sliders also work on iPhone
  and iPad; opened from disk, the players' own volume is used, because Chrome mutes local files sent through the
  audio engine.

## Files

```
index.html            the landing page
coming-soon.html      where Start exploring, Log in and the footer links go for now
css/themes.css        the six themes and their clashing accents
css/site.css          page styles, the shifting grid, panels, the explorers entrance and the click shockwave
css/fonts.css         the two fonts
css/fonts-inline.css  the same fonts embedded, used when the page is opened from disk
js/boot.js            applies the saved or device theme and background before the page paints
js/site.js            panels, theme switcher, pause and Reduce motion, the jobs strip and its entrance, shockwave
js/backgrounds.js     the EarthBound-style scenes, their previews and Shuffle
js/morph.js           the square-dot symbol morph and its click burst
js/sound.js           the Sound panel, the music pool and the synthesised pop and ambient chords
audio/                four music tracks and their licences (audio/LICENSE.txt)
fonts/                Atkinson Hyperlegible Next (body) and Archivo (headings)
vendor/               the scroll-craft engine, unmodified
```

The line icons are drawn by hand and sit inline at the top of each page, so they show even when the page is opened
from disk.

## Credits

- Scroll engine: [scroll-craft](https://github.com/nateherkai/scroll-craft) by Nate Herk, MIT licence
  (`vendor/scrollcraft-LICENSE.txt`).
- Body font: [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next) by the Braille
  Institute, SIL Open Font License 1.1 (`fonts/OFL.txt`).
- Heading font: [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type, SIL Open Font License 1.1
  (`fonts/Archivo-OFL.txt`).
- Music: "Study And Relax", "Cool Vibes" and "Bossa Antigua" by Kevin MacLeod
  ([incompetech.com](https://incompetech.com)), licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), trimmed and made quieter; "Morning Coffee" by HoliznaCC0,
  public domain (CC0). The credit is in the site footer; sources and changes are in `audio/LICENSE.txt`.
- "Ambient chords" and the pop: synthesised in the browser, no recordings used.
- Backgrounds: the grid is inspired by the battle screen in Deltarune and the pixel scenes by EarthBound's battle
  backgrounds; all are drawn here in code, and no game assets are used.
- Colours: Light and Dark grew out of AutoEight's palette, adjusted for contrast.
