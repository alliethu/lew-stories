# Not a Storyteller, As a Rule

The stories of Lew Etcoff: a digital book with his voice, photos, and watercolors.

## Deploy with GitHub Pages
The website is hosted at `https://alliethu.com/lew-stories/`. GitHub Pages inherits the account's existing custom domain.

Deployment setup:
1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge the website and `.github/workflows/deploy-pages.yml` into `main`.
3. The **Deploy website to GitHub Pages** workflow publishes the site at `https://alliethu.com/lew-stories/`. Future pushes to `main` update it automatically. You can also run the workflow manually from the **Actions** tab.

Publishing makes all stories, photos, handwriting, and recordings publicly accessible. No build step or package installation is needed. The workflow uploads only the website files and `assets/`, not repository documentation or configuration.

## Local preview
Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root, then open `http://127.0.0.1:8000/`. Stop the server with Ctrl+C.

## Links
- Start from the beginning: the site root
- A chapter: `#ch1` … `#ch9`
- All his answers: `#all1`

## Files
- `index.html`: the page
- `book.js`, `book.css`, `coldopen.js`, `support.js`: the book engine and styling
- `book-data.js`: chapters, text, audio and picture list. `book-all.js`: the "All his answers" pages
- `assets/audio`, `assets/img`, `assets/hand`: recordings, pictures, and his handwriting strokes

Page turns use static copies of the current artwork and text so picture and handwriting animations do not replay during the flip. Chapter jumps clear any in-progress turn, resizing completes the requested turn, and reduced-motion preferences skip the flip entirely.

Narration uses one reusable audio player and preloads only the next recording. Artwork loads on demand rather than downloading the entire book upfront. Recording durations are saved in `book-data.js`; update `AUDIO_DURATIONS` when replacing a recording. Buffering and playback errors appear in the listening bar, and Play retries a failed recording.

The nine chapter openers show their chapter number and title alongside the existing artwork, without pull quotes or supporting text. Autoplay gives each opener a two-second pause before continuing to the recorded story. The birthday closing keeps its original message and longer pause, with a quiet invitation and direct link to his written responses.

Small screens use stacked artwork and text; short landscape screens use side-by-side pages. Long passages scroll at a readable font size rather than shrinking to fit. Playback controls wrap on narrow screens, including loading and error messages, and enlarged pictures and full answers remain scrollable with larger text.

Run `node --test tests/*.test.js` for playback and responsive sizing regressions. The deployment workflow runs these checks before publishing. When changing application scripts or styles, update their versions in `index.html` to prevent stale browser caches.

Opening `index.html` straight from your computer may block the audio; use the local preview server or, once published, the GitHub Pages link.
