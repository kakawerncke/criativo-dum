import { useState, useRef } from "react";

const STEPS = ["brand", "briefing", "generate", "gallery"];
const STEP_LABELS = { brand: "Brand Profile", briefing: "Briefing", generate: "Geração", gallery: "Galeria" };
const FORMATS = [
  { id: "feed",      label: "Feed 1:1",      w: 1080, h: 1080, icon: "⬜" },
  { id: "stories",   label: "Stories 9:16",  w: 1080, h: 1920, icon: "📱" },
  { id: "landscape", label: "Paisagem 4:5",  w: 1080, h: 1350, icon: "🖼" },
  { id: "banner",    label: "Banner 16:9",   w: 1920, h: 1080, icon: "🖥" },
];
const TONES = ["Urgente", "Aspiracional", "Educativo", "Provocador", "Emocional", "Direto ao ponto"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

// PATCHED: calls server-side proxy
async function callClaude(systemPrompt, messages) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ─── UI Primitives ─────────────────────────────────────────────────────────────

function Tag({ children, color = "#F97316", onRemove }) {
  return (
    <span style={{ background: color + "22", border: `1px solid ${color}44`, color, padding: "2px 10px", borderRadius: 4, fontSize: 12, fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: 6 }}>
      {children}
      {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color, lineHeight: 1, padding: 0, fontSize: 14 }}>×</button>}
    </span>
  );
}

