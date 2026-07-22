import { motion } from "framer-motion";
import { FileText, Layers, Share2, CheckCircle2 } from "lucide-react";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass flex flex-1 min-w-[140px] items-center gap-3 rounded-xl px-4 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}1a`, color: accent }}
      >
        <Icon size={18} />
      </div>
      <div className="text-left">
        <div className="text-lg font-semibold text-slate-100">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function StatsBar({ documents, graphSummary }) {
  const readyDocs = documents.filter((d) => d.status === "ready").length;
  const totalChunks = documents.reduce((sum, d) => sum + (d.num_chunks || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mx-auto flex w-full max-w-4xl flex-wrap gap-3 px-6"
    >
      <StatCard icon={FileText} label="Documents ingested" value={documents.length} accent="#22d3ee" />
      <StatCard icon={CheckCircle2} label="Ready to query" value={readyDocs} accent="#34d399" />
      <StatCard icon={Layers} label="Chunks indexed" value={totalChunks} accent="#f59e0b" />
      <StatCard
        icon={Share2}
        label="Graph relationships"
        value={graphSummary?.available ? graphSummary.relationships : "—"}
        accent="#c084fc"
      />
    </motion.div>
  );
}
