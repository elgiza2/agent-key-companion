import { useMemo } from "react";
import { FileText, FileSpreadsheet, FileCode, File as FileIcon, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { stashFileForPreview } from "@/lib/filePreviewStore";

export interface ChatFileAttachment { name: string; type: string; data?: string; size?: number; }
const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();
function iconFor(ext: string) {
  if (ext === "pdf") return FileText;
  if (["csv", "xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["json", "js", "ts", "tsx", "jsx", "py", "html", "css"].includes(ext)) return FileCode;
  return FileIcon;
}
function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function estimateDataUrlBytes(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return undefined;
  return Math.round(((dataUrl.split(",")[1] || "").length * 3) / 4);
}

/** File chip that opens a dedicated full-screen route for every attachment type. */
export default function ChatFileCard({ file }: { file: ChatFileAttachment }) {
  const navigate = useNavigate();
  const ext = useMemo(() => extOf(file.name), [file.name]);
  const isLink = file.type === "link";
  const Icon = isLink ? Link2 : iconFor(ext);
  const size = formatSize(file.size ?? estimateDataUrlBytes(file.data));
  const label = isLink ? "Link" : ext ? ext.toUpperCase() : "File";
  const open = () => {
    if (isLink && file.data) { window.open(file.data, "_blank", "noopener,noreferrer"); return; }
    if (!file.data) return;
    const id = stashFileForPreview({ name: file.name, type: file.type || "application/octet-stream", url: file.data, size: file.size });
    navigate(`/file-preview/${id}`);
  };
  return <button type="button" onClick={open} className="flex max-w-[220px] items-center gap-2.5 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-start transition-colors hover:bg-muted">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/10"><Icon className="h-4 w-4 text-foreground/70" /></span>
    <span className="flex min-w-0 flex-col"><span className="truncate text-[12.5px] font-medium leading-tight text-foreground">{file.name}</span><span className="text-[10.5px] leading-tight text-muted-foreground">{label}{size ? ` · ${size}` : ""}</span></span>
  </button>;
}
