import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, VolumeX, Volume2 } from "lucide-react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import mars from "@/assets/portal/mars.mp4.asset.json";
import earth from "@/assets/portal/earth.mp4.asset.json";
import venus from "@/assets/portal/venus.mp4.asset.json";
import intro from "@/assets/portal/intro.mp4.asset.json";
import mercury from "@/assets/portal/mercury.jpg.asset.json";

const states = [
  { name: "Explore", next: "Create", background: mars.url, portal: earth.url },
  { name: "Create", next: "Discover", background: earth.url, portal: venus.url },
  { name: "Discover", next: "Megsy", background: venus.url, portal: mercury.url },
];

/** Screen-locked media clipped through a perspective-projected moving portal. */
export default function MegsyPortal({ ar, onStart }: { ar: boolean; onStart: () => void }) {
  const host = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const windowRef = useRef<HTMLButtonElement>(null);
  const background = useRef<HTMLVideoElement>(null);
  const portal = useRef<HTMLVideoElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const preloader = useRef<HTMLVideoElement>(null);
  const travelRef = useRef<() => void>(() => undefined);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const element = host.current, surface = canvas.current, button = windowRef.current;
    const bg = background.current, video = portal.current, img = image.current, loader = preloader.current;
    const ctx = surface?.getContext("2d");
    if (!element || !surface || !button || !ctx || !bg || !video || !img || !loader) return;
    let alive = true, frame = 0, index = 0, travelling = false, finished = false;
    let rotX = 0, rotY = 0, targetX = 0, targetY = 0, expansion = 0, maskScale = 0, last = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const delay = (ms: number) => new Promise<void>(resolve => { const t = setTimeout(() => { timers.delete(t); resolve(); }, ms); timers.add(t); });
    function play(v: HTMLVideoElement) { return v.play().catch(() => undefined); }
    const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); surface.width = element.clientWidth * d; surface.height = element.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const cover = (media: HTMLVideoElement | HTMLImageElement) => {
      const w = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
      const h = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
      if (!w || !h) return;
      const scale = Math.max(element.clientWidth / w, element.clientHeight / h);
      ctx.drawImage(media, (element.clientWidth - w * scale) / 2, (element.clientHeight - h * scale) / 2, w * scale, h * scale);
    };
    const animate = async (setter: (v: number) => void, duration: number) => {
      const start = performance.now();
      while (alive) {
        const t = Math.min(1, (performance.now() - start) / (reduce ? 1 : duration));
        setter(t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        if (t === 1) break;
        await new Promise<void>(r => requestAnimationFrame(() => r()));
      }
    };
    const reveal = () => animate(v => { maskScale = v; }, 1050);
    const ready = (v: HTMLVideoElement) => new Promise<void>(resolve => {
      if (v.readyState >= 3) { resolve(); return; }
      let complete = false;
      const done = () => { if (complete) return; complete = true; v.removeEventListener("canplay", done); v.removeEventListener("error", done); resolve(); };
      v.addEventListener("canplay", done); v.addEventListener("error", done); void delay(1600).then(done);
    });
    function finish() {
      if (!alive || finished) return;
      finished = true; setProgress(100); setLoaded(true);
      loader.pause(); void play(bg); video.loop = true; void play(video); void reveal();
    }
    function startLoader() {
      if (Number.isFinite(loader.duration) && loader.duration > 0) loader.playbackRate = Math.max(.25, loader.duration / 3);
      void loader.play().catch(finish);
    }
    loader.addEventListener("loadedmetadata", startLoader); loader.addEventListener("ended", finish); loader.addEventListener("error", finish);
    if (loader.readyState >= 1) startLoader();
    void delay(4500).then(finish);
    travelRef.current = async () => {
      if (travelling || !finished || !alive) return;
      if (index === 2) { onStart(); return; }
      travelling = true; setBusy(true); targetX = targetY = 0;
      try {
        video.loop = false; video.currentTime = 0; video.playbackRate = 1.3;
        await ready(video);
        const duration = Number.isFinite(video.duration) ? Math.min(14000, video.duration / 1.3 * 1000) : 4000;
        const ended = new Promise<void>(resolve => video.addEventListener("ended", () => resolve(), { once: true }));
        await play(video); await animate(v => { expansion = v; }, 1100);
        await Promise.race([ended, delay(duration + 800)]);
        if (!alive) return;
        index += 1; setCurrent(index);
        bg.src = states[index].background; bg.load(); await ready(bg); bg.loop = true; await play(bg);
        maskScale = 0; expansion = 0;
        if (index < 2) { video.src = states[index].portal; video.load(); await ready(video); video.loop = true; video.playbackRate = 1; await play(video); }
        await reveal();
      } finally { travelling = false; if (alive) setBusy(false); }
    };
    const pointer = (e: PointerEvent) => { if (travelling || reduce) return; const r = element.getBoundingClientRect(); targetY = ((e.clientX - r.left) / r.width - .5) * 37.4; targetX = ((e.clientY - r.top) / r.height - .5) * -33; };
    const leave = () => { targetX = targetY = 0; };
    const render = (time: number) => {
      if (!alive) return;
      const dt = Math.min(time - last, 40); last = time;
      if (!finished && loader.duration) setProgress(Math.min(99, Math.round(loader.currentTime / loader.duration * 100)));
      rotX += (targetX - rotX) * Math.min(1, dt * .009); rotY += (targetY - rotY) * Math.min(1, dt * .009);
      const box = button.getBoundingClientRect(), bounds = element.getBoundingClientRect();
      const W = bounds.width, H = bounds.height, e = expansion;
      const cx = box.left - bounds.left + box.width / 2, cy = box.top - bounds.top + box.height / 2;
      const x = cx + (W / 2 - cx) * e, y = cy + (H / 2 - cy) * e;
      const scale = e ? 1 : maskScale, w = (box.width + (W - box.width) * e) * scale, h = (box.height + (H - box.height) * e) * scale;
      const r = Math.min(90 * (1 - e) * scale, w / 2, h / 2);
      ctx.clearRect(0, 0, W, H);
      if (w > 1 && h > 1) {
        const ax = rotX * (1 - e) * Math.PI / 180, ay = rotY * (1 - e) * Math.PI / 180;
        ctx.save(); ctx.beginPath();
        const corners = [[w/2-r,-h/2+r,-Math.PI/2,0],[w/2-r,h/2-r,0,Math.PI/2],[-w/2+r,h/2-r,Math.PI/2,Math.PI],[-w/2+r,-h/2+r,Math.PI,Math.PI*1.5]];
        corners.forEach(([a,b,start,end], corner) => { for (let i=0;i<=10;i++) { const angle = start+(end-start)*i/10, px=a+Math.cos(angle)*r, py=b+Math.sin(angle)*r; const z=px*Math.sin(ay)-py*Math.sin(ax), p=850/(850+z); const sx=x+px*Math.cos(ay)*p, sy=y+py*Math.cos(ax)*p; if (corner===0 && i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy); } });
        ctx.closePath(); ctx.clip();
        try { cover(index === 2 && !travelling ? img : video); } catch { /* unavailable frame: keep background */ }
        ctx.restore();
      }
      frame = requestAnimationFrame(render);
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(element);
    element.addEventListener("pointermove", pointer); element.addEventListener("pointerleave", leave);
    frame = requestAnimationFrame(render);
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); timers.forEach(clearTimeout); element.removeEventListener("pointermove", pointer); element.removeEventListener("pointerleave", leave); loader.removeEventListener("loadedmetadata", startLoader); loader.removeEventListener("ended", finish); loader.removeEventListener("error", finish); [loader, video, bg].forEach(v => v.pause()); };
  }, [onStart]);

  return <section ref={host} className={`megsy-experience ${loaded ? "is-ready" : ""} ${busy ? "is-travelling" : ""}`} aria-label={ar ? "عالم ميغسي" : "The Megsy universe"} dir="ltr">
    <video ref={background} className="megsy-space-background" src={mars.url} muted={muted} loop playsInline preload="auto" poster={mercury.url} />
    <div className="megsy-space-shade" />
    <div className="megsy-space-preloader" aria-hidden={loaded}><video ref={preloader} src={intro.url} muted playsInline preload="auto" /><span>{progress}<small>%</small></span></div>
    <header className="megsy-space-header"><a href="/landing" className="megsy-space-wordmark">NOVA<span>AI</span></a><nav aria-label="Landing navigation"><a href="#possibilities">{ar ? "المميزات" : "Explore"}</a><a href="#egypt">{ar ? "من مصر" : "From Egypt"}</a><Button variant="neutral" size="sm" onClick={onStart}>{ar ? "ابدأ" : "Start creating"}<ArrowUpRight size={15} /></Button></nav></header>
    <aside className="megsy-world-list">{["Chat", "Research", "Documents", "Code", "Agents", "Images", "Video"].map((name,i) => <a key={name} href="#possibilities" className={i === current ? "active" : ""}>{name}</a>)}</aside>
    <canvas ref={canvas} className="megsy-portal-canvas" aria-hidden="true" />
    <div className="megsy-portal-wrap"><div className="megsy-portal-heading"><span>{ar ? "التالي" : "Next"}</span><span>[0{current+2}] {states[current].next}</span></div><Button ref={windowRef} variant="ghost" className="megsy-portal" aria-label={`Travel to ${states[current].next}`} disabled={busy || !loaded} onClick={() => travelRef.current()}><span className="sr-only">{states[current].next}</span></Button><p className="megsy-portal-label">{busy ? (ar ? "بننتقل…" : "Preparing orbit…") : (ar ? "عالم جديد مستنيك" : "A new world awaits")}</p></div>
    <video ref={portal} className="megsy-pixel-source" src={earth.url} muted playsInline preload="auto" /><img ref={image} className="megsy-pixel-source" src={mercury.url} alt="" width={1920} height={1080} />
    <div className="megsy-planet-content"><div><p>{ar ? "أفكارك، من أول سؤال لآخر خطوة" : "YOUR IDEAS. FROM FIRST THOUGHT TO FINISHED WORK."}</p><h1>NOVA</h1></div><div className="megsy-space-facts" dir={ar ? "rtl" : "ltr"}><div><span>{ar ? "شريكك" : "Your partner"}</span><p>{ar ? "بيفكر معاك، يبحث ويشتغل." : "Think together. Research. Make it happen."}</p></div><div><span>{ar ? "مكان واحد" : "One space"}</span><p>{ar ? "شات، ملفات، كود ووكلاء." : "Chat, files, code and personal agents."}</p></div><div><span>{ar ? "من القاهرة" : "From Cairo"}</span><p>{ar ? "ذكاء اصطناعي بروح مصرية." : "Egyptian roots. Worldwide possibilities."}</p></div></div></div>
    <div className="megsy-space-character"><AgentOrb state={busy ? "tool" : "hello"} size={64} /><Button variant="ghost" size="icon-sm" aria-label={muted ? "Unmute background" : "Mute background"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</Button></div>
  </section>;
}