# ClonBrow v6.5 prototypes

ClonBrow is a collection of standalone browser prototypes, learning labs, games, and tools, with an optional local Node.js API.

## Browse the collection

Open [`index.html`](index.html) in a browser, or enable GitHub Pages for this repository to publish the interactive catalog. The individual HTML pages stay at the repository root because their local links, assets, and the API catalog use those paths.

GitHub Pages project sites are served under `/<repository-name>/` (for example, `/htmlprototypes/`). Keep page links relative so they continue to work under that prefix.

The collection also includes a static portal at [`clonbrow-api.html`](clonbrow-api.html) and the main tools page at [`main.html`](main.html).

## Run the local API

Requires Node.js 18 or newer. From the repository root:

```powershell
npm --prefix clonbrow-api start
```

The API listens on `http://127.0.0.1:3789`. It is intended for local development. See [`clonbrow-api/README.md`](clonbrow-api/README.md) for routes, generated projects, and catalog maintenance.

## Repository layout

- `*.html`, `*.css`, root JSON catalogs, and root-level assets: the static site and standalone prototypes. Keep page paths stable so existing links continue to work.
- `assets/`: shared fonts and static assets.
- `clonbrow-api/`: local API service and API-specific files.
- `chrome-store-submission/`: Chrome Web Store listing and privacy drafts.
- `clonbrow-protected-player/`: protected-player portal prototype and documentation.
- `tools/`: scripts for analyzing prototypes and building catalogs or pages.
- `src/native/`: native Windows source code.
- `docs/`: publishing notes and project documentation.
- `docs/pdf/`: project manuals and printable PDF documents.

## Publishing and packages

Git tracks source and web assets. Local signing keys, extension packages, zip archives, executable builds, and the duplicate historical snapshot are excluded in `.gitignore`. Publish built packages as GitHub Release assets; never commit a private signing key.

For static hosting details, see [`docs/STATIC-PUBLISH.md`](docs/STATIC-PUBLISH.md).
