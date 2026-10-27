import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "../../lib/api";
import "./brand-studio.css";

type Section = "overview" | "identity" | "visual" | "assets" | "boards" | "themes";
type Profile = Record<string, string>;
type BrandCompany = {
  name: string; tagline?: string | null; websiteUrl?: string | null;
  supportEmail?: string | null; primaryColor?: string | null; authBgColor?: string | null;
};
type BrandRole = { role: string; label: string; url?: string | null; media_asset_id?: number | null };
type BrandResponse = { ok: boolean; company: BrandCompany; profile: Profile; roles: BrandRole[] };
type MediaAsset = { id: number; filename: string; url?: string | null; content_type?: string; r2_key?: string };
type MediaResponse = { ok: boolean; assets: MediaAsset[]; pagination?: { has_next?: boolean; page?: number; total?: number }; has_more?: boolean };
type Album = { id: number; name: string; description?: string; asset_count: number; cover_url?: string | null; meta?: { kind?: string; status?: string; presentation?: { layout?: string } } };
type AlbumsResponse = { ok: boolean; albums: Album[] };
type EditorField = { key: string; label: string; hint: string; rows?: number; limit: number };
const TABS: { id: Section; label: string; subtitle: string }[] = [
  { id: "overview", label: "Overview", subtitle: "At a glance" },
  { id: "identity", label: "Identity & Story", subtitle: "Purpose, voice, audience" },
  { id: "visual", label: "Visual System", subtitle: "Colors, type, direction" },
  { id: "assets", label: "Asset Library", subtitle: "Real media and roles" },
  { id: "boards", label: "Brand Boards", subtitle: "Curate references" },
  { id: "themes", label: "Theme Studio", subtitle: "Real CMS editor" },
];
const IDENTITY_GROUPS: { title: string; description: string; fields: EditorField[] }[] = [
  { title: "Foundation", description: "What makes this business worth building?", fields: [
    { key: "purpose", label: "Purpose", hint: "Why the business exists", rows: 3, limit: 1200 },
    { key: "mission", label: "Mission", hint: "What you do, and for whom", rows: 3, limit: 1200 },
    { key: "vision", label: "Vision", hint: "Where you're going", rows: 3, limit: 1200 },
    { key: "originStory", label: "Origin story", hint: "How it began and what matters", rows: 4, limit: 3000 },
  ] },
  { title: "Audience & Positioning", description: "Make real decisions about who the brand serves.", fields: [
    { key: "audience", label: "Primary audience", hint: "People and needs", rows: 3, limit: 1200 },
    { key: "positioning", label: "Positioning", hint: "Your place in the market", rows: 3, limit: 1200 },
    { key: "promise", label: "Brand promise", hint: "What customers can count on", rows: 2, limit: 1000 },
    { key: "values", label: "Values", hint: "The principles behind decisions", rows: 2, limit: 1000 },
  ] },
  { title: "Voice & Messaging", description: "Writing guidance the team can actually apply.", fields: [
    { key: "personality", label: "Personality", hint: "How the brand feels", rows: 2, limit: 600 },
    { key: "voice", label: "Voice & tone", hint: "How the brand speaks", rows: 3, limit: 1000 },
    { key: "voiceDo", label: "Do", hint: "Words and approaches to use", rows: 2, limit: 1200 },
    { key: "voiceDont", label: "Don't", hint: "Words and approaches to avoid", rows: 2, limit: 1200 },
    { key: "keyMessage", label: "Key message", hint: "What should people remember?", rows: 2, limit: 1000 },
    { key: "shortDescription", label: "Short description", hint: "An introduction for partners", rows: 2, limit: 400 },
  ] },
];
const KNOWN_HEX = /^#[0-9a-fA-F]{6}$/;
function imageUrl(url?: string | null) {
  const value = String(url || "");
  return value.startsWith("/") && !value.startsWith("//") || /^https?:\/\//i.test(value) ? value : "";
}
function Field({ field, value, onChange }: { field: EditorField; value: string; onChange: (value: string) => void }) {
  return <label className="bs-field">
    <span>{field.label}</span>
    <small>{field.hint}</small>
    <textarea rows={field.rows || 2} value={value} onChange={e => onChange(e.target.value)} maxLength={field.limit} />
  </label>;
}
function MediaThumb({ asset, alt = "" }: { asset: { url?: string | null; filename?: string }; alt?: string }) {
  const src = imageUrl(asset.url);
  return src ? <img src={src} alt={alt} loading="lazy" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="bs-no-image">No preview</span>;
}
export default function BrandStudioPage() {
  const [tab, setTab] = useState<Section>("overview");
  const [brand, setBrand] = useState<BrandResponse | null>(null);
  const [company, setCompany] = useState<BrandCompany>({ name: "" });
  const [profile, setProfile] = useState<Profile>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);
  const [boardAssets, setBoardAssets] = useState<MediaAsset[]>([]);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [picker, setPicker] = useState<{ role?: string; boardId?: number } | null>(null);
  const [candidates, setCandidates] = useState<MediaAsset[]>([]);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateMore, setCandidateMore] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [pickerBusy, setPickerBusy] = useState<number | null>(null);
  const [boardBusy, setBoardBusy] = useState(false);
  const [newBoard, setNewBoard] = useState(false);
  const [boardNameInput, setBoardNameInput] = useState("");
  const [boardPurposeInput, setBoardPurposeInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"grid" | "storyboard" | "lookbook">("grid");

  const reloadBrand = useCallback(async () => {
    const next = await adminFetch<BrandResponse>("/api/admin/brand?include_assets=0");
    setBrand(next); setCompany(next.company); setProfile(next.profile || {}); setDirty(false);
  }, []);
  const reloadAlbums = useCallback(async () => {
    const next = await adminFetch<AlbumsResponse>("/api/admin/media/albums");
    setAlbums(next.albums || []);
  }, []);
  useEffect(() => {
    let active = true; document.title = "Brand Studio — Commerce Admin";
    Promise.all([reloadBrand(), reloadAlbums()]).catch(e => {
      if (active) setError(e instanceof Error ? e.message : "Studio data unavailable");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadBrand, reloadAlbums]);
  useEffect(() => {
    if (!selectedBoard) { setBoardAssets([]); return; }
    const chosen = albums.find(a => a.id === selectedBoard);
    if (chosen) { setBoardTitle(chosen.name); setBoardDescription(chosen.description || ""); }
    let active = true;
    adminFetch<MediaResponse>("/api/admin/media?view=all&album_id=" + selectedBoard + "&page_size=100&sort=manual")
      .then(d => { if (active) setBoardAssets(d.assets || []); })
      .catch(e => { if (active) setError(e.message || "Unable to load board assets"); });
    return () => { active = false; };
  }, [selectedBoard, albums]);
  useEffect(() => {
    if (!picker) return;
    let active = true;
    setCandidateLoading(true);
    adminFetch<MediaResponse>("/api/admin/brand/assets?page=1&q=" + encodeURIComponent(candidateQuery))
      .then(d => { if (active) { setCandidates(d.assets || []); setCandidatePage(1); setCandidateMore(Boolean(d.has_more)); } })
      .catch(e => { if (active) setError(e.message || "Unable to load assets"); })
      .finally(() => { if (active) setCandidateLoading(false); });
    return () => { active = false; };
  }, [picker?.role, picker?.boardId, candidateQuery]);

  const roleAssignments = useMemo(() => brand?.roles.filter(r => r.url).length || 0, [brand]);
  const board = albums.find(a => a.id === selectedBoard);
  const accent = KNOWN_HEX.test(company.primaryColor || "") ? company.primaryColor! : "#2950a4";
  const secondary = KNOWN_HEX.test(profile.secondaryColor || "") ? profile.secondaryColor : "#d4a45d";
  const bodyInk = KNOWN_HEX.test(profile.textColor || "") ? profile.textColor : "#202836";
  const setCompanyValue = (key: keyof BrandCompany, value: string) => {
    setCompany(prev => ({ ...prev, [key]: value })); setDirty(true);
  };
  const setProfileValue = (key: string, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value })); setDirty(true);
  };
  async function saveBrand() {
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await adminFetch<BrandResponse>("/api/admin/brand", {
        method: "PATCH",
        body: JSON.stringify({ company: {
          name: company.name.trim(), tagline: company.tagline || null,
          websiteUrl: company.websiteUrl || null, supportEmail: company.supportEmail || null,
          primaryColor: company.primaryColor || null, authBgColor: company.authBgColor || null,
        }, profile }),
      });
      setBrand(next); setCompany(next.company); setProfile(next.profile || {}); setDirty(false);
      setNotice("Brand saved to the existing company record.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save brand"); }
    finally { setBusy(false); }
  }
  async function assignRole(role: string, id: number) {
    setPickerBusy(id); setError("");
    try {
      await adminFetch("/api/admin/brand", { method: "PATCH", body: JSON.stringify({ assign: { role, media_asset_id: id } }) });
      await reloadBrand(); setPicker(null); setNotice("Asset role updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't assign asset"); }
    finally { setPickerBusy(null); }
  }
  async function clearRole(role: string) {
    if (!window.confirm("Remove this role assignment? The source media remains in your library.")) return;
    setBusy(true); setError("");
    try {
      await adminFetch("/api/admin/brand", { method: "PATCH", body: JSON.stringify({ clear_role: role }) });
      await reloadBrand(); setNotice("Assignment removed; original asset preserved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't clear role"); }
    finally { setBusy(false); }
  }
  async function createBoard() {
    if (!boardNameInput.trim()) { setError("Give your board a name."); return; }
    setBoardBusy(true); setError("");
    try {
      const data = await adminFetch<{ album: Album }>("/api/admin/media/albums", {
        method: "POST", body: JSON.stringify({ name: boardNameInput.trim(), description: boardPurposeInput.trim(),
          kind: "album", status: "draft", presentation: { layout: selectedTemplate, fit: "cover" } }),
      });
      await reloadAlbums(); setSelectedBoard(data.album.id); setNewBoard(false);
      setBoardNameInput(""); setBoardPurposeInput(""); setNotice("Brand board created.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't create board"); }
    finally { setBoardBusy(false); }
  }
  async function saveBoardDetails() {
    if (!board || !boardTitle.trim()) return;
    setBoardBusy(true); setError("");
    try {
      await adminFetch("/api/admin/media/albums/" + board.id, {
        method: "PATCH", body: JSON.stringify({ name: boardTitle.trim(), description: boardDescription.trim() }),
      });
      await reloadAlbums(); setNotice("Board details saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save board"); }
    finally { setBoardBusy(false); }
  }
  async function changeBoardAsset(id: number, action: "album_add" | "album_remove") {
    if (!board) return;
    setPickerBusy(id); setError("");
    try {
      await adminFetch("/api/admin/media/batch", {
        method: "POST", body: JSON.stringify({ ids: [id], album_id: board.id, action }),
      });
      const next = await adminFetch<MediaResponse>("/api/admin/media?view=all&album_id=" + board.id + "&page_size=100&sort=manual");
      setBoardAssets(next.assets || []); await reloadAlbums();
      if (action === "album_add") setPicker(null);
      setNotice(action === "album_add" ? "Reference added to board." : "Reference removed from board.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't update board"); }
    finally { setPickerBusy(null); }
  }
  async function moreCandidates() {
    if (candidateLoading || !candidateMore) return;
    setCandidateLoading(true);
    try {
      const nextPage = candidatePage + 1;
      const d = await adminFetch<MediaResponse>("/api/admin/brand/assets?page=" + nextPage + "&q=" + encodeURIComponent(candidateQuery));
      setCandidates(prev => [...prev, ...(d.assets || [])]); setCandidatePage(nextPage); setCandidateMore(Boolean(d.has_more));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load more media"); }
    finally { setCandidateLoading(false); }
  }
  function openPicker(target: { role?: string; boardId?: number }) {
    if (dirty && !window.confirm("You have unsaved brand changes. Save them before assigning assets?")) return;
    if (dirty) { setNotice("Save the brand before assigning assets."); return; }
    setCandidateQuery(""); setCandidates([]); setPicker(target);
  }
  const controlsDisabled = busy || loading;
  return <main className="bs-app">
    <div className="bs-layout">
      <aside className="bs-rail" aria-label="Brand Studio navigation">
        <div className="bs-rail-overline">WORKSPACE / BRAND STUDIO</div>
        <div className="bs-rail-identity">
          <span className="bs-brand-avatar" style={{ background: accent }}>{company.name.slice(0, 1).toUpperCase() || "B"}</span>
          <div><strong>{company.name || "Your brand"}</strong><small>Merchant workspace</small></div>
        </div>
        <nav className="bs-rail-tabs">
          {TABS.map(({ id, label, subtitle }, index) => <button key={id} type="button" className={tab === id ? "active" : ""}
            onClick={() => { setTab(id); setError(""); }} aria-current={tab === id ? "page" : undefined}>
            <span className="bs-tab-index">{String(index + 1).padStart(2, "0")}</span>
            <span><strong>{label}</strong><small>{subtitle}</small></span>
            <span aria-hidden="true">›</span>
          </button>)}
        </nav>
        <div className="bs-rail-footer"><strong>Same content, one authority</strong><p>Brand values come from the company record. Media comes from your asset library. Theme edits use the live CMS Studio.</p></div>
      </aside>

      <div className="bs-content">
        <header className="bs-head">
          <div className="bs-path"><Link to="/products">Commerce</Link><span>/</span><a href="/admin/content">Content library</a><span>/</span><strong>Brand Studio</strong></div>
          <div className="bs-head-actions">
            <span className={dirty ? "bs-dirty" : "bs-saved"} role="status">{dirty ? "Unsaved changes" : "Brand up to date"}</span>
            <button type="button" className="bs-btn bs-btn-primary" disabled={!dirty || controlsDisabled || !company.name.trim()} onClick={() => void saveBrand()}>{busy ? "Saving…" : "Save brand"}</button>
          </div>
        </header>
        <div className="bs-mobile-tabs" aria-label="Brand Studio views">
          <label>Studio view <select value={tab} onChange={e => setTab(e.target.value as Section)}>{TABS.map(t => <option value={t.id} key={t.id}>{t.label}</option>)}</select></label>
        </div>
        {error && <div className="bs-alert bs-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
        {notice && <div className="bs-alert bs-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
        {loading ? <div className="bs-loading" role="status">Loading your existing brand and media workspace…</div> : <>
          {tab === "overview" && <div className="bs-page">
            <div className="bs-page-title"><span className="bs-kicker">BRAND OVERVIEW / {company.name || "Your brand"}</span><h1>Your brand. One organized space.</h1><p>Build identity, collect references, approve creative direction and move into real website or product editing.</p></div>
            <section className="bs-overview-hero">
              <div className="bs-hero-copy">
                <span>BRAND IDENTITY</span><h2>{company.tagline || company.name || "Give your brand a clear direction."}</h2>
                <p>{profile.shortDescription || profile.purpose || "Add a short description and purpose in Identity & Story to start shaping your brand."}</p>
                <button type="button" className="bs-btn bs-btn-light" onClick={() => setTab("identity")}>Refine identity ↗</button>
              </div>
              <div className="bs-hero-visual" style={{ background: accent }}>
                {brand?.roles.find(r => r.role === "brand_hero")?.url ? <MediaThumb asset={{ url: brand.roles.find(r => r.role === "brand_hero")?.url }} /> : <div className="bs-preview-lockup"><small>BRAND PREVIEW</small><strong>{company.name || "Your brand"}</strong><span>{company.tagline || "Your story starts here"}</span></div>}
              </div>
            </section>
            <div className="bs-metrics">
              <div><strong>{roleAssignments}<span> / {brand?.roles.length || 0}</span></strong><small>Asset roles assigned</small></div>
              <div><strong>{albums.length}</strong><small>Existing media albums</small></div>
              <div><strong>{IDENTITY_GROUPS.flatMap(g => g.fields).filter(f => (profile[f.key] || "").trim()).length}<span> / 14</span></strong><small>Identity fields completed</small></div>
            </div>
            <div className="bs-panel"><div className="bs-panel-heading"><div><h2>Continue creating</h2><p>Everything below opens a real workspace.</p></div></div>
              <div className="bs-actions-grid">
                {[{ label: "Shape the story", desc: "Edit purpose, audience and messaging", dest: "identity" },
                  { label: "Define visual direction", desc: "Build a usable color and typography system", dest: "visual" },
                  { label: "Assign brand assets", desc: "Choose real logos and key imagery", dest: "assets" },
                  { label: "Curate a board", desc: "Arrange saved media references", dest: "boards" }].map(c =>
                  <button key={c.dest} type="button" onClick={() => setTab(c.dest as Section)}><span className="bs-action-glyph">✦</span><strong>{c.label}</strong><small>{c.desc}</small><span className="bs-action-arrow">↗</span></button>)}
              </div>
            </div>
            <section className="bs-panel"><div className="bs-panel-heading"><div><h2>Brand readiness</h2><p>Live information from the current company and asset assignments.</p></div></div>
              <div className="bs-readiness">
                {["Purpose", "Audience", "Positioning", "Voice"].map(key => {
                  const field = key.toLowerCase(); const ready = Boolean((profile[field] || "").trim());
                  return <div key={key}><span className={ready ? "ready" : ""}>{ready ? "✓" : "·"}</span><strong>{key}</strong><small>{ready ? "Defined" : "Needs direction"}</small></div>;
                })}
              </div>
            </section>
          </div>}

          {tab === "identity" && <div className="bs-page">
            <div className="bs-page-title"><span className="bs-kicker">BRAND INTELLIGENCE / IDENTITY & STORY</span><h1>Tell the story. Shape the voice.</h1><p>These fields update the current brand profile used across your merchant experience—not a separate draft database.</p></div>
            <section className="bs-panel bs-main-fields"><div className="bs-panel-heading"><div><h2>Primary identity</h2><p>The public name and core brand metadata.</p></div></div>
              <div className="bs-field-columns">{([
                ["name", "Brand name", "The primary identity"],
                ["tagline", "Tagline", "One memorable line"],
                ["websiteUrl", "Website", "Public website URL"],
                ["supportEmail", "Contact email", "Support or contact address"],
              ] as const).map(([key,label,hint]) => <label key={key} className="bs-field"><span>{label}</span><small>{hint}</small><input value={String(company[key] || "")} onChange={e => setCompanyValue(key,e.target.value)} maxLength={key==="tagline"?240:140} /></label>)}</div>
            </section>
            {IDENTITY_GROUPS.map(group => <section className="bs-panel bs-main-fields" key={group.title}><div className="bs-panel-heading"><div><h2>{group.title}</h2><p>{group.description}</p></div></div>
              <div className="bs-field-columns">{group.fields.map(f => <Field key={f.key} field={f} value={profile[f.key] || ""} onChange={v => setProfileValue(f.key,v)} />)}</div>
            </section>)}
          </div>}

          {tab === "visual" && <div className="bs-page">
            <div className="bs-page-title"><span className="bs-kicker">BRAND SYSTEM / VISUAL DIRECTION</span><h1>Make the identity feel consistent.</h1><p>Control saved brand colors, typography recommendations and visual direction. Storefront theme appearance is edited separately in Theme Studio.</p></div>
            <div className="bs-visual-columns">
              <section className="bs-panel bs-main-fields"><div className="bs-panel-heading"><div><h2>Color palette</h2><p>Saved identity colors—not an automatic storefront theme override.</p></div></div>
                {[{ label: "Primary", key: "primaryColor", value: company.primaryColor || "#2950a4", set: (v:string) => setCompanyValue("primaryColor",v) },
                  { label: "Secondary", key: "secondaryColor", value: secondary, set: (v:string) => setProfileValue("secondaryColor",v) },
                  { label: "Text", key: "textColor", value: bodyInk, set: (v:string) => setProfileValue("textColor",v) },
                  { label: "Auth background", key: "authBgColor", value: company.authBgColor || "#f4f4f2", set: (v:string) => setCompanyValue("authBgColor",v) }].map(c =>
                  <label className="bs-color-field" key={c.key}><span>{c.label}</span><input type="color" value={KNOWN_HEX.test(c.value)?c.value:"#000000"} onChange={e=>c.set(e.target.value)}/><input aria-label={c.label + " hex value"} value={c.value} maxLength={7} onChange={e=>c.set(e.target.value)}/></label>)}
                <div className="bs-swatch-strip">{[accent,secondary,bodyInk,company.authBgColor || "#f4f4f2"].map((color,i)=><div key={i} title={color} style={{background:color}}/>)}</div>
                <div className="bs-field-columns">{([{key:"headlineFont",label:"Headline font"},{key:"bodyFont",label:"Body font"}] as const).map(f =>
                  <label className="bs-field" key={f.key}><span>{f.label}</span><small>Record the font family name</small><input value={profile[f.key]||""} maxLength={160} onChange={e=>setProfileValue(f.key,e.target.value)}/></label>)}</div>
              </section>
              <section className="bs-panel bs-visual-preview">
                <div className="bs-panel-heading"><div><h2>Identity preview</h2><p>Live preview of the brand fields above.</p></div></div>
                <div className="bs-visual-sample" style={{ background: accent, color:"#fff" }}>
                  <small>THE VISUAL SYSTEM</small><strong>{company.name || "Your brand"}</strong><p>{company.tagline || "A brand statement belongs here."}</p>
                  <span style={{background:secondary}}>Explore the brand</span>
                </div>
                <div className="bs-sample-copy" style={{color:bodyInk}}>
                  <h3>{profile.keyMessage || "The details that make a brand recognizable."}</h3>
                  <p>{profile.shortDescription || profile.imageDirection || "Set your visual direction and key message to see how the identity reads."}</p>
                </div>
              </section>
            </div>
            <section className="bs-panel bs-main-fields"><div className="bs-panel-heading"><div><h2>Image and art direction</h2><p>Photographic style, composition, visual references and what to avoid.</p></div></div>
              <Field field={{key:"imageDirection", label:"Visual direction",hint:"Describe photography, illustration, lighting and composition",rows:4,limit:1000}} value={profile.imageDirection||""} onChange={v=>setProfileValue("imageDirection",v)}/>
              <div className="bs-inline-cta"><button type="button" className="bs-btn" onClick={()=>setTab("boards")}>Open visual boards ↗</button><button type="button" className="bs-btn" onClick={()=>setTab("assets")}>Review assigned assets ↗</button></div>
            </section>
          </div>}

          {tab === "assets" && <div className="bs-page">
            <div className="bs-page-title"><span className="bs-kicker">MEDIA / BRAND ROLES</span><h1>Every asset. One organized space.</h1><p>Select existing media from the real library. Role assignments reference originals instead of making copies.</p></div>
            <div className="bs-panel"><div className="bs-panel-heading"><div><h2>Brand assets</h2><p>{roleAssignments} of {brand?.roles.length || 0} roles have an assigned image.</p></div><a className="bs-btn" href="/admin/content">Open full media library ↗</a></div>
              <div className="bs-role-grid">{brand?.roles.map(role => <article key={role.role} className="bs-role-card">
                <div className="bs-role-image"><MediaThumb asset={{url:role.url,filename:role.label}} alt={role.label}/></div>
                <div className="bs-role-card-foot"><div><strong>{role.label}</strong><small>{role.url ? "Assigned" : "Needs asset"}</small></div><div><button type="button" className="bs-link" disabled={controlsDisabled} onClick={()=>openPicker({role:role.role})}>{role.url?"Replace":"Choose"}</button>{role.url&&<button type="button" className="bs-link muted" disabled={controlsDisabled} onClick={()=>void clearRole(role.role)}>Clear</button>}</div></div>
              </article>)}</div>
            </div>
          </div>}

          {tab === "boards" && <div className="bs-page">
            <div className="bs-page-title bs-title-row"><div><span className="bs-kicker">BRAND WORKSPACE / VISUAL BOARDS</span><h1>Create something worth sharing.</h1><p>Collect actual library images into editable boards. Media originals remain untouched.</p></div><button type="button" className="bs-btn bs-btn-primary" onClick={()=>setNewBoard(true)}>＋ New board</button></div>
            {newBoard&&<section className="bs-panel bs-new-board"><div className="bs-panel-heading"><div><h2>New board</h2><p>Choose a presentation starting point, then add real library assets.</p></div><button className="bs-link" onClick={()=>setNewBoard(false)}>Cancel</button></div>
              <div className="bs-board-templates">{([{id:"grid",label:"Reference grid",desc:"Collect visual examples"},{id:"storyboard",label:"Story sequence",desc:"Plan a visual narrative"},{id:"lookbook",label:"Product lookbook",desc:"Build a presentation direction"}] as const).map(t=><button type="button" className={selectedTemplate===t.id?"selected":""} key={t.id} onClick={()=>setSelectedTemplate(t.id)}><span className="bs-template-tiles"><i/><i/><i/><i/></span><strong>{t.label}</strong><small>{t.desc}</small></button>)}</div>
              <div className="bs-field-columns"><label className="bs-field"><span>Board name</span><input value={boardNameInput} maxLength={120} placeholder="Launch direction" onChange={e=>setBoardNameInput(e.target.value)}/></label><label className="bs-field"><span>What are you exploring?</span><input value={boardPurposeInput} maxLength={1000} placeholder="Aesthetic, audience, campaign or product story" onChange={e=>setBoardPurposeInput(e.target.value)}/></label></div>
              <button className="bs-btn bs-btn-primary" disabled={boardBusy||!boardNameInput.trim()} onClick={()=>void createBoard()}>Create editable board</button>
            </section>}
            <div className="bs-board-split">
              <section className="bs-panel bs-board-list"><div className="bs-panel-heading"><div><h2>Library boards</h2><p>Media albums are the source of truth.</p></div></div>
                {albums.filter(a=>a.meta?.kind==="album").length ? albums.filter(a=>a.meta?.kind==="album").map(a => <button key={a.id} type="button" className={"bs-board-row "+(selectedBoard===a.id?"active":"")} onClick={()=>setSelectedBoard(a.id)}>
                  <span className="bs-board-cover">{a.cover_url?<MediaThumb asset={{url:a.cover_url}}/>:"▦"}</span><span><strong>{a.name}</strong><small>{a.asset_count||0} assets · {a.meta?.presentation?.layout || "grid"}</small></span><span>›</span>
                </button>) : <div className="bs-empty-small">No boards yet. Start with a reference grid.</div>}
              </section>
              <section className="bs-panel bs-board-editor">
                {board?<><div className="bs-panel-heading"><div><h2>{board.name}</h2><p>Edit the name, curate assets, and review the layout.</p></div><button type="button" className="bs-btn" onClick={()=>openPicker({boardId:board.id})}>＋ Add images</button></div>
                  <div className="bs-field-columns"><label className="bs-field"><span>Board name</span><input value={boardTitle} maxLength={120} onChange={e=>setBoardTitle(e.target.value)}/></label><label className="bs-field"><span>Direction notes</span><textarea rows={2} value={boardDescription} maxLength={1000} onChange={e=>setBoardDescription(e.target.value)}/></label></div>
                  <button className="bs-btn" type="button" disabled={boardBusy || !boardTitle.trim()} onClick={()=>void saveBoardDetails()}>{boardBusy?"Saving…":"Save board details"}</button>
                  {boardAssets.length?<div className={"bs-board-canvas bs-board-" + (board.meta?.presentation?.layout || "grid")}>{boardAssets.map(a=><article key={a.id}><div className="bs-board-canvas-image"><MediaThumb asset={a} alt={a.filename}/></div><div><span title={a.filename}>{a.filename}</span><button type="button" disabled={pickerBusy!==null} onClick={()=>void changeBoardAsset(a.id,"album_remove")}>Remove</button></div></article>)}</div>:<div className="bs-empty-board"><strong>Start with a visual reference</strong><p>Choose existing imagery and bring this board to life.</p><button className="bs-btn bs-btn-primary" onClick={()=>openPicker({boardId:board.id})}>Select library images</button></div>}
                </>:<div className="bs-empty-board"><strong>Select a board to edit</strong><p>Use an existing album or create a new board. All changes use the existing media-album API.</p></div>}
              </section>
            </div>
          </div>}

          {tab === "themes" && <div className="bs-page">
            <div className="bs-page-title"><span className="bs-kicker">DESIGN TO PRODUCTION / THEME STUDIO</span><h1>Put the brand to work.</h1><p>Build real storefront pages using your existing CMS runtime, sections and installed themes—not screenshot-only demos.</p></div>
            <section className="bs-panel"><div className="bs-panel-heading"><div><h2>Live CMS editing tools</h2><p>These open the existing merchant-authorized editing routes. Publishing stays inside their review and permission controls.</p></div></div>
              <div className="bs-theme-actions"><a href="/admin/theme-editor"><strong>Open Theme Studio</strong><span>Live page canvas, section settings and real previews</span><b>↗</b></a>
              <a href="/admin/theme-workspace"><strong>Theme workspace</strong><span>Review and manage installed theme drafts</span><b>↗</b></a>
              <a href="/admin/pages"><strong>Page library</strong><span>Open existing CMS page drafts and compositions</span><b>↗</b></a>
              <a href="/admin/scene-lab"><strong>Scene lab</strong><span>Explore renderer-backed section composition</span><b>↗</b></a></div>
            </section>
            <section className="bs-panel"><div className="bs-panel-heading"><div><h2>Storefront preview</h2><p>Read-only view of the current public storefront. Draft changes require the actual Theme Studio.</p></div><a className="bs-btn" href="/" target="_blank" rel="noreferrer">Open storefront ↗</a></div>
              <div className="bs-store-preview"><div><strong>{company.name}</strong><small>{company.tagline || "Brand-led commerce"}</small></div><span style={{background:accent}}>Current brand color</span><p>Use Theme Studio to preview and edit your actual CMS content. Brand identity changes alone do not publish a theme.</p></div>
            </section>
          </div>}
        </>}
      </div>
    </div>
    {picker && <div className="bs-picker-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPicker(null);}}>
      <section className="bs-picker" role="dialog" aria-modal="true" aria-labelledby="bs-picker-title">
        <div className="bs-picker-head"><div><span className="bs-kicker">CONTENT LIBRARY / ASSET PICKER</span><h2 id="bs-picker-title">{picker.role?"Assign brand asset":"Add to brand board"}</h2><p>Browse existing source assets; files are never duplicated.</p></div><button type="button" className="bs-close" onClick={()=>setPicker(null)} aria-label="Close">×</button></div>
        <label className="bs-field"><span>Find an image</span><input autoFocus value={candidateQuery} placeholder="Search library assets…" onChange={e=>setCandidateQuery(e.target.value)}/></label>
        <div className="bs-picker-grid">{candidates.map(a=><button type="button" key={a.id} disabled={pickerBusy!==null} onClick={()=>void (picker.role?assignRole(picker.role,a.id):changeBoardAsset(a.id,"album_add"))}>
          <span className="bs-picker-image"><MediaThumb asset={a} alt={a.filename}/></span><span title={a.filename}>{pickerBusy===a.id?"Saving…":a.filename}</span></button>)}</div>
        {!candidateLoading&&!candidates.length&&<div className="bs-empty-small">No matching images. <a href="/admin/content">Open the media library</a> to upload one.</div>}
        {candidateMore&&<button type="button" className="bs-btn" disabled={candidateLoading} onClick={()=>void moreCandidates()}>Load more images</button>}
        {candidateLoading&&<div className="bs-empty-small" role="status">Loading assets…</div>}
      </section>
    </div>}
  </main>;
}
