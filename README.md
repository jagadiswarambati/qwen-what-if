# Qwen What-If — Interactive Scenario Lab

Next.js frontend and a separate Express API for testing Qwen and Miro integrations.
The browser only calls the local API; API keys and access tokens remain server-side.

## Configuration

Add these values to `.env.local` in the project root. The Qwen integration uses
the organizer-provided ModelScope-compatible endpoint and model.

```dotenv
MODELSCOPE_API_KEY=
QWEN_MODEL=Qwen-Ambassador/Qwen3.7-Max
MIRO_ACCESS_TOKEN=
MIRO_BOARD_ID=uXjVEekclPk=
```

`.env.local` is ignored by Git. Never prefix credentials with `NEXT_PUBLIC_`.

## Run locally

In separate terminals, start the frontend and API:

```bash
npm run dev
npm run dev:server
```

The frontend runs at `http://localhost:3000`; the API runs at
`http://localhost:4000` by default. Set `API_PORT` server-side to change the API
port.

## API

- `GET /api/health` — reports whether the API process is responding.
- `GET /api/connections` — tests the configured Qwen model and retrieves the
  configured Miro board name and ID. This makes a small live Qwen request.
- `POST /api/analyze` — accepts `{"scenario":"..."}` and returns validated
  structured JSON from Qwen.
- `POST /api/analyze-and-visualize` — analyzes a scenario with Qwen, then
  creates or updates a deterministic six-card Miro map with connecting arrows.

Map cards use stable board-visible markers so subsequent calls update the same
visualization. The endpoint returns the board ID and all sticky-note/connector
item IDs.
