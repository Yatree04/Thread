import { AnimatePresence, motion } from "framer-motion";

export default function Toast({ message }) {
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-full px-3.5 py-1.5 text-[12.5px] shadow-xl"
            style={{
              background: "var(--color-surface-elevated-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-dim)",
            }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
