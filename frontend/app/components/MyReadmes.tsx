"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

// user session shape from localStorage
type StoredUserData = {
  id?: string;
  token?: string;
  refreshToken?: string;
  firstName?: string;
  lastName?: string;
};

// stored repo doc from GET /api/repos
type StoredRepo = {
  _id: string;
  Name: string;
  FullName: string;
  RemoteUrl: string;
  Readme: string;
  GenerationNumber?: number;
  Sha?: string;
  regenerationMode?: string;
  IsPrivate: boolean;
  Metadata: {
    languages?: string[];
    language?: string;
    description?: string;
  };
  UpdatedAt: string;
  CreatedAt: string;
};

// -------------------------------------------------------------------------
// Markdown renderer (block-level + inline subset, matches Dashboard viewer)
// -------------------------------------------------------------------------

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseInlineMarkdown(
  text: string
): Array<{ type: "text" | "code" | "strong"; value: string }> {
  const tokens: Array<{ type: "text" | "code" | "strong"; value: string }> = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const raw = match[0];
    if (raw.startsWith("`")) {
      tokens.push({ type: "code", value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: "strong", value: raw.slice(2, -2) });
    }
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens.length ? tokens : [{ type: "text", value: text }];
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  return parseInlineMarkdown(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === "code") {
      return (
        <code key={key} className="rounded bg-[#18152a] px-1.5 py-0.5 text-[#9fe1cb]">
          {token.value}
        </code>
      );
    }
    if (token.type === "strong") {
      return (
        <strong key={key} className="font-semibold text-[#f6f4ff]">
          {token.value}
        </strong>
      );
    }
    return <span key={key}>{token.value}</span>;
  });
}

