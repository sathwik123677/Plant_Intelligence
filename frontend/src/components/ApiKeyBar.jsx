import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ChevronDown, Check, ExternalLink } from "lucide-react";
import { getStoredApiKey, setStoredApiKey } from "../api/client";

export default function ApiKeyBar() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getStoredApiKey());
  const [saved, setSaved] = useState(Boolean(getStoredApiKey()));

  function handleSave(e) {
    e.preventDefault();
    setStoredApiKey(value.trim());
    setSaved(Boolean(value.trim()));
    setOpen(false);
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-4xl px-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-400/20 hover:text-cyan-300"
      >
        <KeyRound size={12} />
        {saved ? "Using your own Gemini API key" : "Use your own Gemini API key (optional)"}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSave}
              className="glass mx-auto mt-3 flex max-w-md flex-col gap-2 rounded-xl p-4"
            >
              <p className="text-xs text-slate-400">
                By default this demo uses the host's Gemini key. Paste your own free key
                to run everything on your own quota — nothing changes except which
                key answers your requests.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="AIza…"
                  className="flex-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-400/40"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950"
                >
                  <Check size={14} /> Save
                </button>
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-cyan-400/80 hover:text-cyan-300"
              >
                Get a free key at aistudio.google.com <ExternalLink size={11} />
              </a>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
