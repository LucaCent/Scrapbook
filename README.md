# Scrapbook games — "I LOVE U"

Six small mobile games, one per scrapbook page. Each is opened by a printed QR
code and reveals one letter. Everything is static HTML/CSS/JS: no build step,
no dependencies, and it works offline after the first visit.

| Page | Game | Letter | Images | Idea |
|------|------|--------|--------|------|
| 1 | `games/scratch`    | I | 3 (one per round) | Scratch foil off a photo (canvas compositing) |
| 2 | `games/rotate`     | L | 2 (one per level) | Tap tiles to un-rotate a photo (3x4, then 4x5) |
| 3 | `games/hunt`       | O | 2 (one per round) | Hot/cold search for 3 hidden things per photo |
| 4 | `games/wordsearch` | V | 1 (banner)        | Generated word search with snapped diagonal selection |
| 5 | `games/cipher`     | E | 1 (dial centre)   | Turn a Caesar wheel; final message is typed |
| 6 | `games/paint`      | U | 1 (the picture)   | Photo becomes a numbered grid (k-means); finishing reveals it |

## Colours

The Valentine's palette (blush, rose pink, wine, deep berry) is defined once in
the `:root` block of `shared/theme.css`; change those variables to restyle
the whole site. A few colours are set in JavaScript because canvas and SVG
cannot read CSS variables: the scratch foil (`games/scratch/game.js`), the
hot/cold thermometer (`games/hunt/game.js`), the word-search highlights
(`games/wordsearch/game.js`), the dial (`games/cipher/game.js`) and the
confetti hearts (`shared/core.js`).

## Run it locally

```
cd scrapbook
python3 -m http.server 8000
```
Open http://localhost:8000/ on your computer, or http://<your-computer-ip>:8000/
on a phone connected to the same Wi-Fi. (Service workers need http(s); opening
files directly with file:// works for the games but skips offline caching.)

## Use your own photos

1. Prepare each photo with `python3 tools/prepare_photo.py INPUT.jpg assets/images/NAME.jpg`.
   It bakes in phone rotation, removes hidden metadata (including GPS location,
   which would otherwise be public), and shrinks to about 1280 px so it loads
   quickly from a QR scan. For the cipher dial, which shows a circle, add
   `--crop LEFT,TOP,SIZE` to cut a square around the faces first.
2. Edit the matching `games/<name>/config.js` and point the paths at them.
3. **Hunt only:** reposition the targets. Open
   `games/hunt/index.html?calibrate=1`, tap each hiding place and copy the
   `{ x, y, r }` it prints into `config.js`. Dashed rings show the current
   targets.
4. **Word search:** replace the words (and clues) with ones from that page.
5. **Cipher:** replace the messages, shifts and hints.
6. Run `python3 tools/update_precache.py` (refreshes the offline file list).

`python3 tools/make_placeholders.py` regenerates the stand-in artwork.

## Publish on GitHub Pages

1. Create a repository and push the contents of this folder to its root.
2. Settings -> Pages -> Deploy from branch -> `main` / root.
3. Your site is at `https://<user>.github.io/<repo>/`.

All paths in the project are relative, so the sub-path needs no configuration.

## Make the QR codes

```
pip install "qrcode[pil]"
python3 tools/make_qr.py https://<user>.github.io/<repo>/
```
This writes `qr/page-1.png` ... `page-6.png` and a printable `qr/sheet.png`.
Print each at 2.5 cm (1 inch) or larger. Test every code with a phone before
gluing it in. Do not rename the `games/*` folders afterwards: the printed codes
point at them.

## Offline behaviour

On the first visit with signal, the service worker (`sw.js`) caches every page
and image. After that every game works with no connection. If you change files
after publishing, run `tools/update_precache.py` again and push; devices pick up
the update the next time they open a game while online.

Progress (collected letters) is stored on the phone in `localStorage`. The
`index.html` page shows the collected letters; it is a progress board, not
something the QR codes need to open.

## Project layout

```
index.html            progress board
sw.js                 offline cache (PRECACHE block generated)
shared/core.js        registry, storage, helpers, win overlay
shared/theme.css      shared look
games/<name>/         index.html, config.js (edit), game.js, game.css
assets/images/        photos
tools/                placeholders, precache, QR generator
```
