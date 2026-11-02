import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, ChevronDown, Loader2 } from "lucide-react";
import { sendChatMessage } from "../api/client";

function SourceList({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-cyan-400/80 hover:text-cyan-300"
      >
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {sources.length} source{sources.length > 1 ? "s" : ""}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-2">
              {sources.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                  <div className="mb-1 font-mono text-cyan-400/90">{s.filename}</div>
                  <div className="text-slate-500">{s.snippet}…</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPanel({ sessionId, disabled }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me anything about your plant's equipment, maintenance history, or uploaded documents.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(text, sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            err?.response?.data?.error || "Something went wrong reaching the knowledge base.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass flex h-[520px] flex-col rounded-2xl">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-amber-400/15 text-amber-300" : "bg-cyan-400/15 text-cyan-300"
              }`}
            >
              {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-400/10 text-amber-50"
                  : "bg-white/[0.03] text-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap">
                {typeof m.content === "string" ? m.content : JSON.stringify(m.content)}
              </p>
              {m.role === "assistant" && <SourceList sources={m.sources} />}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-10 text-xs text-slate-500">
            <Loader2 size={13} className="animate-spin" /> thinking…
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/5 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? "Ingest a document first, or ask about the pre-loaded plant…" : "Ask about equipment, maintenance, or manuals…"}
          className="flex-1 rounded-xl border border-white/5 bg-black/20 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-400/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 transition-opacity disabled:opacity-30"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