function renderMarkdownPreview(markdown: string): ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage = "";
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (!text) { paragraph = []; return; }
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[14px] leading-7 text-[#c8c2ef]">
        {renderInlineMarkdown(text, `p-${blocks.length}`)}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-2 text-[14px] leading-7 text-[#c8c2ef]">
        {listItems.map((item, index) => (
          <li key={`li-${blocks.length}-${index}`} className="flex items-start gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#7f77dd]" />
            <span>{renderInlineMarkdown(item, `li-${blocks.length}-${index}`)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push(
      <div key={`code-${blocks.length}`} className="overflow-hidden rounded-[12px] border border-[#302a54] bg-[#100e1f]">
        <div className="flex items-center justify-between border-b border-[#252240] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[#7f77dd]">
          <span>{codeLanguage || "code"}</span>
          <span className="text-[#5dcaa5]">{codeLines.length} lines</span>
        </div>
        <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6 text-[#eeedfe]">
          <code>{codeLines.join("\n")}</code>
        </pre>
      </div>
    );
    codeLines = [];
    codeLanguage = "";
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      const text = trimmed.slice(2);
      blocks.push(
        <h1 key={`h1-${blocks.length}`} id={slugify(text)} className="text-[28px] leading-tight font-medium tracking-tight text-[#f6f4ff]">
          {text}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      const text = trimmed.slice(3);
      blocks.push(
        <h2 key={`h2-${blocks.length}`} id={slugify(text)} className="pt-3 text-[20px] font-medium tracking-tight text-[#f6f4ff]">
          {text}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      const text = trimmed.slice(4);
      blocks.push(
        <h3 key={`h3-${blocks.length}`} id={slugify(text)} className="pt-2 text-[16px] font-medium text-[#eeedfe]">
          {text}
        </h3>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      flushList();
      blocks.push(<div key={`hr-${blocks.length}`} className="my-2 h-px w-full bg-[#2b2646]" />);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();

  return blocks;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

// returns a relative time string e.g. "3 mins ago"
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// -------------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------------
export default function MyReadmes() {

  // --- user identity ---
  const [displayName, setDisplayName] = useState("");
  const [userInitials, setUserInitials] = useState("RM");

  // --- repo list ---
  const [repos, setRepos] = useState<StoredRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // --- editor: repo whose README is open in the right panel ---
  const [viewingRepo, setViewingRepo] = useState<StoredRepo | null>(null);
  // working copy of the markdown for the open repo (edits live here until Save)
  const [draftReadme, setDraftReadme] = useState<string>("");
  // "edit" = raw markdown only, "preview" = rendered HTML only, "split" = both
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // true when draft differs from the persisted README
  const isDirty = viewingRepo != null && draftReadme !== (viewingRepo.Readme || "");

  // memoize rendered preview so typing stays responsive
  const previewBlocks = useMemo(() => renderMarkdownPreview(draftReadme), [draftReadme]);

  // --- per-row loading states ---
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // --- search ---
  const [search, setSearch] = useState("");

  // pending repo id from ?open= URL param (resolved once repos load)
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  // once repos load and a pending id is set, open that repo in the viewer
  useEffect(() => {
    if (pendingOpenId && repos.length > 0) {
      const target = repos.find((r) => r._id === pendingOpenId);
      if (target) setViewingRepo(target);
      setPendingOpenId(null);
    }
  }, [pendingOpenId, repos]);

  // when a different repo is opened, seed the editor draft and clear save msg
  useEffect(() => {
    if (viewingRepo) {
      setDraftReadme(viewingRepo.Readme || "");
      setSaveMessage("");
    } else {
      setDraftReadme("");
    }
  }, [viewingRepo?._id]);

  // reads user session from localStorage
  function getStoredUserData(): StoredUserData | null {
    const raw = localStorage.getItem("user_data");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // GET /api/repos and sets repo list state
  async function fetchRepos(token: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

    try {
      const res = await fetch(`${baseUrl}/api/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setLoadError("Couldn't load your READMEs.");
        return;
      }

      const data = await res.json();
      setLoadError("");
      setRepos(data.repos ?? []);
    } catch {
      setLoadError(
        `Cannot reach backend at ${baseUrl}. Make sure the backend server is running and NEXT_PUBLIC_API_URL is correct.`
      );
    }
  }

  // on mount: set user info and load repos
  useEffect(() => {
    const userData = getStoredUserData();
    if (userData?.firstName) {
      const first = userData.firstName;
      const last = userData.lastName || "";
      const initials = last ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() : first.charAt(0).toUpperCase();
      setDisplayName(last ? `${first} ${last}` : first);
      setUserInitials(initials || "RM");
    }
    if (!userData?.token || !process.env.NEXT_PUBLIC_API_URL) {
      setIsLoading(false);
      setLoadError("Please sign in to view your READMEs.");
      return;
    }
    // load repos, then auto-open repo from ?open=<id> if present
    fetchRepos(userData.token).finally(() => {
      setIsLoading(false);
      const params = new URLSearchParams(window.location.search);
      const openId = params.get("open");
      if (openId) {
        // repos state may not be set yet; store the id and resolve below
        setPendingOpenId(openId);
      }
    });
  }, []);

  // DELETE /api/repos/:id, removes from state, closes viewer if open
  async function handleDelete(repoId: string): Promise<void> {
    const userData = getStoredUserData();
    if (!userData?.token) return;
    setDeletingId(repoId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repos/${repoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      if (!res.ok) return;
      setRepos((prev) => prev.filter((r) => r._id !== repoId));
      if (viewingRepo?._id === repoId) setViewingRepo(null); // close viewer if open
    } finally {
      setDeletingId(null);
    }
  }

  // re-runs /analyze, updates list + viewer if open
  async function handleRegenerate(repo: StoredRepo): Promise<void> {
    const userData = getStoredUserData();
    if (!userData?.id || !userData?.token) {
      setActionMessage("Please sign in before regenerating.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setActionMessage("API URL is not configured.");
      return;
    }

    setRegeneratingId(repo._id);
    setActionMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData.token}`,
        },
        body: JSON.stringify({
          repoUrl: repo.RemoteUrl,
          userId: userData.id,
          regenerationMode: "auto",
          baseSha: repo.Sha || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data?.error || data?.message || `Failed to regenerate ${repo.Name}.`);
        return;
      }

      if (!data?.Readme || !String(data.Readme).trim()) {
        setActionMessage(`Regeneration completed for ${repo.Name}, but no README content was returned.`);
        return;
      }

      setRepos((prev) => prev.map((r) => r._id === data._id ? data : r));
      if (viewingRepo?._id === data._id) setViewingRepo(data);
      const version = Number(data?.GenerationNumber || 0);
      setActionMessage(
        `Regenerated ${repo.Name}${version > 0 ? ` to v${version}` : ""} successfully.`
      );
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : `Failed to regenerate ${repo.Name}.`);
    } finally {
      setRegeneratingId(null);
    }
  }

  // PUT /api/repos/:id/readme - persists the draft markdown
  async function handleSaveReadme(): Promise<void> {
    if (!viewingRepo) return;
    const userData = getStoredUserData();
    if (!userData?.token) {
      setSaveMessage("Please sign in to save.");
      return;
    }
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/repos/${viewingRepo._id}/readme`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userData.token}`,
          },
          body: JSON.stringify({ Readme: draftReadme }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage(data?.message || "Failed to save README.");
        return;
      }
      const updated: StoredRepo = data.repo;
      // reflect in list + viewer
      setRepos((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      setViewingRepo(updated);
      setSaveMessage("Saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save README.");
    } finally {
      setIsSaving(false);
    }
  }

  // filter repos by search query
  const filtered = repos.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.Name.toLowerCase().includes(q) ||
      r.FullName.toLowerCase().includes(q) ||
      (r.Metadata?.description || "").toLowerCase().includes(q)
    );
  });


  return (
    <div className="flex h-screen w-full bg-[#13111e] font-mono overflow-hidden relative">

      {/* bg glows */}
      <div className="pointer-events-none absolute -top-20 right-[-60px] w-[340px] h-[340px] rounded-full bg-[#1d9e75] opacity-[0.15]" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[160px] w-[300px] h-[300px] rounded-full bg-[#534ab7] opacity-[0.13]" />
      <div className="pointer-events-none absolute bottom-[-60px] right-[80px] w-[260px] h-[260px] rounded-full bg-[#1d9e75] opacity-[0.2]" />

      {/* sidebar */}
      <aside className="flex flex-col w-[220px] flex-shrink-0 bg-[#1c1a2e] border-r border-[#252240] z-10">
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-[#252240]">
          <div className="flex flex-col justify-center gap-[3px] w-[33px] h-[32px] bg-[#1d9e75] rounded-[8px] px-[7px] flex-shrink-0">
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm w-full" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-80 w-[65%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-60 w-[80%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-40 w-[50%]" />
          </div>
          <span className="text-[#eeedfe] text-[20px] font-medium tracking-tight">ReadMeMaybe</span>
        </div>
        <nav className="flex flex-col gap-1 px-[10px] pt-4 flex-1">
          <Link href="/Dashboard" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <div className="grid grid-cols-2 gap-[2px] w-[15px] h-[15px] flex-shrink-0">
              <div className="bg-[#7f77dd] rounded-[1.5px]" /><div className="bg-[#7f77dd] rounded-[1.5px]" />
              <div className="bg-[#7f77dd] rounded-[1.5px]" /><div className="bg-[#7f77dd] rounded-[1.5px]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">Dashboard</span>
          </Link>
          {/* My READMEs - active */}
          <div className="flex items-center gap-[10px] px-[9px] py-2 rounded-[7px] bg-[#252240] border-l-[3px] border-[#1d9e75]">
            <div className="flex flex-col gap-[3px] w-[15px] flex-shrink-0">
              <div className="h-[3px] bg-[#1d9e75] rounded-sm w-full" />
              <div className="h-[3px] bg-[#1d9e75] rounded-sm w-[80%]" />
              <div className="h-[3px] bg-[#1d9e75] rounded-sm w-[65%]" />
            </div>
            <span className="text-[#eeedfe] text-[13px] font-bold">My READMEs</span>
          </div>
          <Link href="/About" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="4.5" r="2.5" stroke="#7f77dd" strokeWidth="1.5" />
              <path d="M2 13c0-3.037 2.462-5.5 5.5-5.5S13 9.963 13 13" stroke="#7f77dd" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#7f77dd] text-[13px] font-medium">About Us</span>
          </Link>
        </nav>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#252240]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#534ab7] text-[#eeedfe] text-[12px] font-medium flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#eeedfe] text-[13px] font-medium leading-tight truncate">{displayName}</p>
          </div>
          <button onClick={() => { localStorage.removeItem("user_data"); window.location.href = "/Login"; }} title="Log out" className="text-[#7f77dd] hover:text-[#e0a4be] transition flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* main content: two-panel layout */}
      <main className="flex-1 flex overflow-hidden relative bg-gradient-to-br from-[#0f7f5f40] via-transparent to-[#1c1530]">

        {/* left panel: repo list */}
        <div className={`flex flex-col px-8 pt-8 pb-6 overflow-y-auto transition-all duration-300 ${viewingRepo ? "w-[420px] flex-shrink-0" : "flex-1"}`}>

          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-[#eeedfe] text-[24px] font-medium leading-tight">My READMEs</h1>
            <p className="text-[#7f77dd] text-[13px] mt-1">
              {isLoading ? "Loading…" : `${repos.length} repo${repos.length === 1 ? "" : "s"} saved`}
            </p>
          </div>

          {/* Search box */}
          <div className="relative mb-5">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[#7f77dd]" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search repos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] pl-8 pr-4 py-2.5 text-[#eeedfe] text-[12px] placeholder:text-[#3c3489] outline-none focus:border-[#7f77dd] transition"
            />
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className={`grid gap-3 ${viewingRepo ? "grid-cols-1" : "grid-cols-3"}`}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4 animate-pulse">
                  <div className="h-4 bg-[#252240] rounded w-[50%] mb-2" />
                  <div className="h-3 bg-[#252240] rounded w-[70%] mb-4" />
                  <div className="h-3 bg-[#252240] rounded w-[40%]" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && loadError && (
            <p className="text-[#e0a4be] text-[13px]">{loadError}</p>
          )}

          {!isLoading && !loadError && actionMessage && (
            <p className="text-[#afa9ec] text-[13px] mb-3">{actionMessage}</p>
          )}

          {/* Empty state */}
          {!isLoading && !loadError && repos.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center pt-16">
              <p className="text-[#eeedfe] text-[15px] font-medium">No repos yet</p>
              <p className="text-[#7f77dd] text-[12px]">Head to the dashboard to generate your first README.</p>
              <Link href="/Dashboard" className="mt-2 bg-[#534ab7] text-[#eeedfe] text-[13px] px-5 py-2 rounded-[8px] hover:bg-[#6258c4] transition">
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* No search results */}
          {!isLoading && !loadError && repos.length > 0 && filtered.length === 0 && (
            <p className="text-[#7f77dd] text-[13px]">No repos match &quot;{search}&quot;</p>
          )}

          {/* Repo grid - same card style as Dashboard recent activity */}
          {!isLoading && filtered.length > 0 && (
            <div className={`grid gap-3 ${viewingRepo ? "grid-cols-1" : "grid-cols-3"}`}>
              {filtered.map((repo) => {
                const hasReadme = Boolean(repo.Readme?.trim());
                const isActive = viewingRepo?._id === repo._id;
                const generationNumber = Math.max(0, Number(repo.GenerationNumber || 0));
                const languages: string[] = repo.Metadata?.languages?.length
                  ? repo.Metadata.languages.slice(0, 3)
                  : repo.Metadata?.language ? [repo.Metadata.language] : [];
                return (
                  <div
                    key={repo._id}
                    onClick={() => setViewingRepo(isActive ? null : repo)}
                    className={`bg-[#1c1a2e] border border-[0.5px] rounded-[10px] px-4 py-4 flex items-start justify-between cursor-pointer transition ${
                      isActive ? "border-[#1d9e75]" : "border-[#3c3489] hover:border-[#1d9e75]"
                    }`}
                  >
                    {/* Left: name, URL, language tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[#eeedfe] text-[16px] font-medium truncate">{repo.Name}</p>
                        {repo.IsPrivate && (
                          <span className="text-[9px] text-[#7f77dd] border border-[#3c3489] border-[0.5px] px-1.5 py-0.5 rounded-full flex-shrink-0">private</span>
                        )}
                      </div>
                      <p className="text-[#7f77dd] text-[10px] truncate w-[200px] mb-3">
                        {repo.RemoteUrl.replace(/^https?:\/\//, "")}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {languages.map((l) => (
                          <span key={l} className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">{l}</span>
                        ))}
                      </div>
                    </div>

                    {/* Right: status badge, timestamp, action buttons */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
                      {hasReadme
                        ? <span className="bg-[#9fe1cb] border border-[#085041] border-[0.5px] text-[#085041] text-[8px] font-medium px-2 py-0.5 rounded-full">Done</span>
                        : <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] font-medium px-2 py-0.5 rounded-full">No README</span>
                      }
                      <p className="text-[#7f77dd] text-[8px]">{timeAgo(repo.UpdatedAt)}</p>
                      <p className="text-[#afa9ec] text-[8px]">v{generationNumber}</p>
                      <div className="flex gap-1.5">
                        {/* View - opens README in the right panel */}
                        <button
                          disabled={!hasReadme}
                          onClick={() => { if (hasReadme) setViewingRepo(isActive ? null : repo); }}
                          className={`text-[11px] font-medium px-2.5 py-1.5 rounded-[5px] border border-[0.5px] transition ${
                            hasReadme
                              ? "bg-[#252240] border-[#3c3489] text-[#eeedfe] hover:border-[#7f77dd]"
                              : "bg-[#1c1a2d] border-[#676670] text-[#676670] cursor-not-allowed"
                          }`}
                        >
                          View
                        </button>
                        {/* Regenerate */}
                        <button disabled={regeneratingId === repo._id || deletingId === repo._id} onClick={() => handleRegenerate(repo)} title="Regenerate" className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#5dcaa5] px-2.5 py-1.5 rounded-[5px] hover:border-[#5dcaa5] transition disabled:opacity-40 disabled:cursor-not-allowed">
                          {regeneratingId === repo._id
                            ? <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M13 7A6 6 0 1 1 7 1v2a4 4 0 1 0 4 4h2Z" fill="currentColor"/><path d="M7 1l2.5 2.5L7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          }
                        </button>
                        {/* Delete */}
                        <button disabled={deletingId === repo._id || regeneratingId === repo._id} onClick={() => handleDelete(repo._id)} title="Delete" className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#e0a4be] px-2.5 py-1.5 rounded-[5px] hover:border-[#e0a4be] transition disabled:opacity-40 disabled:cursor-not-allowed">
                          {deletingId === repo._id
                            ? <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* right panel: README editor (raw markdown + rendered preview) */}
        {viewingRepo && (
          <div className="flex-1 flex flex-col border-l border-[#252240] bg-[#13111e] overflow-hidden">
            {/* editor header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#252240] flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#7f77dd] mb-0.5">
                  README Editor {isDirty && <span className="text-[#e0a4be] normal-case tracking-normal">• unsaved</span>}
                </p>
                <h2 className="text-[#eeedfe] text-[16px] font-medium truncate">{viewingRepo.Name}</h2>
                <p className="text-[#afa9ec] text-[10px]">Version v{Math.max(0, Number(viewingRepo.GenerationNumber || 0))}</p>
                <a href={viewingRepo.RemoteUrl} target="_blank" rel="noopener noreferrer" className="text-[#7f77dd] text-[10px] hover:text-[#afa9ec] transition">
                  {viewingRepo.RemoteUrl.replace(/^https?:\/\//, "")} ↗
                </a>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {/* View mode toggle */}
                <div className="flex items-center bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[7px] overflow-hidden">
                  {(["edit", "split", "preview"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`text-[11px] px-3 py-1.5 transition ${
                        viewMode === mode
                          ? "bg-[#534ab7] text-[#eeedfe]"
                          : "text-[#7f77dd] hover:text-[#eeedfe]"
                      }`}
                    >
                      {mode === "edit" ? "Edit" : mode === "split" ? "Split" : "Preview"}
                    </button>
                  ))}
                </div>
                {/* Save */}
                <button
                  onClick={handleSaveReadme}
                  disabled={isSaving || !isDirty}
                  className="bg-[#1d9e75] text-[#eeedfe] text-[11px] px-3 py-1.5 rounded-[7px] hover:bg-[#24b386] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                {/* Copy markdown to clipboard */}
                <button
                  onClick={() => navigator.clipboard.writeText(draftReadme)}
                  disabled={!draftReadme.trim()}
                  className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#eeedfe] text-[11px] px-3 py-1.5 rounded-[7px] hover:border-[#7f77dd] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Copy
                </button>
                {/* Download as README.md file */}
                <button
                  disabled={!draftReadme.trim()}
                  onClick={() => {
                    const blob = new Blob([draftReadme], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${viewingRepo.Name}-README.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#eeedfe] text-[11px] px-3 py-1.5 rounded-[7px] hover:border-[#7f77dd] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Download
                </button>
                {/* Close viewer */}
                <button
                  onClick={() => {
                    if (isDirty && !confirm("Discard unsaved changes?")) return;
                    setViewingRepo(null);
                  }}
                  className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#7f77dd] text-[11px] px-3 py-1.5 rounded-[7px] hover:border-[#7f77dd] hover:text-[#eeedfe] transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Save status message bar */}
            {saveMessage && (
              <div className="px-6 py-2 border-b border-[#252240] text-[#afa9ec] text-[11px] flex-shrink-0">
                {saveMessage}
              </div>
            )}

            {/* Editor body */}
            {viewingRepo.Readme?.trim() || draftReadme.trim() ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Raw markdown textarea */}
                {(viewMode === "edit" || viewMode === "split") && (
                  <div className={`flex flex-col overflow-hidden ${viewMode === "split" ? "w-1/2 border-r border-[#252240]" : "w-full"}`}>
                    <div className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#7f77dd] border-b border-[#252240] flex-shrink-0">
                      Markdown
                    </div>
                    <textarea
                      value={draftReadme}
                      onChange={(e) => setDraftReadme(e.target.value)}
                      spellCheck={false}
                      className="flex-1 w-full bg-[#0f0d1a] text-[#eeedfe] text-[12px] leading-6 font-mono p-4 outline-none resize-none"
                    />
                  </div>
                )}

                {/* Rendered HTML preview */}
                {(viewMode === "preview" || viewMode === "split") && (
                  <div className={`flex flex-col overflow-hidden ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                    <div className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#7f77dd] border-b border-[#252240] flex-shrink-0">
                      Preview
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      {previewBlocks.length > 0 ? (
                        previewBlocks
                      ) : (
                        <p className="text-[#7f77dd] text-[12px] italic">Nothing to preview yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-[#eeedfe] text-[14px] font-medium">No README content</p>
                <p className="text-[#7f77dd] text-[12px]">This repo hasn&apos;t had a README generated yet.</p>
                <button
                  onClick={() => handleRegenerate(viewingRepo)}
                  disabled={regeneratingId === viewingRepo._id}
                  className="mt-2 bg-[#534ab7] text-[#eeedfe] text-[12px] px-5 py-2 rounded-[8px] hover:bg-[#6258c4] transition disabled:opacity-60"
                >
                  {regeneratingId === viewingRepo._id ? "Generating…" : "Generate README"}
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
