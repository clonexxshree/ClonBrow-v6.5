# Publish the ClonBrow static portal

The static version has no Node server and no database.

## Files to publish

Publish these files at the same site root:

- `clonbrow-api.html` — OTP-style portal, feature browser, and local flashcards.
- `clonbrow-public-api.json` — read-only catalog for other projects to fetch.
- The 260 user-facing prototype HTML files and any assets they use. Keep their relative paths and folders intact.
- `main.html` if you want the portal's main-tools link to work.

Upload the complete site folder to your static host; the portal alone has the catalog, but it does not contain the 260 interactive page implementations.

## Access code

For username `alex`, the expected code is `alexclonbrow@ideator.123!2giml.com`. Usernames are normalized to lowercase. The portal stores one bound username in `localStorage` on the current browser profile and allows that same username to return.

This is a convenience gate only: the code formula and check are visible in public JavaScript, and users can open prototype files directly. Static HTML cannot securely allocate one global username or reject a duplicate on another device. That requires shared server-side state or an identity provider.

## Flashcards and static API

Flashcards are stored in browser `localStorage` under the username and site origin. They do not synchronize between devices. `clonbrow-public-api.json` is a read-only static catalog that another project on the same host can fetch:

```js
const catalog = await fetch('./clonbrow-public-api.json').then(r => r.json());
const labs = catalog.features.filter(item => item.tags.includes('lab'));
```

Static hosting cannot provide shared flashcard writes or private API operations without a backend.
