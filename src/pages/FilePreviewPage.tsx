import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileQuestion, FileText, ExternalLink } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { clearFilePreview, readFileForPreview, type FilePreviewPayload } from "@/lib/filePreviewStore";

const textTypes = /^(text\/|application\/json|application\/javascript)/i;
const officeTypes = /word|excel|spreadsheet|presentation|msword|officedocument/i;

export default function FilePreviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<FilePreviewPayload | null>(null);

  useEffect(() => {
    setFile(readFileForPreview(id));
    return () => clearFilePreview(id);
  }, [id]);

  if (!file) {
    return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center text-foreground"><div><FileQuestion className="mx-auto mb-3 h-8 w-8 opacity-60" /><p className="text-sm">Preview not available. Please attach the file again.</p><button className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm text-background" onClick={() => navigate(-1)}>Go back</button></div></main>;
  }

  const type = file.type || "application/octet-stream";
  const image = type.startsWith("image/");
  const pdf = type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const text = textTypes.test(type) || /\.(txt|md|markdown|csv|json|log|xml|html?)$/i.test(file.name);
  const office = officeTypes.test(type) || /\.(docx?|xlsx?|pptx?)$/i.test(file.name);

  return <main className="flex min-h-dvh flex-col bg-background text-foreground">
    <header className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
      <button className="rounded-lg p-2 hover:bg-accent" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></button>
      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-medium">{file.name}</h1>
      <a className="rounded-lg p-2 hover:bg-accent" href={file.url} download={file.name} target="_blank" rel="noreferrer" aria-label="Download"><Download className="h-4 w-4" /></a>
    </header>
    <section className="min-h-0 flex-1 overflow-auto bg-muted/20 p-3 sm:p-6">
      {image && <div className="flex min-h-full items-center justify-center rounded-2xl border border-border/50 bg-background/70 p-3 shadow-sm"><img src={file.url} alt={file.name} className="max-h-[calc(100dvh-130px)] max-w-full rounded-xl object-contain" /></div>}
      {pdf && <iframe title={file.name} src={file.url} className="h-full min-h-[75vh] w-full border-0 bg-background" />}
      {text && <div className="mx-auto flex min-h-[75vh] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-sm"><div className="flex items-center gap-2 border-b border-border/50 px-4 py-3 text-sm font-medium"><FileText className="h-4 w-4 text-muted-foreground" />{file.name}</div><iframe title={file.name} src={file.url} className="min-h-[70vh] flex-1 border-0 bg-background" sandbox="allow-same-origin" /></div>}
      {office && <iframe title={file.name} src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`} className="h-full min-h-[75vh] w-full border-0 bg-background" />}
      {!image && !pdf && !text && !office && <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center rounded-2xl border border-border/50 bg-background px-6 text-center shadow-sm"><FileQuestion className="mb-3 h-10 w-10 text-muted-foreground/70" /><p className="text-sm text-muted-foreground">This file type cannot be previewed in the browser.</p><a href={file.url} target="_blank" rel="noreferrer" download={file.name} className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"><ExternalLink className="h-4 w-4" />Open or download</a></div>}
    </section>
  </main>;
}
