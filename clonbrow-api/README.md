# ClonBrow API

This is a local, dependency-free Node.js API for using ClonBrow features in another project. It includes the catalog of all 262 HTML files, routes to serve the 260 user-facing prototype pages, direct endpoints for selected text tools, and a persistent flashcard API.

The scan classified 175 pages as lab, simulation, visualization, or game candidates for embedding; 82 as other interactive pages; 3 as informational pages; and 2 as Chromium package-support files. Tags overlap (a lab can also be biology, chemistry, or physics). It found 143 lab-tagged pages and 21 HTML files that call external APIs. Those existing calls are mostly Wikipedia, plus geolocation and project-specific services; they remain dependencies of their HTML pages and are not re-hosted by this local API. The collection does not contain a flashcard backend, so the flashcard REST routes are a new local feature.

## Start it

From the repository folder, run:

```powershell
node .\clonbrow-api\server.js
```

The API listens on `http://127.0.0.1:3789` and only binds to this computer. OpenAPI is at `/api/v1/openapi.json`. Set `PORT` to change the port. Keep the original prototype HTML files beside the `clonbrow-api` folder because page routes serve them from the parent folder. `CLONBROW_ROOT` can point to a different prototype directory.

Open `clonbrow-api-generator.html` in a browser to search the offline 262-file inventory, select features, and download a project HTML starter, OpenAPI JSON, or JavaScript client. The generator works directly as a file. Save the generated project HTML into `clonbrow-api/projects/` and open `http://127.0.0.1:3789/projects/clonbrow-project.html` while the API is running.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Check that the service is running |
| GET | `/api/v1/catalog?q=biology&tag=lab` | Search the complete prototype catalog |
| GET | `/api/v1/labs` | List pages classified as labs |
| GET | `/api/v1/pages/{id}` | Get prototype metadata and its page URL |
| GET | `/api/v1/pages/{id}/content` | Return the prototype HTML source |
| GET | `/prototypes/{relative-path}` | Serve a prototype page or its relative local asset |
| GET | `/projects/{relative-path}` | Serve files from the generated-project folder |
| GET | `/api/v1/tools` | List tools and indicate direct API support |
| POST | `/api/v1/tools/{toolId}/run` | Run a supported text utility |
| GET, POST | `/api/v1/flashcards` | List cards or create one |
| GET, PUT, DELETE | `/api/v1/flashcards/{id}` | Read, update, or delete a card |
| POST | `/api/v1/flashcards/{id}/review` | Record a card review |
| GET | `/api/v1/decks` | List decks |
| GET | `/api/v1/openapi.json` | Get the OpenAPI 3.0 document |

Direct tool IDs currently include `bionic-reader`, `readability`, `tone`, `ai-likeness`, `vocabulary`, `regex`, `json`, `markdown`, `sql`, `password`, and `ascii-banner`. Other tools remain usable through their interactive prototype pages. The AI-likeness result is only a simple heuristic.

Flashcards are saved in `clonbrow-api/data/flashcards.json`, not in a temporary directory. Do not expose this unauthenticated local API to a network; it is designed for localhost development.

After adding or renaming prototype files, refresh the generated catalog and generator from the repository root:

```powershell
node .\tools\analyze-prototypes.js
Copy-Item .\clonbrow-api-inventory.json .\clonbrow-api\catalog.json -Force
node .\tools\build-api-generator.js
```

## Example

```js
const api = 'http://127.0.0.1:3789/api/v1';
const labs = await fetch(api + '/labs').then(r => r.json());
console.log(labs.items[0].title, labs.items[0].pageUrl);

const card = await fetch(api + '/flashcards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deck: 'Biology', question: 'What is osmosis?', answer: 'Movement of water across a selectively permeable membrane.' })
}).then(r => r.json());
```
