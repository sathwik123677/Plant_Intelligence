import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Loader2, AlertTriangle } from "lucide-react";
import { queryGraph } from "../api/client";

const EXAMPLES = [
  "What is downstream of T-201?",
  "What protects pump P-101?",
  "Which technician performed the most work orders?",
];

export default function GraphPanel({ graphSummary }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setQuestion(text);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await queryGraph(text);
      if (res.error) setError(res.error);
      else setResult(res.result);
    } catch (err) {
      setError(err?.response?.data?.error || "Graph query failed.");
    } finally {
      setLoading(false);
    }
  }

  const unavailable = graphSummary && graphSummary.available === false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass flex flex-col gap-4 rounded-2xl p-5"
    >
      <div className="flex items-center gap-2">
        <Share2 size={16} className="text-purple-300" />
        <h3 className="text-sm font-semibold text-slate-200">Graph Insights</h3>
        <span className="ml-auto rounded-full bg-purple-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-purple-300">
          Relational reasoning
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Ask multi-hop questions about equipment relationships — traversed via the
        pre-loaded demo plant's knowledge graph (not your uploaded documents),
        showing how GraphRAG beats plain similarity search on relational questions.
      </p>

      {unavailable ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle size={13} className="shrink-0" />
          Graph database is currently unreachable — vector search chat is unaffected.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => ask(ex)}
                className="rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[11px] text-slate-400 hover:border-purple-400/30 hover:text-purple-300"
              >
                {ex}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="flex gap-2"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What is downstream of T-201?"
              className="flex-1 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-purple-400/40"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="rounded-xl bg-purple-400/15 px-3 py-2 text-sm text-purple-200 disabled:opacity-30"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Ask"}
            </button>
          </form>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {result != null && (
            <div className="rounded-lg border border-purple-400/10 bg-purple-400/[0.03] px-3 py-2 font-mono text-xs text-slate-300">
              {JSON.stringify(result, null, 2)}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
