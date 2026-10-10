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

Opening `index.html` straight from your computer may block the audio; use the local preview server or, once published, the GitHub Pages link.
