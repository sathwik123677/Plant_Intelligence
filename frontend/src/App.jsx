import { useCallback, useMemo, useState } from "react";
import Header from "./components/Header";
import ApiKeyBar from "./components/ApiKeyBar";
import StatsBar from "./components/StatsBar";
import UploadZone from "./components/UploadZone";
import ChatPanel from "./components/ChatPanel";
import GraphPanel from "./components/GraphPanel";
import { usePolling } from "./hooks/usePolling";
import { listDocuments, getGraphSummary } from "./api/client";

const SESSION_ID = "demo-" + Math.random().toString(36).slice(2, 10);

function App() {
  const [documents, setDocuments] = useState([]);
  const [graphSummary, setGraphSummary] = useState(null);

  const hasActiveJob = useMemo(
    () => documents.some((d) => d.status === "uploaded" || d.status === "chunking" || d.status === "embedding"),
    [documents]
  );

  usePolling(
    useCallback(() => {
      listDocuments().then(setDocuments).catch(() => {});
    }, []),
    hasActiveJob ? 1500 : 5000,
    [hasActiveJob]
  );

  usePolling(
    useCallback(() => {
      getGraphSummary().then(setGraphSummary).catch(() => {});
    }, []),
    15000,
    []
  );

  function handleUploaded(doc) {
    setDocuments((prev) => [doc, ...prev]);
  }

  function handleCleared() {
    setDocuments([]);
  }

  return (
    <div className="min-h-screen pb-16">
      <Header />
      <ApiKeyBar />
      <StatsBar documents={documents} graphSummary={graphSummary} />

      <main className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-1 gap-5 px-6 lg:max-w-6xl lg:grid-cols-[380px_1fr]">
        <div className="flex flex-col gap-5">
          <UploadZone documents={documents} onUploaded={handleUploaded} onCleared={handleCleared} />
          <GraphPanel graphSummary={graphSummary} />
        </div>
        <ChatPanel sessionId={SESSION_ID} disabled={documents.length === 0} />
      </main>

      <footer className="mt-14 text-center text-xs text-slate-600">
        Built for the ET AI Hackathon — Vector RAG + GraphRAG over industrial plant knowledge.
      </footer>
    </div>
  );
}

export default App;
