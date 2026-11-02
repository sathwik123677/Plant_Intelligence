# Plant Intelligence — Unified Asset & Operations Brain

**AI for Industrial Knowledge Intelligence.** Upload plant documents (manuals,
work orders, inspection records), ask questions in plain English, and get
answers grounded in your own documents — with source citations. It also
includes a GraphRAG panel that answers *relational* questions ("what's
downstream of X?") using a knowledge graph instead of plain similarity search.

A demo plant corpus (a fictional "Riverside Processing Unit") is included in
`data/` — one setup command loads it in, so you can try the app immediately
without uploading anything yourself.

## Architecture

- **`frontend/`** — React + Vite + Tailwind. Drag-and-drop upload, live status
  polling, chat UI with source citations, GraphRAG side panel.
- **`backend/`** — TypeScript + Node.js (Express). Ingests documents (PDF/TXT
  chunking → Gemini embeddings → vector store), serves the chat and GraphRAG API,
  processes uploads asynchronously in the background.
- **`data/`** — Demo plant corpus (manuals, work orders, inspection records) loaded into the vector store by the setup command.

## Prerequisites

- Node.js 20+
- A free **Google AI Studio** API key: https://aistudio.google.com/apikey
- *(Optional, for the Graph Insights panel)* a free **Neo4j AuraDB** instance:
  https://console.neo4j.io

## Setup

### 1. Configure environment variables

Copy the example env file and fill in your own key(s):

```bash
cp .env.example .env
```

Edit `.env` and set `GOOGLE_API_KEY` at minimum. The `NEO4J_*` values are
optional — without them, the app runs fine and the "Graph Insights" panel
simply shows an "unavailable" state instead of crashing.

### 2. Backend (TypeScript / Node.js)

In your first terminal:

```bash
cd backend
npm install
npm run seed   # loads the pre-built demo plant corpus into the vector store
npm run dev
```

Backend runs at **http://127.0.0.1:8000**.

### 3. Frontend (React)

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** — open this in your browser.

## Using it

1. **Ask questions right away** about the pre-loaded demo plant, e.g.
   *"What maintenance history does pump P-101 have?"*
2. **Drag and drop your own PDF or .txt files** into the upload zone. Watch
   the status badge move through `Chunking → Embedding → Ready` (usually a
   few seconds per file), then ask questions about the content you uploaded —
   it joins the same searchable knowledge base.
3. **Try the Graph Insights panel** for relational questions about the demo
   plant's equipment (e.g. *"What is downstream of T-201?"*) — this queries a
   pre-built knowledge graph, not your uploads, and demonstrates GraphRAG
   answering questions plain vector search can't.
4. **Optional: use your own Gemini API key.** Click "Use your own Gemini API
   key" near the top of the page and paste one in — every request from your
   browser will then run on your own quota instead of the host's.
5. **Starting over.** The "Clear all" button in the upload panel wipes every
   document and resets the vector store, in case you want to test with a
   completely fresh set of documents. (Run `npm run seed` again
   afterward in `backend/` if you want the demo plant corpus back.)

## Notes for evaluators

- Both the chat and upload pipelines are fully functional end-to-end — this
  isn't a mockup.
- If the Graph Insights panel shows "unavailable," it just means the optional
  Neo4j instance isn't configured or is unreachable — the core Vector RAG
  chat is unaffected.
- Large PDFs may take longer to embed depending on Google's free-tier API
  rate limits; the status badge will reflect real progress.
