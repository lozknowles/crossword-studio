# Website and Pages deployment

The browser application is static. Build it with `pnpm build:website` to use the
`/crossword/` route. Publish only `dist/`, never the repository or server folder.
The lozknowles.com repository records the source commit and package hashes.

Install `server/article_service.py` outside the web root and run it as a restricted
systemd service on **127.0.0.1:8793**. The standard library is sufficient.
Reverse-proxy only `/crossword/api/article` to `/article`. The proxy must overwrite
`X-Crossword-Client` with the actual client IP for rate limiting. Do not forward a
user-supplied version of that header. Allow only the intended website and Pages
origins; the service has no credentials and fetches only public HTTP(S) pages.

Use request body limits at the proxy, a bounded worker/service memory limit, and
the existing site TLS and content security policy. PDF.js uses its bundled,
same-origin module worker. No third-party script or font CDN is required.

Before reloading Apache: save the previous route configuration, run its config
test and confirm unrelated routes remain unchanged. Back up existing static files
outside the public root. Install hashed assets first, the crossword index next,
and the homepage navigation last. Retain a rollback manifest and service version.

Verify the live page, prepared puzzle, public article import, local document
import, PDF download, blocked private URLs and unrelated page hashes. A Git push
alone does not update the lozknowles.com host.

The GitHub Pages build sets `VITE_ARTICLE_API` to
`https://www.lozknowles.com/crossword/api/article`; a normal website build leaves
it unset and uses the same-origin endpoint. Pages publishing requires the
repository’s Pages source to be GitHub Actions.
