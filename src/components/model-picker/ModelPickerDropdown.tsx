import { m as motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { AgentModel } from "@/lib/agentRegistry";
import { glassModelMenu, glassModelMenuStyle } from "./glassModelMenuStyles";

interface ModelPickerDropdownProps {
  models: AgentModel[];
  query: string;
  onSelect: (model: AgentModel) => void;
  onClose: () => void;
}

const ModelPickerDropdown = ({ models, query, onSelect, onClose }: ModelPickerDropdownProps) => {
  const filtered = query
    ? models.filter(
        (m) =>
          m.label.toLowerCase().includes(query.toLowerCase()) ||
          m.id.toLowerCase().includes(query.toLowerCase()),
      )
    : models;

  if (filtered.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-[44]" onClick={onClose} />
      <motion.div
        data-tier-menu
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={`${glassModelMenu.panelScrollable} absolute bottom-full mb-2 left-0 z-[46] w-[min(20rem,calc(100vw-1rem))] max-h-[min(320px,58dvh)] unified-menu-surface`}
        style={glassModelMenuStyle}
      >
        {filtered.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            className={glassModelMenu.item(false, "mb-1 last:mb-0")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06]"><Sparkles className="h-4 w-4 text-primary" /></span>
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{model.label}</span>
          </button>
        ))}
      </motion.div>
    </>
  );
};

export default ModelPickerDropdown;
