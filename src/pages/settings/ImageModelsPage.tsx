import { useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LOCAL_IMAGE_MODELS_KEY, useDynamicModels } from "@/hooks/useModels";
import type { ModelDetail } from "@/lib/modelDetails";

const emptyForm = { slug: "", name: "", provider: "", credits: "0", resolution: "1K", aspect: "1:1", description: "" };

export default function ImageModelsPage() {
  const navigate = useNavigate();
  const { models } = useDynamicModels();
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState<ModelDetail[]>(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_IMAGE_MODELS_KEY) || "[]"); } catch { return []; }
  });
  const visible = useMemo(() => models.filter((m) => m.type === "image"), [models]);

  const addModel = (event: React.FormEvent) => {
    event.preventDefault();
    const slug = form.slug.trim().toLowerCase();
    if (!slug || !form.name.trim() || !form.provider.trim()) {
      toast.error("املأ الـ slug والاسم والمزوّد");
      return;
    }
    const model = {
      id: slug, slug, name: form.name.trim(), type: "image", provider: form.provider.trim(),
      credits: Number(form.credits) || 0, description: form.description.trim() || "Custom image model",
      longDescription: form.description.trim() || "Custom image model", icon: "Image",
      modes: ["text-to-image"], acceptsImages: false, requiresImage: false, maxImages: 0,
      acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"], speed: "standard", quality: "high",
      badges: [Number(form.credits) > 0 ? "PRO" : "FREE"], supportedAspects: [form.aspect],
      supportedResolutions: [form.resolution], defaultAspect: form.aspect, defaultResolution: form.resolution,
      isPremium: Number(form.credits) > 0, isFeatured: false,
    } as unknown as ModelDetail;
    const next = [...saved.filter((item) => item.slug !== slug), model];
    localStorage.setItem(LOCAL_IMAGE_MODELS_KEY, JSON.stringify(next));
    setSaved(next); setForm(emptyForm); toast.success("اتضاف النموذج — افتح المنتقي لتجربته");
  };

  const removeModel = (slug: string) => {
    const next = saved.filter((item) => item.slug !== slug);
    localStorage.setItem(LOCAL_IMAGE_MODELS_KEY, JSON.stringify(next)); setSaved(next); toast.success("تم حذف النموذج المحلي");
  };

  return (
    <main dir="rtl" className="min-h-dvh bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" aria-label="رجوع"><ArrowLeft className="h-4 w-4" /></button>
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Media catalog</p><h1 className="text-2xl font-semibold tracking-tight">نماذج الصور</h1><p className="mt-1 text-sm text-muted-foreground">أضف النموذج والـ resolution والـ aspect ratio ليظهر في منتقي الصور.</p></div>
        </header>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><ImagePlus className="h-5 w-5" /></div><div><h2 className="font-semibold">إضافة نموذج جديد</h2><p className="text-xs text-muted-foreground">الحفظ هنا محلي للمتصفح، وبيظهر فورًا في المنتقي.</p></div></div>
          <form onSubmit={addModel} className="grid gap-3 md:grid-cols-2">
            {[['slug','Slug / API ID'],['name','اسم النموذج'],['provider','المزوّد'],['credits','MC لكل صورة']].map(([key,label]) => <label key={key} className="space-y-1.5 text-sm"><span className="text-muted-foreground">{label}</span><input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" /></label>)}
            <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">الحجم / Resolution</span><input value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="1K, 2K, 4K" className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">Aspect ratio</span><input value={form.aspect} onChange={(e) => setForm({ ...form, aspect: e.target.value })} placeholder="1:1, 16:9" className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" /></label>
            <label className="space-y-1.5 text-sm md:col-span-2"><span className="text-muted-foreground">وصف مختصر</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" /></label>
            <button className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground md:col-span-2"><Plus className="h-4 w-4" /> إضافة النموذج</button>
          </form>
        </section>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">الكتالوج الحالي</h2><span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{visible.length} نموذج</span></div><div className="grid gap-3 md:grid-cols-2">{visible.slice(0, 12).map((model) => <div key={model.slug} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ImagePlus className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{model.name}</p><p className="truncate text-xs text-muted-foreground">{model.provider} · {model.defaultResolution || "1K"} · {model.defaultAspect || "1:1"}</p></div>{saved.some((item) => item.slug === model.slug) && <button onClick={() => removeModel(model.slug)} className="text-destructive" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>}</div>)}</div></section>
      </div>
    </main>
  );
}