function Input({ label, value, onChange, placeholder, multiline, type = "text" }) {
  const s = { width: "100%", background: "#0F0F0F", border: "1px solid #2a2a2a", borderRadius: 6, color: "#E5E5E5", padding: "10px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, outline: "none", resize: multiline ? "vertical" : undefined, minHeight: multiline ? 90 : undefined, boxSizing: "border-box" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: "#666", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      {multiline ? <textarea style={s} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /> : <input style={s} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style: extra }) {
  const base = { padding: "10px 20px", border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, transition: "all 0.15s", opacity: disabled ? 0.4 : 1, letterSpacing: "0.04em", ...extra };
  const v = { primary: { background: "#F97316", color: "#0A0A0A" }, ghost: { background: "transparent", color: "#888", border: "1px solid #2a2a2a" }, success: { background: "#14532d", color: "#86efac" } };
  return <button style={{ ...base, ...v[variant] }} onClick={disabled ? undefined : onClick}>{children}</button>;
}

function Section({ title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ margin: 0, color: "#555", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace", borderBottom: "1px solid #1a1a1a", paddingBottom: 10 }}>{title}</h3>
      {children}
    </div>
  );
}

// ─── Upload Zone ───────────────────────────────────────────────────────────────

function UploadZone({ label, accept, onFile, preview, loading, hint, icon = "↑" }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);

  const handle = (file) => { if (!file) return; onFile(file); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && <label style={{ fontSize: 11, color: "#666", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      <div
        onClick={() => !preview && !loading && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${dragging ? "#F97316" : preview ? "#166534" : "#222"}`, borderRadius: 8, padding: preview ? 0 : "28px 20px", textAlign: "center", cursor: preview ? "default" : "pointer", background: dragging ? "#F9731608" : preview ? "#0a140a" : "#0A0A0A", position: "relative", overflow: "hidden", transition: "all 0.15s", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 20 }}>
            <div style={{ width: 28, height: 28, border: "3px solid #1a1a1a", borderTopColor: "#F97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ color: "#555", fontFamily: "monospace", fontSize: 12 }}>Processando com IA...</span>
          </div>
        ) : preview ? (
          <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {preview.type === "image" ? (
              <img src={preview.url} alt="preview" style={{ maxHeight: 120, maxWidth: "80%", objectFit: "contain", padding: 16 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
                <span style={{ fontSize: 28 }}>📄</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#86efac", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{preview.name}</div>
                  <div style={{ color: "#4ade80", fontFamily: "monospace", fontSize: 11, marginTop: 2, opacity: 0.7 }}>Manual lido pela IA ✓</div>
                </div>
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); onFile(null); }}
              style={{ position: "absolute", top: 6, right: 6, background: "#1a1a1a", border: "none", color: "#888", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8, color: "#2a2a2a" }}>{icon}</div>
            <div style={{ color: "#444", fontFamily: "monospace", fontSize: 12 }}>Arraste ou clique para selecionar</div>
            {hint && <div style={{ color: "#2a2a2a", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>{hint}</div>}
          </div>
        )}
        <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
      </div>
    </div>
  );
}

// ─── STEP 1: Brand Profile ─────────────────────────────────────────────────────

function BrandStep({ brand, setBrand, onNext }) {
  const [colorInput, setColorInput] = useState("");
  const [fontInput, setFontInput]   = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [pdfStatus, setPdfStatus]     = useState(null);

  const handleLogo = async (file) => {
    if (!file) { setBrand(b => ({ ...b, logoBase64: null, logoUrl: null, logoMime: null })); return; }
    setLogoLoading(true);
    try {
      const [base64, dataUrl] = await Promise.all([fileToBase64(file), fileToDataURL(file)]);
      setBrand(b => ({ ...b, logoBase64: base64, logoUrl: dataUrl, logoMime: file.type || "image/png" }));
    } catch (e) { console.error(e); }
    setLogoLoading(false);
  };

  const handlePdf = async (file) => {
    if (!file) { setBrand(b => ({ ...b, pdfBase64: null, pdfName: null, pdfPages: null })); setPdfStatus(null); return; }
    setPdfLoading(true);
    setPdfStatus("analyzing");
    try {
      const base64 = await fileToBase64(file);
      setBrand(b => ({ ...b, pdfBase64: base64, pdfName: file.name }));

      const raw = await callClaude(
        `Você é um especialista em branding e identidade visual.
Analise o manual de marca enviado e extraia informações em JSON puro (sem markdown, sem backticks):
{
  "nome_marca": "",
  "descricao": "descrição do negócio e posicionamento",
  "promessa": "promessa central da marca",
  "cores": ["#hex1", "#hex2"],
  "fontes": ["Fonte Principal", "Fonte Secundária"],
  "tom_de_voz": ["atributo1", "atributo2"],
  "instrucoes": "regras de uso da marca, aplicações permitidas e proibidas",
  "paginas_detectadas": 0
}
Se não encontrar alguma informação, deixe o campo vazio. Sempre retorne JSON válido.`,
        [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Extraia todas as informações de branding deste manual de marca." }
        ]}]
      );

      const extracted = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setBrand(b => ({
        ...b,
        pdfPages: extracted.paginas_detectadas || "?",
        name:         b.name        || extracted.nome_marca || "",
        description:  b.description || extracted.descricao  || "",
        promise:      b.promise     || extracted.promessa   || "",
        colors:       b.colors.length  ? b.colors  : (extracted.cores     || []),
        fonts:        b.fonts.length   ? b.fonts   : (extracted.fontes    || []),
        voiceTags:    b.voiceTags.length ? b.voiceTags : (extracted.tom_de_voz || []),
        instructions: b.instructions || extracted.instrucoes || "",
      }));
      setPdfStatus("done");
    } catch (e) { console.error(e); setPdfStatus("error"); }
    setPdfLoading(false);
  };

  const addColor = () => { if (colorInput && !brand.colors.includes(colorInput)) { setBrand(b => ({ ...b, colors: [...b.colors, colorInput] })); setColorInput(""); } };
  const addFont  = () => { if (fontInput  && !brand.fonts.includes(fontInput))   { setBrand(b => ({ ...b, fonts:  [...b.fonts,  fontInput]  })); setFontInput("");  } };

  const valid = brand.name && brand.description && brand.colors.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      <Section title="Arquivos da marca">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <UploadZone
            label="Logomarca (PNG / SVG)"
            accept="image/png,image/svg+xml,image/jpeg"
            onFile={handleLogo}
            loading={logoLoading}
            icon="🖼"
            hint="PNG com fundo transparente recomendado"
            preview={brand.logoUrl ? { type: "image", url: brand.logoUrl } : null}
          />
          <UploadZone
            label="Manual de marca (PDF)"
            accept="application/pdf"
            onFile={handlePdf}
            loading={pdfLoading}
            icon="📘"
            hint="Claude vai ler e extrair cores, fontes e diretrizes"
            preview={brand.pdfBase64 ? { type: "pdf", name: brand.pdfName, pages: brand.pdfPages } : null}
          />
        </div>
        {pdfStatus === "done" && (
          <div style={{ background: "#0d2010", border: "1px solid #166534", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div style={{ color: "#86efac", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>Manual de marca lido com sucesso</div>
              <div style={{ color: "#4ade80", fontFamily: "monospace", fontSize: 11, marginTop: 2, opacity: 0.7 }}>Cores, fontes e diretrizes preenchidas automaticamente — revise abaixo se necessário</div>
            </div>
          </div>
        )}
        {pdfStatus === "error" && (
          <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "14px 18px", color: "#fca5a5", fontFamily: "monospace", fontSize: 12 }}>
            ⚠️ Não foi possível extrair as informações do PDF. Verifique se o arquivo não está protegido e tente novamente, ou preencha os campos manualmente.
          </div>
        )}
      </Section>

      <Section title="Identidade do cliente">
        <Input label="Nome da marca" value={brand.name} onChange={v => setBrand(b => ({ ...b, name: v }))} placeholder="Ex: São Paulo Home" />
        <Input label="Descrição do negócio" value={brand.description} onChange={v => setBrand(b => ({ ...b, description: v }))} placeholder="O que a marca vende, pra quem, qual o posicionamento..." multiline />
        <Input label="Promessa / Posicionamento central" value={brand.promise} onChange={v => setBrand(b => ({ ...b, promise: v }))} placeholder="Ex: Decoração que eleva o dia a dia sem esvaziar o bolso" />
      </Section>

      <Section title="Paleta de cores">
        <div style={{ display: "flex", gap: 8 }}>
          <input type="color" value={colorInput || "#F97316"} onChange={e => setColorInput(e.target.value)} style={{ width: 44, height: 40, border: "1px solid #2a2a2a", borderRadius: 6, background: "none", cursor: "pointer", padding: 2 }} />
          <input value={colorInput} onChange={e => setColorInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addColor()} placeholder="#RRGGBB" style={{ flex: 1, background: "#0F0F0F", border: "1px solid #2a2a2a", borderRadius: 6, color: "#E5E5E5", padding: "0 14px", fontFamily: "monospace", fontSize: 13, outline: "none" }} />
          <Btn onClick={addColor} variant="ghost">+ Cor</Btn>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {brand.colors.map(c => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, padding: "6px 12px" }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: c }} />
              <span style={{ color: "#aaa", fontFamily: "monospace", fontSize: 12 }}>{c}</span>
              <button onClick={() => setBrand(b => ({ ...b, colors: b.colors.filter(x => x !== c) }))} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Fontes da marca">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={fontInput} onChange={e => setFontInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addFont()} placeholder="Ex: Montserrat Bold" style={{ flex: 1, background: "#0F0F0F", border: "1px solid #2a2a2a", borderRadius: 6, color: "#E5E5E5", padding: "10px 14px", fontFamily: "monospace", fontSize: 13, outline: "none" }} />
          <Btn onClick={addFont} variant="ghost">+ Fonte</Btn>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {brand.fonts.map(f => <Tag key={f} onRemove={() => setBrand(b => ({ ...b, fonts: b.fonts.filter(x => x !== f) }))}>{f}</Tag>)}
        </div>
      </Section>

      <Section title="Tom de voz">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Sofisticado","Descontraído","Técnico","Emotivo","Irreverente","Minimalista","Ousado","Acolhedor"].map(t => (
            <button key={t} onClick={() => { const cur = brand.voiceTags||[]; setBrand(b=>({...b, voiceTags: cur.includes(t)?cur.filter(x=>x!==t):[...cur,t]})); }}
              style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${(brand.voiceTags||[]).includes(t)?"#F97316":"#2a2a2a"}`, background: (brand.voiceTags||[]).includes(t)?"#F9731620":"transparent", color: (brand.voiceTags||[]).includes(t)?"#F97316":"#555", fontFamily: "monospace", fontSize: 12, cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>
        <Input label="Instruções específicas de branding" value={brand.instructions} onChange={v => setBrand(b => ({ ...b, instructions: v }))} placeholder="Ex: Nunca usar fundo branco puro. Manter espaçamento generoso. Preferir fotos lifestyle..." multiline />
      </Section>

      <Btn onClick={onNext} disabled={!valid} style={{ alignSelf: "flex-end", padding: "12px 32px" }}>Próximo → Briefing</Btn>
    </div>
  );
}

// ─── STEP 2: Briefing ─────────────────────────────────────────────────────────

function BriefingStep({ brand, briefing, setBriefing, onNext, onBack }) {
  const [loading, setLoading] = useState(false);
  const [enriched, setEnriched] = useState(briefing._enriched || null);

  const analyze = async () => {
    setLoading(true);
    try {
      const sys = `Você é um estrategista criativo especializado em marketing brasileiro.
Responda APENAS com JSON válido (sem markdown, sem backticks):
{
  "angulos": ["ângulo 1", "ângulo 2", "ângulo 3"],
  "headlines": ["headline 1", "headline 2", "headline 3"],
  "ctas": ["CTA 1", "CTA 2", "CTA 3"],
  "prompt_visual": "Descrição em inglês para geração de imagem com IA: estilo, composição, iluminação, cores, mood. NÃO inclua copy/texto na imagem.",
  "observacoes": "Observação estratégica curta"
}`;
      const msg = `MARCA: ${brand.name}\nDESCRIÇÃO: ${brand.description}\nPOSICIONAMENTO: ${brand.promise}\nTOM: ${(brand.voiceTags||[]).join(", ")}\nCORES: ${brand.colors.join(", ")}\nFONTES: ${brand.fonts.join(", ")}\nBRANDING: ${brand.instructions}\nLOGO CARREGADA: ${brand.logoBase64?"Sim":"Não"}\nMANUAL CARREGADO: ${brand.pdfBase64?"Sim":"Não"}\n\nPRODUTO: ${briefing.product}\nOBJETIVO: ${briefing.objective}\nPÚBLICO: ${briefing.audience}\nGANCHO: ${briefing.hook}\nCOPY: ${briefing.copy}\nTOM: ${briefing.tone}\nCONTEXTO: ${briefing.context}`;
      const raw = await callClaude(sys, [{ role: "user", content: msg }]);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setEnriched(parsed);
      setBriefing(b => ({ ...b, _prompt_visual: parsed.prompt_visual, _enriched: parsed }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const valid = briefing.product && briefing.objective;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Section title="O que vamos anunciar">
        <Input label="Produto / Serviço" value={briefing.product} onChange={v => setBriefing(b=>({...b,product:v}))} placeholder="Ex: Sofá modular em veludo antracite" />
        <Input label="Objetivo do criativo" value={briefing.objective} onChange={v => setBriefing(b=>({...b,objective:v}))} placeholder="Ex: Gerar leads qualificados para o showroom" />
        <Input label="Público-alvo" value={briefing.audience} onChange={v => setBriefing(b=>({...b,audience:v}))} placeholder="Ex: Mulheres 28-45 anos, SP, renda A/B, interesse em decoração" />
        <Input label="Oferta / Gancho principal" value={briefing.hook} onChange={v => setBriefing(b=>({...b,hook:v}))} placeholder="Ex: Frete grátis + montagem inclusa em abril" />
        <Input label="Copy base" value={briefing.copy} onChange={v => setBriefing(b=>({...b,copy:v}))} placeholder="Textos aprovados: headlines, taglines, CTAs..." multiline />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "#666", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tom do criativo</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TONES.map(t => <button key={t} onClick={() => setBriefing(b=>({...b,tone:t}))} style={{ padding: "7px 16px", borderRadius: 4, border: `1px solid ${briefing.tone===t?"#F97316":"#2a2a2a"}`, background: briefing.tone===t?"#F9731620":"transparent", color: briefing.tone===t?"#F97316":"#555", fontFamily: "monospace", fontSize: 12, cursor: "pointer" }}>{t}</button>)}
          </div>
        </div>
        <Input label="Contexto adicional (opcional)" value={briefing.context} onChange={v => setBriefing(b=>({...b,context:v}))} placeholder="Sazonalidade, concorrência, restrições..." multiline />
      </Section>

      {!enriched ? (
        <div style={{ border: "1px solid #1a1a1a", borderRadius: 8, padding: 20, background: "#0A0A0A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#E5E5E5", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>Analisar briefing com IA</div>
            <div style={{ color: "#444", fontFamily: "monospace", fontSize: 12, marginTop: 4 }}>Claude gera ângulos criativos, headlines e prompt visual</div>
          </div>
          <Btn onClick={analyze} disabled={!valid || loading}>{loading ? "Analisando..." : "🧠 Analisar"}</Btn>
        </div>
      ) : (
        <div style={{ border: "1px solid #F9731633", borderRadius: 8, padding: 24, background: "#F9731608", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#F97316", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>✓ ANÁLISE ESTRATÉGICA CONCLUÍDA</span>
            <button onClick={() => { setEnriched(null); setBriefing(b=>({...b,_prompt_visual:"",_enriched:null})); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>refazer</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ color: "#666", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Ângulos criativos</div>
              {enriched.angulos?.map((a,i) => <div key={i} style={{ color: "#ccc", fontFamily: "monospace", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}><span style={{ color: "#F97316", marginRight: 8 }}>{i+1}.</span>{a}</div>)}
            </div>
            <div>
              <div style={{ color: "#666", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Headlines sugeridas</div>
              {enriched.headlines?.map((h,i) => <div key={i} style={{ color: "#ccc", fontFamily: "monospace", fontSize: 12, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}><span style={{ color: "#F97316", marginRight: 6 }}>"</span>{h}</div>)}
            </div>
          </div>
          <div>
            <div style={{ color: "#666", fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Prompt visual gerado</div>
            <div style={{ background: "#0A0A0A", border: "1px solid #2a2a2a", borderRadius: 6, padding: 14, color: "#888", fontFamily: "monospace", fontSize: 12, lineHeight: 1.7 }}>{enriched.prompt_visual}</div>
          </div>
          {enriched.observacoes && <div style={{ background: "#111", borderLeft: "3px solid #F97316", padding: "12px 16px", color: "#aaa", fontFamily: "monospace", fontSize: 12, borderRadius: "0 6px 6px 0" }}>💡 {enriched.observacoes}</div>}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn onClick={onBack} variant="ghost">← Voltar</Btn>
        <Btn onClick={onNext} disabled={!valid}>Próximo → Gerar Criativos</Btn>
      </div>
    </div>
  );
}

// ─── STEP 3: Generate ─────────────────────────────────────────────────────────

function GenerateStep({ brand, briefing, onGenerate, generating, onBack }) {
  const [config, setConfig] = useState({ formats: ["feed"], variations: 4, referenceStyle: "strong" });
  const toggle = id => setConfig(c => ({ ...c, formats: c.formats.includes(id) ? c.formats.filter(f=>f!==id) : [...c.formats,id] }));
  const total = config.formats.length * config.variations;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Section title="API fal.ai">
        <div style={{ background: "#0A0A0A", border: "1px solid #1a1a1a", borderRadius: 8, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ color: "#555", fontFamily: "monospace", fontSize: 11, lineHeight: 1.7 }}>
            Chave em → <span style={{ color: "#F97316" }}>fal.ai/dashboard/keys</span>
            &nbsp;&nbsp;·&nbsp;&nbsp;Modelo: <span style={{ color: "#aaa" }}>fal-ai/flux/dev</span>
            &nbsp;&nbsp;·&nbsp;&nbsp;Custo estimado: <span style={{ color: "#aaa" }}>≈ R$ {(total*0.15).toFixed(2)}</span>
          </div>
          {brand.logoBase64 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid #1a1a1a" }}>
              <img src={brand.logoUrl} alt="logo" style={{ height: 32, objectFit: "contain" }} />
              <span style={{ color: "#86efac", fontFamily: "monospace", fontSize: 12 }}>Logo carregada — será usada como referência visual no Flux ✓</span>
            </div>
          )}
          {brand.pdfBase64 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: brand.logoBase64 ? 0 : 10, borderTop: brand.logoBase64 ? "none" : "1px solid #1a1a1a" }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <span style={{ color: "#86efac", fontFamily: "monospace", fontSize: 12 }}>Manual de marca integrado ao prompt visual ✓</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Formatos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => toggle(f.id)} style={{ padding: 16, borderRadius: 8, border: `1px solid ${config.formats.includes(f.id)?"#F97316":"#2a2a2a"}`, background: config.formats.includes(f.id)?"#F9731610":"#0A0A0A", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{f.icon}</span>
              <div>
                <div style={{ color: config.formats.includes(f.id)?"#F97316":"#aaa", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{f.label}</div>
                <div style={{ color: "#444", fontFamily: "monospace", fontSize: 11 }}>{f.w} × {f.h}px</div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Variações por formato">
        <div style={{ display: "flex", gap: 10 }}>
          {[2,4,6,10].map(n => <button key={n} onClick={() => setConfig(c=>({...c,variations:n}))} style={{ padding: "10px 22px", borderRadius: 6, border: `1px solid ${config.variations===n?"#F97316":"#2a2a2a"}`, background: config.variations===n?"#F9731620":"transparent", color: config.variations===n?"#F97316":"#555", fontFamily: "monospace", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{n}</button>)}
        </div>
        <div style={{ color: "#333", fontFamily: "monospace", fontSize: 12 }}>Total: <span style={{ color: "#aaa" }}>{total} criativos</span> ({config.formats.length} formato{config.formats.length!==1?"s":""} × {config.variations} variações)</div>
      </Section>

      <Section title="Fidelidade ao branding">
        <div style={{ display: "flex", gap: 10 }}>
          {[{id:"strong",label:"Alta fidelidade",desc:"Segue o manual à risca"},{id:"medium",label:"Equilibrada",desc:"Mantém essência, com criatividade"},{id:"free",label:"Livre",desc:"IA decide a composição"}].map(o => (
            <button key={o.id} onClick={() => setConfig(c=>({...c,referenceStyle:o.id}))} style={{ flex: 1, padding: "14px 12px", borderRadius: 8, border: `1px solid ${config.referenceStyle===o.id?"#F97316":"#2a2a2a"}`, background: config.referenceStyle===o.id?"#F9731610":"#0A0A0A", cursor: "pointer", textAlign: "left" }}>
              <div style={{ color: config.referenceStyle===o.id?"#F97316":"#aaa", fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{o.label}</div>
              <div style={{ color: "#333", fontFamily: "monospace", fontSize: 11, marginTop: 4 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Btn onClick={onBack} variant="ghost">← Voltar</Btn>
        <Btn onClick={() => onGenerate(config)} disabled={generating || config.formats.length===0} style={{ padding: "14px 40px", fontSize: 14 }}>
          {generating ? "⏳ Gerando..." : `🚀 Gerar ${total} Criativos`}
        </Btn>
      </div>
    </div>
  );
}

// ─── STEP 4: Gallery ──────────────────────────────────────────────────────────

function GalleryStep({ results, brand, onRestart }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const formats = [...new Set(results.map(r => r.format))];
  const filtered = filter === "all" ? results : results.filter(r => r.format === filter);
  const toggleSel = id => setSelected(s => s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const done = results.filter(r => r.status==="done").length;

  const download = async () => {
    const items = selected.length>0 ? results.filter(r=>selected.includes(r.id)&&r.url) : results.filter(r=>r.url);
    for (const item of items) { const a=document.createElement("a"); a.href=item.url; a.download=`${brand.name}_${item.format}_v${item.variation}.jpg`; a.target="_blank"; a.click(); await new Promise(r=>setTimeout(r,350)); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {done < results.length && (
        <div style={{ background: "#0A0A0A", border: "1px solid #1a1a1a", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#aaa", fontFamily: "monospace", fontSize: 12 }}>Gerando criativos...</span>
            <span style={{ color: "#F97316", fontFamily: "monospace", fontSize: 12 }}>{done}/{results.length}</span>
          </div>
          <div style={{ background: "#1a1a1a", borderRadius: 4, height: 4 }}>
            <div style={{ background: "#F97316", borderRadius: 4, height: 4, width: `${(done/results.length)*100}%`, transition: "width 0.4s" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all",...formats].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", border: `1px solid ${filter===f?"#F97316":"#2a2a2a"}`, background: filter===f?"#F9731620":"transparent", color: filter===f?"#F97316":"#444", borderRadius: 4, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>
              {f==="all"?`Todos (${results.length})`:f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected.length>0 && <span style={{ color: "#F97316", fontFamily: "monospace", fontSize: 12 }}>{selected.length} selecionados</span>}
          <Btn onClick={download} variant="ghost" style={{ fontSize: 12 }}>↓ {selected.length>0?`Download (${selected.length})`:"Download Todos"}</Btn>
          <Btn onClick={onRestart} style={{ fontSize: 12 }}>+ Novo Lote</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
        {filtered.map(item => (
          <div key={item.id} onClick={() => item.status==="done" && toggleSel(item.id)}
            style={{ borderRadius: 8, overflow: "hidden", border: `2px solid ${selected.includes(item.id)?"#F97316":"#1a1a1a"}`, cursor: item.status==="done"?"pointer":"default", position: "relative", background: "#0A0A0A", transition: "border-color 0.15s" }}>
            {item.status==="loading" ? (
              <div style={{ height: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 24, height: 24, border: "3px solid #1a1a1a", borderTopColor: "#F97316", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: "#2a2a2a", fontFamily: "monospace", fontSize: 10 }}>gerando...</span>
              </div>
            ) : item.status==="error" ? (
              <div style={{ height: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <span style={{ color: "#7F1D1D", fontFamily: "monospace", fontSize: 10 }}>erro na geração</span>
              </div>
            ) : (
              <img src={item.url} alt={item.format} style={{ width: "100%", display: "block", aspectRatio: item.ratio, objectFit: "cover" }} />
            )}
            {selected.includes(item.id) && <div style={{ position: "absolute", top: 7, right: 7, width: 20, height: 20, background: "#F97316", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0A0A", fontSize: 12, fontWeight: 700 }}>✓</div>}
            <div style={{ padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#333", fontFamily: "monospace", fontSize: 10 }}>{item.format} · v{item.variation}</span>
              {item.url && <a href={item.url} download target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color: "#F97316", fontSize: 14, textDecoration: "none" }}>↓</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAL.AI ───────────────────────────────────────────────────────────────────

async function generateWithFal(prompt, apiKey, formatId, logoBase64, logoMime, style) {
  const dims = { feed:{w:1080,h:1080}, stories:{w:1080,h:1920}, landscape:{w:1080,h:1350}, banner:{w:1920,h:1080} };
  const d = dims[formatId] || dims.feed;
  const body = { prompt, image_size:{width:d.w,height:d.h}, num_inference_steps:28, seed:Math.floor(Math.random()*999999), enable_safety_checker:false };
  if (logoBase64 && style !== "free") {
    body.image_url = `data:${logoMime};base64,${logoBase64}`;
    body.image_prompt_strength = style==="strong" ? 0.35 : 0.2;
  }
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).images?.[0]?.url;
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const emptyBrand   = { name:"", description:"", promise:"", colors:[], fonts:[], voiceTags:[], instructions:"", logoBase64:null, logoUrl:null, logoMime:null, pdfBase64:null, pdfName:null, pdfPages:null };
const emptyBriefing = { product:"", objective:"", audience:"", hook:"", copy:"", tone:"", context:"", _prompt_visual:"", _enriched:null };

export default function App() {
  const [step, setStep]       = useState(0);
  const [brand, setBrand]     = useState(emptyBrand);
  const [briefing, setBriefing] = useState(emptyBriefing);
  const [results, setResults] = useState([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (config) => {
    setGenerating(true);
    const basePrompt = briefing._prompt_visual || `Professional marketing creative for ${brand.name}. ${briefing.product}. Audience: ${briefing.audience}. Style: ${(brand.voiceTags||[]).join(", ")}. Color palette: ${brand.colors.join(", ")}. High quality commercial photography.`;
    const items = [];
    for (const fid of config.formats) {
      const fmt = FORMATS.find(f=>f.id===fid);
      for (let v=1;v<=config.variations;v++) items.push({ id:`${fid}-${v}`, format:fmt?.label||fid, variation:v, status:"loading", url:null, ratio:`${fmt?.w||1} / ${fmt?.h||1}` });
    }
    setResults(items);
    setStep(3);
    const BATCH = 3;
    for (let i=0;i<items.length;i+=BATCH) {
      await Promise.all(items.slice(i,i+BATCH).map(async item => {
        const fid = item.id.split("-")[0];
        try {
          const url = await generateWithFal(`${basePrompt}. Variation ${item.variation}.`, null, fid, brand.logoBase64, brand.logoMime, config.referenceStyle);
          setResults(prev=>prev.map(r=>r.id===item.id?{...r,status:"done",url}:r));
        } catch(e) { console.error(e); setResults(prev=>prev.map(r=>r.id===item.id?{...r,status:"error"}:r)); }
      }));
    }
    setGenerating(false);
  };

  const reset = () => { setBrand(emptyBrand); setBriefing(emptyBriefing); setResults([]); setStep(0); };
  const cur = STEPS[step];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #080808; }
        input, textarea { color-scheme: dark; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>
      <div style={{ minHeight:"100vh", background:"#080808" }}>
        {/* Header */}
        <div style={{ borderBottom:"1px solid #111", padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#060606" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:7, height:7, background:"#F97316", borderRadius:"50%" }} />
            <span style={{ fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:16, color:"#E5E5E5", letterSpacing:"-0.02em" }}>
              D.UM <span style={{ color:"#F97316" }}>CRIATIVO</span>
            </span>
            {brand.name && <Tag>{brand.name}</Tag>}
            {brand.logoUrl && <img src={brand.logoUrl} alt="logo" style={{ height:22, objectFit:"contain", opacity:0.7, maxWidth:80 }} />}
          </div>
          <div style={{ display:"flex", alignItems:"center" }}>
            {STEPS.map((s,i) => (
              <div key={s} style={{ display:"flex", alignItems:"center" }}>
                <button onClick={() => i<=step && setStep(i)} disabled={i>step}
                  style={{ background:"none", border:"none", color:i===step?"#F97316":i<step?"#666":"#2a2a2a", fontFamily:"monospace", fontSize:11, letterSpacing:"0.06em", textTransform:"uppercase", cursor:i<=step?"pointer":"default", padding:"4px 12px" }}>
                  {i+1}. {STEP_LABELS[s]}
                </button>
                {i<STEPS.length-1 && <span style={{ color:"#1a1a1a", fontSize:10 }}>›</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:840, margin:"0 auto", padding:"40px 32px" }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ color:"#222", fontFamily:"monospace", fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:8 }}>Etapa {step+1} de {STEPS.length}</div>
            <h1 style={{ margin:0, fontFamily:"'Syne', sans-serif", fontWeight:800, fontSize:26, color:"#E5E5E5", letterSpacing:"-0.03em" }}>
              {cur==="brand"    && "Perfil da Marca"}
              {cur==="briefing" && "Briefing Criativo"}
              {cur==="generate" && "Configurar Geração"}
              {cur==="gallery"  && `Criativos — ${brand.name}`}
            </h1>
          </div>
          {cur==="brand"    && <BrandStep    brand={brand} setBrand={setBrand} onNext={()=>setStep(1)} />}
          {cur==="briefing" && <BriefingStep brand={brand} briefing={briefing} setBriefing={setBriefing} onNext={()=>setStep(2)} onBack={()=>setStep(0)} />}
          {cur==="generate" && <GenerateStep brand={brand} briefing={briefing} onGenerate={handleGenerate} generating={generating} onBack={()=>setStep(1)} />}
          {cur==="gallery"  && <GalleryStep  results={results} brand={brand} onRestart={reset} />}
        </div>
      </div>
    </>
  );
}
