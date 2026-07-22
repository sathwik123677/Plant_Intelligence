import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Trash2, ChevronDown } from "lucide-react";
import { uploadDocument, clearAllDocuments } from "../api/client";

const STATUS_META = {
  uploaded: { label: "Queued", color: "#94a3b8", icon: Loader2, spin: true },
  chunking: { label: "Chunking", color: "#22d3ee", icon: Loader2, spin: true },
  embedding: { label: "Embedding", color: "#f59e0b", icon: Loader2, spin: true },
  ready: { label: "Ready", color: "#34d399", icon: CheckCircle2, spin: false },
  failed: { label: "Failed", color: "#f87171", icon: XCircle, spin: false },
};

export default function UploadZone({ documents, onUploaded, onCleared }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      setError("");
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const doc = await uploadDocument(file);
          onUploaded(doc);
        }
      } catch (err) {
        setError(err?.response?.data?.error || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    multiple: true,
  });

  async function handleClearAll() {
    setClearing(true);
    try {
      await clearAllDocuments();
      onCleared?.();
    } catch {
      setError("Failed to clear documents. Please try again.");
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-4 rounded-2xl p-5">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragActive
            ? "border-cyan-400 bg-cyan-400/5"
            : "border-slate-700 hover:border-slate-600 hover:bg-white/[0.02]"
        }`}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <UploadCloud size={32} className={isDragActive ? "text-cyan-400" : "text-slate-500"} />
        </motion.div>
        <p className="text-sm font-medium text-slate-300">
          {isDragActive ? "Drop to ingest" : "Drag & drop PDFs or .txt files"}
        </p>
        <p className="text-xs text-slate-500">or click to browse — multiple files supported</p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {documents.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setListOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
            >
              <ChevronDown size={12} className={`transition-transform ${listOpen ? "rotate-180" : ""}`} />
              {documents.length} document{documents.length > 1 ? "s" : ""}
            </button>
            {confirmingClear ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Clear everything?</span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="rounded-full bg-red-400/15 px-2.5 py-1 text-red-300 hover:bg-red-400/25 disabled:opacity-50"
                >
                  {clearing ? "Clearing…" : "Yes, clear"}
                </button>
                <button
                  onClick={() => setConfirmingClear(false)}
                  className="rounded-full px-2.5 py-1 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingClear(true)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-300"
              >
                <Trash2 size={12} /> Clear all
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {listOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
                  {documents.map((doc) => {
                    const meta = STATUS_META[doc.status] || STATUS_META.uploaded;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText size={16} className="shrink-0 text-slate-500" />
                          <span className="truncate text-sm text-slate-300">{doc.original_name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-xs" style={{ color: meta.color }}>
                          <Icon size={13} className={meta.spin ? "animate-spin" : ""} />
                          {meta.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
