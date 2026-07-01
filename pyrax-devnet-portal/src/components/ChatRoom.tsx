// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Shared realtime chat (devnet portal + team site). Public channels, private DMs + group chats,
// presence, a live members roster (green pulse = online / subdued red = offline), @mentions, emoji,
// GIFs (via Giphy), and admin delete. Pass `apiBase` (default "/api/chat"); each app implements
// {apiBase}/token, /conversations, /users, /giphy. Team users connect with admin=true (Admin badge).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui";

const EMOJI = ["😀", "😂", "🤣", "😊", "😍", "😎", "🤔", "👀", "🔥", "🚀", "💪", "🙌", "👍", "👎", "🎉", "✅", "❌", "⚠️", "💯", "🐛", "⚡", "🧪", "🛠️", "💎", "🦅", "❤️", "🙏", "😅", "😉", "🤝", "👋", "💀"];
// Chat name colors: testers = PYRAX orange, community-support = green, admins = PYRAX blue.
const ROLE_COLOR: Record<string, string> = { admin: "#5aa6e0", support: "#3fcf8e", tester: "#f58622" };
const roleColor = (r?: string) => ROLE_COLOR[r || "tester"] || "#f58622";

interface Msg { id: string; channel: string; author_id: string; author_name: string; author_user: string; author_admin: boolean; author_role?: string; body: string; gif: string | null; created_at: number }
interface Member { id: string; user: string; name: string; admin: boolean; role?: string }

