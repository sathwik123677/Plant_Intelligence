import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-3 px-6 pt-14 pb-10 text-center"
    >
      <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium tracking-wide text-cyan-300 uppercase">
        <BrainCircuit size={14} className="text-cyan-400" />
        AI for Industrial Knowledge Intelligence
      </div>
      <h1 className="text-glow-cyan bg-gradient-to-b from-white to-slate-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        Plant Intelligence
      </h1>
      <p className="max-w-xl text-sm text-slate-400 sm:text-base">
        A unified asset &amp; operations brain — upload plant documents, ask
        questions in plain English, and get answers grounded in your own
        manuals, work orders, and equipment relationships.
      </p>
    </motion.header>
  );
}