export default function ChatRoom({ apiBase = "/api/chat" }: { apiBase?: string }) {
  const [me, setMe] = useState<Member | null>(null);
  const [channels, setChannels] = useState<string[]>(["general"]);
  const [convos, setConvos] = useState<any[]>([]);
  const [roster, setRoster] = useState<Member[]>([]);
  const [online, setOnline] = useState<Member[]>([]);
  const [current, setCurrent] = useState("general");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [presence, setPresence] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [giphyOn, setGiphyOn] = useState(false);
  const [gifs, setGifs] = useState<any[]>([]);
  const [gifQ, setGifQ] = useState("");
  const [newChat, setNewChat] = useState<null | "dm" | "group">(null);
  const [mobileNav, setMobileNav] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const curRef = useRef("general");

  async function loadConvos() { try { const d = await (await fetch(`${apiBase}/conversations`)).json(); if (d.ok) { setConvos(d.conversations || []); if (d.me) setMe(d.me); } } catch {} }
  async function loadRoster() { try { const d = await (await fetch(`${apiBase}/users?roster=1`)).json(); if (d.ok) setRoster(d.roster || []); } catch {} }

  useEffect(() => {
    let alive = true, ws: WebSocket | null = null, retry: any;
    loadConvos(); loadRoster();
    function connect() {
      fetch(`${apiBase}/token`).then((r) => r.json()).then((d) => {
        if (!d.ok || !alive) return;
        setGiphyOn(!!d.giphy);
        ws = new WebSocket(`${d.wsUrl}?token=${encodeURIComponent(d.token)}`);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => { if (alive) { setConnected(false); retry = setTimeout(connect, 2500); } };
        ws.onmessage = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.type === "ready") { setMe((x) => x || m.me); setChannels(m.channels); }
          else if (m.type === "history" && m.channel === curRef.current) setMessages(m.messages);
          else if (m.type === "msg" && m.message.channel === curRef.current) setMessages((x) => [...x, m.message]);
          else if (m.type === "deleted") setMessages((x) => x.filter((y) => y.id !== m.id));
          else if (m.type === "presence" && m.channel === curRef.current) setPresence(m.users);
          else if (m.type === "online") setOnline(m.users || []);
        };
      }).catch(() => {});
    }
    connect();
    return () => { alive = false; clearTimeout(retry); ws && ws.close(); };
  }, [apiBase]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function switchTo(id: string) { setCurrent(id); curRef.current = id; setMessages([]); setMobileNav(false); wsRef.current?.send(JSON.stringify({ type: "join", channel: id })); }
  function send() { const body = input.trim(); if (!body) return; wsRef.current?.send(JSON.stringify({ type: "msg", body })); setInput(""); setEmojiOpen(false); }
  function sendGif(url: string) { wsRef.current?.send(JSON.stringify({ type: "msg", gif: url })); setGifOpen(false); }
  function del(id: string) { wsRef.current?.send(JSON.stringify({ type: "delete", id })); }
  async function searchGifs(q: string) { setGifQ(q); const d = await (await fetch(`${apiBase}/giphy?q=${encodeURIComponent(q)}`)).json(); setGifs(d.gifs || []); }
  async function startDm(handle: string) {
    const d = await (await fetch(`${apiBase}/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "dm", memberHandles: [handle] }) })).json();
    if (d.ok) { await loadConvos(); switchTo(d.id); }
  }

  const onlineSet = useMemo(() => new Set(online.map((u) => u.user)), [online]);
  const convLabel = (c: any) => c.type === "dm" ? ("@" + ((c.members || []).find((m: Member) => m.id !== me?.id)?.user || "dm")) : (c.name || "Group");
  const headerLabel = channels.includes(current) ? "# " + current : convLabel(convos.find((c) => c.id === current) || {});

  const mentionMatch = useMemo(() => { const m = input.match(/@([a-z0-9_]*)$/i); return m ? m[1].toLowerCase() : null; }, [input]);
  const mentionList = mentionMatch !== null ? presence.filter((p) => p.user && p.user.toLowerCase().startsWith(mentionMatch)).slice(0, 5) : [];
  function renderBody(text: string) { return text.split(/(@[a-z0-9_]+)/gi).map((p, i) => /^@/.test(p) ? <span key={i} className="rounded bg-[rgba(245,134,34,0.18)] px-1 font-semibold text-gold">{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>); }

  return (
    <div className="flex h-[calc(100vh-9rem)] overflow-hidden rounded-2xl border border-line bg-[rgba(8,10,17,0.6)]">
      {/* left: channels + conversations */}
      <div className="hidden w-48 shrink-0 flex-col overflow-y-auto border-r border-line p-3 lg:flex">
        <div className="px-2 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Channels</div>
        <div className="mt-1 space-y-0.5">{channels.map((c) => <button key={c} onClick={() => switchTo(c)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${current === c ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}># {c}</button>)}</div>
        <div className="mt-4 flex items-center justify-between px-2"><span className="text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Direct & Groups</span><button onClick={() => setNewChat("dm")} className="text-faint hover:text-ink" title="New message">＋</button></div>
        <div className="mt-1 space-y-0.5">
          {convos.length === 0 && <p className="px-2.5 py-1 text-xs text-faint">No conversations yet.</p>}
          {convos.map((c) => <button key={c.id} onClick={() => switchTo(c.id)} className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-sm ${current === c.id ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}>{c.type === "dm" ? convLabel(c) : "👥 " + (c.name || "Group")}</button>)}
        </div>
      </div>
      {/* center: messages */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setMobileNav(true)} aria-label="Channels & messages" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-ink lg:hidden">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="truncate font-semibold">{headerLabel}</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-faint"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-[color:var(--color-positive)]" : "bg-faint"}`} />{connected ? "connected" : "reconnecting…"}</div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-center text-sm text-faint">No messages yet — say hi 👋</p>}
          {messages.map((m) => (
            <div key={m.id} className="group flex gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgba(255,255,255,0.05)] text-xs font-bold">{(m.author_name || "?").slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs"><span className="font-semibold" style={{ color: roleColor(m.author_role) }}>{m.author_user ? "@" + m.author_user : m.author_name}</span>{m.author_admin ? <span className="rounded bg-[rgba(90,166,224,0.18)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: "#5aa6e0" }}>Admin</span> : m.author_role === "support" && <span className="rounded bg-[rgba(63,207,142,0.16)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide" style={{ color: "#3fcf8e" }}>Support</span>}<span className="text-faint">{new Date(Number(m.created_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>{me?.admin && <button onClick={() => del(m.id)} className="opacity-0 transition group-hover:opacity-100 text-faint hover:text-[color:var(--color-negative)]">✕</button>}</div>
                {m.body && <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">{renderBody(m.body)}</div>}
                {m.gif && <img src={m.gif} className="mt-1 max-h-48 rounded-lg border border-line" />}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {/* input */}
        <div className="relative border-t border-line p-3">
          {(emojiOpen || gifOpen) && <div className="fixed inset-0 z-40" onClick={() => { setEmojiOpen(false); setGifOpen(false); }} />}
          {mentionList.length > 0 && (
            <div className="absolute bottom-full left-3 z-50 mb-1 w-48 overflow-hidden rounded-lg border border-line bg-[rgba(8,10,17,0.98)]">
              {mentionList.map((p) => <button key={p.user} onClick={() => setInput(input.replace(/@([a-z0-9_]*)$/i, "@" + p.user + " "))} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[rgba(245,134,34,0.1)]">@{p.user} {p.admin && <span className="text-xs text-[color:var(--color-brand)]">admin</span>}</button>)}
            </div>
          )}
          {emojiOpen && <div className="absolute bottom-full left-3 z-50 mb-1 grid w-64 grid-cols-8 gap-1 rounded-lg border border-line bg-[rgba(8,10,17,0.98)] p-2">{EMOJI.map((e) => <button key={e} onClick={() => { setInput(input + e); setEmojiOpen(false); }} className="rounded p-1 text-lg hover:bg-[rgba(255,255,255,0.06)]">{e}</button>)}</div>}
          {gifOpen && (
            <div className="absolute bottom-full left-3 z-50 mb-1 w-80 rounded-lg border border-line bg-[rgba(8,10,17,0.98)] p-2">
              {!giphyOn ? <p className="p-3 text-center text-xs text-faint">GIFs need a Giphy API key (see TODO.md).</p> : <>
                <input autoFocus className="input py-1.5 text-sm" placeholder="Search GIFs…" value={gifQ} onChange={(e) => searchGifs(e.target.value)} />
                <div className="mt-2 grid max-h-52 grid-cols-2 gap-1 overflow-y-auto">{gifs.map((g) => <img key={g.id} src={g.preview} onClick={() => sendGif(g.url)} className="h-20 w-full cursor-pointer rounded object-cover" />)}</div>
              </>}
            </div>
          )}
          <div className="relative z-50 flex items-center gap-2">
            <button onClick={() => { setEmojiOpen(!emojiOpen); setGifOpen(false); }} className="text-lg text-faint hover:text-ink" title="Emoji">😊</button>
            <button onClick={() => { setGifOpen(!gifOpen); setEmojiOpen(false); if (!gifs.length) searchGifs(""); }} className="rounded border border-line px-1.5 py-0.5 text-xs font-bold text-faint hover:text-ink" title="GIF">GIF</button>
            <input className="input" placeholder={`Message ${headerLabel}`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <Button variant="primary" onClick={send}>Send</Button>
          </div>
        </div>
      </div>
      {/* right: members roster */}
      <div className="hidden w-48 shrink-0 flex-col overflow-y-auto border-l border-line p-3 xl:flex">
        <div className="px-2 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Members · {onlineSet.size} online</div>
        <div className="mt-1 space-y-0.5">
          {roster.map((u) => {
            const on = onlineSet.has(u.user);
            return (
              <button key={u.id} onClick={() => u.id !== me?.id && startDm(u.user)} title={u.id !== me?.id ? "Message @" + u.user : "You"} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-ink">
                <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-[color:var(--color-positive)] animate-pulse shadow-[0_0_6px_var(--color-positive)]" : "bg-[#5a2230]"}`} />
                <span className="truncate" style={{ color: roleColor(u.role) }}>@{u.user}</span>{u.admin ? <span className="ml-auto text-[0.6rem]" style={{ color: "#5aa6e0" }}>admin</span> : u.role === "support" && <span className="ml-auto text-[0.6rem]" style={{ color: "#3fcf8e" }}>support</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* mobile: channels + conversations + members in a slide-over sheet (the lg/xl panels are hidden on small screens) */}
      {mobileNav && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[86vw] flex-col overflow-y-auto border-r border-line bg-[rgba(8,10,17,0.98)] p-3">
            <div className="flame-bar -mx-3 -mt-3 mb-3 h-1" />
            <div className="flex items-center justify-between px-1"><span className="text-sm font-bold">Chat</span><button onClick={() => setMobileNav(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted">✕</button></div>

            <div className="mt-4 px-1 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Channels</div>
            <div className="mt-1 space-y-0.5">{channels.map((c) => <button key={c} onClick={() => switchTo(c)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${current === c ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}># {c}</button>)}</div>

            <div className="mt-4 flex items-center justify-between px-1"><span className="text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Direct & Groups</span><button onClick={() => { setMobileNav(false); setNewChat("dm"); }} className="text-faint hover:text-ink" title="New message">＋</button></div>
            <div className="mt-1 space-y-0.5">
              {convos.length === 0 && <p className="px-2.5 py-1 text-xs text-faint">No conversations yet.</p>}
              {convos.map((c) => <button key={c.id} onClick={() => switchTo(c.id)} className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-sm ${current === c.id ? "bg-[rgba(245,134,34,0.1)] text-ink" : "text-muted hover:text-ink"}`}>{c.type === "dm" ? convLabel(c) : "👥 " + (c.name || "Group")}</button>)}
            </div>

            <div className="mt-4 px-1 text-[0.66rem] font-semibold uppercase tracking-wider text-faint">Members · {onlineSet.size} online</div>
            <div className="mt-1 space-y-0.5">
              {roster.map((u) => {
                const on = onlineSet.has(u.user);
                return (
                  <button key={u.id} onClick={() => { if (u.id !== me?.id) { setMobileNav(false); startDm(u.user); } }} title={u.id !== me?.id ? "Message @" + u.user : "You"} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-ink">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-[color:var(--color-positive)] animate-pulse shadow-[0_0_6px_var(--color-positive)]" : "bg-[#5a2230]"}`} />
                    <span className="truncate" style={{ color: roleColor(u.role) }}>@{u.user}</span>{u.admin ? <span className="ml-auto text-[0.6rem]" style={{ color: "#5aa6e0" }}>admin</span> : u.role === "support" && <span className="ml-auto text-[0.6rem]" style={{ color: "#3fcf8e" }}>support</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {newChat && <NewChat apiBase={apiBase} initial={newChat} onClose={() => setNewChat(null)} onCreated={async (id) => { setNewChat(null); await loadConvos(); switchTo(id); }} />}
    </div>
  );
}

function NewChat({ apiBase, initial, onClose, onCreated }: { apiBase: string; initial: "dm" | "group"; onClose: () => void; onCreated: (id: string) => void }) {
  const [type, setType] = useState<"dm" | "group">(initial);
  const [q, setQ] = useState(""); const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<any[]>([]); const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { let a = true; if (q.trim()) fetch(`${apiBase}/users?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => { if (a && d.ok) setResults(d.users || []); }); else setResults([]); return () => { a = false; }; }, [q]);
  function add(u: any) { if (type === "dm") setPicked([u]); else if (!picked.find((p) => p.id === u.id)) setPicked([...picked, u]); setQ(""); setResults([]); }
  async function create() {
    if (!picked.length) { setErr("Pick someone first."); return; }
    setBusy(true); setErr("");
    const d = await (await fetch(`${apiBase}/conversations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, name, memberHandles: picked.map((p) => p.handle) }) })).json();
    if (!d.ok) { setErr(d.error || "Couldn't create."); setBusy(false); return; }
    onCreated(d.id);
  }
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-[rgba(8,10,17,0.98)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">New conversation</h3><button onClick={onClose} className="text-faint hover:text-ink">✕</button></div>
        <div className="mb-3 flex gap-1 rounded-lg border border-line p-0.5 text-sm">
          {(["dm", "group"] as const).map((t) => <button key={t} onClick={() => { setType(t); setPicked(t === "dm" ? picked.slice(0, 1) : picked); }} className={`flex-1 rounded-md py-1.5 ${type === t ? "bg-[rgba(245,134,34,0.16)] text-ink" : "text-faint"}`}>{t === "dm" ? "Direct message" : "Group chat"}</button>)}
        </div>
        {type === "group" && <input className="input mb-2" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />}
        {picked.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{picked.map((p) => <span key={p.id} className="chip" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}>@{p.handle} ✕</span>)}</div>}
        <input className="input" placeholder="Search by @handle or name…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && <div className="mt-1 overflow-hidden rounded-lg border border-line">{results.map((u) => <button key={u.id} onClick={() => add(u)} className="block w-full px-3 py-2 text-left text-sm hover:bg-[rgba(245,134,34,0.1)]">@{u.handle} <span className="text-faint">· {u.display_name}</span></button>)}</div>}
        {err && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{err}</p>}
        <Button variant="primary" className="mt-4 w-full justify-center" onClick={create} disabled={busy}>{busy ? "Creating…" : type === "dm" ? "Start DM" : "Create group"}</Button>
      </div>
    </div>
  );
}
