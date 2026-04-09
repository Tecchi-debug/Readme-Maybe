"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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

// github repo from the oauth /repos endpoint (for the dropdown)
type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  private: boolean;
  visibility: string;
  language: string | null;
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
  Metadata: {
    languages?: string[];
    language?: string;
    readmeFailureReason?: string;
    readmeStatus?: string;
  };
  UpdatedAt: string;
  CreatedAt: string;
};

// stats computed server-side and returned with /api/repos
type DashboardStats = {
  totalReadmes: number;
  totalRepos: number;
  thisWeekCount: number;
};

function extractReadme(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as { Readme?: string; readme?: string };
  const value = record.Readme ?? record.readme ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function extractGeneratedRepoName(data: unknown, fallback = ""): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as { Name?: string; FullName?: string; repo?: string };
  return record.Name || record.FullName || record.repo || fallback;
}

function extractReadmeFailureReason(data: unknown, repoName = "this repository"): string {
  if (data && typeof data === "object") {
    const record = data as {
      Metadata?: { readmeFailureReason?: string };
      metadata?: { readmeFailureReason?: string };
      error?: string;
      message?: string;
    };
    const metadataReason = record.Metadata?.readmeFailureReason || record.metadata?.readmeFailureReason;
    if (metadataReason) return metadataReason;
    if (record.error) return record.error;
    if (record.message) return record.message;
  }

  return `No README content was found for ${repoName}.`;
}

function extractRepoId(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as { _id?: string };
  return typeof record._id === "string" ? record._id : "";
}

function slugifyRepoLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseInlineMarkdown(text: string): Array<{ type: "text" | "code" | "strong"; value: string }> {
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
      return <code key={key} className="rounded bg-[#18152a] px-1.5 py-0.5 text-[#9fe1cb]">{token.value}</code>;
    }

    if (token.type === "strong") {
      return <strong key={key} className="font-semibold text-[#f6f4ff]">{token.value}</strong>;
    }

    return <span key={key}>{token.value}</span>;
  });
}

type MarkdownBlock = {
  kind: "h1" | "h2" | "h3" | "body";
  anchor?: string;
  node: ReactNode;
};

function renderMarkdownViewer(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage = "";
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (!text) {
      paragraph = [];
      return;
    }
    blocks.push({
      kind: "body",
      node: (
        <p key={`p-${blocks.length}`} className="text-[14px] leading-7 text-[#c8c2ef]">
          {renderInlineMarkdown(text, `p-${blocks.length}`)}
        </p>
      )
    });
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({
      kind: "body",
      node: (
        <ul key={`ul-${blocks.length}`} className="space-y-2 text-[14px] leading-7 text-[#c8c2ef]">
          {listItems.map((item, index) => (
            <li key={`li-${blocks.length}-${index}`} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#7f77dd]" />
              <span>{renderInlineMarkdown(item, `li-${blocks.length}-${index}`)}</span>
            </li>
          ))}
        </ul>
      )
    });
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push({
      kind: "body",
      node: (
        <div key={`code-${blocks.length}`} className="overflow-hidden rounded-[18px] border border-[#302a54] bg-[#100e1f]">
          <div className="flex items-center justify-between border-b border-[#252240] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#7f77dd]">
            <span>{codeLanguage || "code"}</span>
            <span className="text-[#5dcaa5]">{codeLines.length} lines</span>
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-[12px] leading-6 text-[#eeedfe]">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      )
    });
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
      blocks.push({
        kind: "h1",
        anchor: slugifyRepoLabel(text),
        node: <h1 key={`h1-${blocks.length}`} className="text-[34px] leading-tight font-medium tracking-tight text-[#f6f4ff]">{text}</h1>
      });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      const text = trimmed.slice(3);
      blocks.push({
        kind: "h2",
        anchor: slugifyRepoLabel(text),
        node: <h2 key={`h2-${blocks.length}`} className="pt-4 text-[22px] font-medium tracking-tight text-[#f6f4ff]">{text}</h2>
      });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      const text = trimmed.slice(4);
      blocks.push({
        kind: "h3",
        anchor: slugifyRepoLabel(text),
        node: <h3 key={`h3-${blocks.length}`} className="pt-2 text-[17px] font-medium text-[#eeedfe]">{text}</h3>
      });
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
      blocks.push({ kind: "body", node: <div key={`hr-${blocks.length}`} className="my-2 h-px w-full bg-[#2b2646]" /> });
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
// Main Dashboard Component
// -------------------------------------------------------------------------

export default function Dashboard() {

  // --- User identity ---
  const [welcomeName, setWelcomeName] = useState("there");
  const [displayName, setDisplayName] = useState("");
  const [userInitials, setUserInitials] = useState("RM");

  // --- GitHub repo dropdown (for the "Submit a repo" selector) ---
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(true);
  const [reposMessage, setReposMessage] = useState("");
  const [repoSearch, setRepoSearch] = useState("");

  // --- Generate README form ---
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedRepoUrl, setSelectedRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  // --- Generated README preview ---
  const [generatedReadme, setGeneratedReadme] = useState("");
  const [generatedRepoName, setGeneratedRepoName] = useState("");

  // --- Dashboard stats and recent activity (from /api/repos) ---
  const [stats, setStats] = useState<DashboardStats>({ totalReadmes: 0, totalRepos: 0, thisWeekCount: 0 });
  const [recentRepos, setRecentRepos] = useState<StoredRepo[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  // Tracks which card is mid-delete or mid-regenerate to show per-card loading states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // reads user session from localStorage
  function getStoredUserData(): StoredUserData | null {
    const raw = localStorage.getItem("user_data");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // tries to refresh the access token, updates localStorage, returns new token
  async function refreshAccessToken(userData: StoredUserData): Promise<string> {
    const refreshToken = userData?.refreshToken || "";
    if (!refreshToken || !process.env.NEXT_PUBLIC_API_URL) return "";

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (!response.ok || !data?.jwtToken || !data?.refreshToken) return "";

    const updated = { ...userData, token: data.jwtToken, refreshToken: data.refreshToken };
    localStorage.setItem("user_data", JSON.stringify(updated));
    return data.jwtToken;
  }


  // on mount: set user info, load github repos dropdown, load stats + activity
  useEffect(() => {
    const userData = getStoredUserData();

    // populate sidebar from localStorage
    if (userData?.firstName) {
      const first = userData.firstName;
      const last = userData.lastName || "";
      const initials = last ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() : first.charAt(0).toUpperCase();
      setWelcomeName(first);
      setDisplayName(last ? `${first} ${last}` : first);
      setUserInitials(initials || "RM");
    }

    if (!userData?.token || !process.env.NEXT_PUBLIC_API_URL) {
      setIsLoadingRepos(false);
      setIsLoadingActivity(false);
      setReposMessage("Sign in to load your repos.");
      return;
    }

    let cancelled = false;

    // authenticated GET, retries once on 401 with refreshed token
    async function authGet(path: string): Promise<Response> {
      const token = getStoredUserData()?.token || "";
      let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 && userData?.refreshToken) {
        const next = await refreshAccessToken(userData);
        if (next) {
          res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
            headers: { Authorization: `Bearer ${next}` },
          });
        }
      }
      return res;
    }

    // load github repos for the dropdown
    async function loadGithubRepos() {
      setIsLoadingRepos(true);
      try {
        const res = await authGet("/api/auth/github/repos");
        const data = await res.json();
        if (!cancelled) {
          setGithubRepos(res.ok && Array.isArray(data?.repos) ? data.repos : []);
          if (!res.ok) setReposMessage(data?.message || "Couldn't load GitHub repos.");
        }
      } catch {
        if (!cancelled) setReposMessage("Couldn't load GitHub repos.");
      } finally {
        if (!cancelled) setIsLoadingRepos(false);
      }
    }

    // load stats and recent activity
    async function loadDashboardData() {
      setIsLoadingActivity(true);
      try {
        const res = await authGet("/api/repos");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setStats(data.stats ?? { totalReadmes: 0, totalRepos: 0, thisWeekCount: 0 });
          setRecentRepos((data.repos ?? []).slice(0, 3));
        }
      } catch {
        // stats just show 0 on failure
      } finally {
        if (!cancelled) setIsLoadingActivity(false);
      }
    }

    void loadGithubRepos();
    void loadDashboardData();
    return () => { cancelled = true; };
  }, []);

  // POST to /analyze, which generates and persists the README
  async function handleGenerateReadme(): Promise<void> {
    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) { setSubmitMessage("Please enter a GitHub repo URL."); return; }

    const userData = getStoredUserData();
    if (!userData?.id) { setSubmitMessage("Please sign in before submitting a repo."); return; }
    if (!process.env.NEXT_PUBLIC_API_URL) { setSubmitMessage("API URL is not configured."); return; }

    setIsSubmitting(true);
    setSubmitMessage("");
    setGeneratedReadme("");
    setGeneratedRepoName("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userData?.token ? { Authorization: `Bearer ${userData.token}` } : {}),
        },
        body: JSON.stringify({ repoUrl: trimmedUrl, userId: userData.id, regenerationMode: "auto" }),
      });

      const data = await res.json();
      if (!res.ok) { setSubmitMessage(data?.error || data?.message || "Failed to generate README."); return; }

      const nextReadme = extractReadme(data);
      if (!nextReadme) {
        setSubmitMessage(extractReadmeFailureReason(data, "this repository"));
        return;
      }

      // Show the inline preview
      setGeneratedReadme(data?.Readme || "");
      setGeneratedRepoName(data?.Name || data?.FullName || "");
      const modeLabel = data?.regenerationMode === "past-version-regeneration"
        ? "(past-version regeneration)"
        : data?.regenerationMode === "same-version-regeneration"
        ? "(same-version regeneration)"
        : "";
      setSubmitMessage(`README generated successfully ${modeLabel}`.trim());

      // prepend returned repo immediately, then confirm with a refetch
      if (data?._id) {
        setRecentRepos((prev) => {
          const filtered = prev.filter((r) => r._id !== data._id);
          return [data, ...filtered].slice(0, 3);
        });
      }

      // refetch to keep counts accurate
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repos`, {
        headers: userData.token ? { Authorization: `Bearer ${userData.token}` } : {},
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats ?? stats);
        setRecentRepos((statsData.repos ?? []).slice(0, 3));
      }
    } catch (err) {
      setSubmitMessage(err instanceof Error ? err.message : "Failed to generate README.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // derived flag for dropdown error styling
  const isRepoMessageError = reposMessage.toLowerCase().includes("couldn't") ||
    reposMessage.toLowerCase().includes("sign in") ||
    reposMessage.toLowerCase().includes("failed");

  const isSubmitMessageError = submitMessage.toLowerCase().includes("failed") ||
    submitMessage.toLowerCase().includes("no readme") ||
    submitMessage.toLowerCase().includes("please") ||
    submitMessage.toLowerCase().includes("sign in") ||
    submitMessage.toLowerCase().includes("not configured");

  const filteredGithubRepos = githubRepos.filter((repo) => {
    const query = repoSearch.trim().toLowerCase();
    if (!query) return true;
    return repo.fullName.toLowerCase().includes(query) ||
      (repo.language || "").toLowerCase().includes(query) ||
      repo.visibility.toLowerCase().includes(query);
  });

  const selectedGithubRepo = githubRepos.find((repo) => repo.htmlUrl === selectedRepoUrl) || null;

  // DELETE /api/repos/:id, removes from state, refreshes stats
  async function handleDeleteRepo(repoId: string): Promise<void> {
    const userData = getStoredUserData();
    if (!userData?.token || !process.env.NEXT_PUBLIC_API_URL) return;

    setDeletingId(repoId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repos/${repoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      if (!res.ok) return;

      // optimistically remove from list
      setRecentRepos((prev) => prev.filter((r) => r._id !== repoId));

      // Clear preview if it was showing this repo
      setGeneratedReadme((prev) => prev);

      // refresh stats
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/repos`, {
        headers: { Authorization: `Bearer ${userData.token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats ?? stats);
        setRecentRepos((data.repos ?? []).slice(0, 3));
      }
    } finally {
      setDeletingId(null);
    }
  }

  // re-runs /analyze for a card and updates the preview immediately
  async function handleRegenerateRepo(repo: StoredRepo): Promise<void> {
    const userData = getStoredUserData();
    if (!userData?.id) {
      setSubmitMessage("Please sign in before regenerating.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setSubmitMessage("API URL is not configured.");
      return;
    }

    setRegeneratingId(repo._id);
    setSubmitMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userData?.token ? { Authorization: `Bearer ${userData.token}` } : {}),
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
        setSubmitMessage(data?.error || data?.message || `Failed to regenerate ${repo.Name}.`);
        return;
      }

      const nextReadme = extractReadme(data);
      if (!nextReadme) {
        setSubmitMessage(`Regeneration completed for ${repo.Name}, but no README content was returned.`);
        return;
      }

      // show updated preview
      setGeneratedReadme(nextReadme);
      setGeneratedRepoName(extractGeneratedRepoName(data, repo.Name));
      setSubmitMessage("README generated successfully.");
      setRecentRepos((prev) => prev.map((entry) => (
        entry._id === repo._id
          ? { ...entry, Readme: nextReadme, UpdatedAt: new Date().toISOString() }
          : entry
      )));
    } finally {
      setRegeneratingId(null);
    }
  }


  return (
    <div className="flex h-screen w-full bg-[#13111e] font-mono overflow-hidden relative">

      {/* bg glows */}
      <div className="pointer-events-none absolute -top-20 right-[-60px] w-[340px] h-[340px] rounded-full bg-[#1d9e75] opacity-[0.15]" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[160px] w-[300px] h-[300px] rounded-full bg-[#534ab7] opacity-[0.13]" />
      <div className="pointer-events-none absolute bottom-[-60px] right-[80px] w-[260px] h-[260px] rounded-full bg-[#1d9e75] opacity-[0.2]" />

      {/* ----------------------------------------------------------------
          Sidebar
      ---------------------------------------------------------------- */}
      <aside className="flex flex-col w-[220px] flex-shrink-0 bg-[#1c1a2e] border-r border-[#252240] z-10">

        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-[#252240]">
          <div className="flex flex-col justify-center gap-[3px] w-[33px] h-[32px] bg-[#1d9e75] rounded-[8px] px-[7px] flex-shrink-0">
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm w-full" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-80 w-[65%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-60 w-[80%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-40 w-[50%]" />
          </div>
          <span className="text-[#eeedfe] text-[20px] font-medium tracking-tight">ReadMeMaybe</span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-[10px] pt-4 flex-1">

          {/* Dashboard - active state */}
          <div className="flex items-center gap-[10px] px-[9px] py-2 rounded-[7px] bg-[#252240] border-l-[3px] border-[#1d9e75]">
            <div className="grid grid-cols-2 gap-[2px] w-[15px] h-[15px] flex-shrink-0">
              <div className="bg-[#1d9e75] rounded-[1.5px]" /><div className="bg-[#1d9e75] rounded-[1.5px]" />
              <div className="bg-[#1d9e75] rounded-[1.5px]" /><div className="bg-[#1d9e75] rounded-[1.5px]" />
            </div>
            <span className="text-[#eeedfe] text-[13px] font-bold">Dashboard</span>
          </div>

          {/* My READMEs - links to /MyReadmes */}
          <Link href="/MyReadmes" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <div className="flex flex-col gap-[3px] w-[15px] flex-shrink-0">
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-full" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[80%]" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[65%]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">My READMEs</span>
          </Link>

          {/* About Us */}
          <Link href="/About" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="4.5" r="2.5" stroke="#7f77dd" strokeWidth="1.5" />
              <path d="M2 13c0-3.037 2.462-5.5 5.5-5.5S13 9.963 13 13" stroke="#7f77dd" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#7f77dd] text-[13px] font-medium">About Us</span>
          </Link>
        </nav>

        {/* User footer - initials avatar, display name, logout button */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#252240]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#534ab7] text-[#eeedfe] text-[12px] font-medium flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#eeedfe] text-[13px] font-medium leading-tight truncate">{displayName}</p>
          </div>
          {/* Logout - clears session and redirects to /Login */}
          <button
            onClick={() => { localStorage.removeItem("user_data"); window.location.href = "/Login"; }}
            title="Log out"
            className="text-[#7f77dd] hover:text-[#e0a4be] transition flex-shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>


      {/* ----------------------------------------------------------------
          Main content area
      ---------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col px-8 pt-8 pb-6 overflow-y-auto relative bg-gradient-to-br from-[#0f7f5f40] via-transparent to-[#1c1530]">

        {/* Page header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-[#eeedfe] text-[24px] font-medium leading-tight">Dashboard</h1>
            <p className="text-[#7f77dd] text-[13px] mt-1">Welcome back, {welcomeName}</p>
          </div>
        </div>

        {/* stat cards: live data from /api/repos */}
        <div className="grid grid-cols-3 gap-3 mb-7">

          {/* READMEs generated: repos with non-empty Readme */}
          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              READMEs<br />Generated
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">
              {isLoadingActivity ? "-" : stats.totalReadmes}
            </p>
            <p className="text-[#5dcaa5] text-[10px] mt-1">
              {isLoadingActivity ? "" : `+${stats.thisWeekCount} this week`}
            </p>
          </div>

          {/* Total repos analyzed */}
          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              Repos<br />Analyzed
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">
              {isLoadingActivity ? "-" : stats.totalRepos}
            </p>
            <p className="text-[#afa9ec] text-[10px] mt-1">all time</p>
          </div>

          {/* Last generated: date of the most recently updated repo */}
          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              Last<br />Generated
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">
              {isLoadingActivity
                ? "-"
                : recentRepos.length > 0
                ? new Date(recentRepos[0].UpdatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : "-"}
            </p>
            <p className="text-[#afa9ec] text-[10px] mt-1">
              {isLoadingActivity
                ? ""
                : recentRepos.length > 0
                ? recentRepos[0].Name
                : "no activity yet"}
            </p>
          </div>
        </div>


        {/* submit a repo: connected repo shelf + manual URL */}
        <div className="mb-7">
          <div className="mb-3 max-w-[980px] flex items-end justify-between gap-4">
            <div>
              <p className="text-[#eeedfe] text-[16px] font-medium">Submit a repo</p>
              <p className="mt-1 text-[12px] text-[#7f77dd]">Choose from your connected GitHub projects or paste a URL manually.</p>
            </div>
            <div className="rounded-full border border-[#2f2952] bg-[#151225] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#7f77dd] flex-shrink-0">
              {githubRepos.length} connected
            </div>
          </div>

          <div className="max-w-[980px] rounded-[24px] border border-[#30295a] bg-[linear-gradient(180deg,rgba(30,27,53,0.96),rgba(17,14,30,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#7f77dd]">Connected GitHub repos</p>
                    <p className="mt-1 text-[12px] text-[#afa9ec]">Pick a repo tile to fill the URL automatically.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-full max-w-[250px]">
                    <input
                      type="text"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search owner, repo, or language"
                      className="w-full rounded-[12px] border border-[#332d59] bg-[#141125] px-3 py-2 text-[12px] text-[#eeedfe] placeholder:text-[#5c5686] outline-none transition focus:border-[#7f77dd]"
                    />
                  </div>
                  </div>
                </div>

                <div className="grid max-h-[292px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {isLoadingRepos && [0, 1, 2, 3].map((index) => (
                    <div key={index} className="h-[96px] animate-pulse rounded-[18px] border border-[#2a2447] bg-[#151225]" />
                  ))}

                  {!isLoadingRepos && filteredGithubRepos.map((repo) => {
                    const isActive = selectedRepoUrl === repo.htmlUrl;
                    return (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => {
                          setSelectedRepoUrl(repo.htmlUrl);
                          setRepoUrl(repo.htmlUrl);
                          setSubmitMessage("");
                        }}
                        className={`group relative overflow-hidden rounded-[18px] border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-[#7f77dd] bg-[linear-gradient(135deg,rgba(90,83,183,0.24),rgba(29,158,117,0.14))] shadow-[0_18px_40px_rgba(33,23,73,0.35)]"
                            : "border-[#2c264b] bg-[#141125] hover:border-[#1d9e75]"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium text-[#f6f4ff]">{repo.name}</p>
                            <p className="truncate text-[11px] text-[#7f77dd]">{repo.fullName}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${
                            repo.private
                              ? "border-[#7a3a57] bg-[#2f1b28] text-[#e0a4be]"
                              : "border-[#255246] bg-[#132820] text-[#9fe1cb]"
                          }`}>
                            {repo.visibility}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#afa9ec]">
                          <span className="rounded-full bg-[#201c35] px-2 py-1">{repo.language || "Unknown"}</span>
                          <span className="text-[#5dcaa5]">{isActive ? "Selected" : "Tap to use"}</span>
                        </div>
                      </button>
                    );
                  })}

                  {!isLoadingRepos && filteredGithubRepos.length === 0 && (
                    <div className="rounded-[18px] border border-dashed border-[#3a3463] bg-[#131021] px-4 py-6 text-[12px] text-[#afa9ec] md:col-span-2">
                      No connected repos match that search.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-[#2b2547] bg-[#131021] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7f77dd]">Selection</p>
                <div className="mt-3 rounded-[18px] border border-[#302a54] bg-[#171328] p-4">
                  {selectedGithubRepo ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[20px] font-medium text-[#f6f4ff]">{selectedGithubRepo.name}</h3>
                          <p className="mt-1 text-[12px] text-[#7f77dd]">{selectedGithubRepo.fullName}</p>
                        </div>
                        <span className="rounded-full border border-[#2b6b59] bg-[#163229] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#9fe1cb]">
                          ready
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#221d38] px-2.5 py-1 text-[11px] text-[#afa9ec]">{selectedGithubRepo.visibility}</span>
                        <span className="rounded-full bg-[#221d38] px-2.5 py-1 text-[11px] text-[#afa9ec]">{selectedGithubRepo.language || "Unknown language"}</span>
                      </div>
                      <p className="mt-4 break-all text-[12px] leading-6 text-[#c8c2ef]">{selectedGithubRepo.htmlUrl}</p>
                    </>
                  ) : (
                    <div className="py-8">
                      <p className="text-[18px] font-medium text-[#eeedfe]">No repo selected</p>
                      <p className="mt-2 max-w-[260px] text-[12px] leading-6 text-[#afa9ec]">
                        Pick one from the shelf to seed the generation flow, or paste a repo URL manually.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <input
                    type="text"
                    placeholder="https://github.com/user/repo-name"
                    value={repoUrl}
                    onChange={(e) => { setRepoUrl(e.target.value); setSelectedRepoUrl(""); }}
                    className="flex-1 rounded-[14px] border border-[#332d59] bg-[#141125] px-4 py-3 text-[12px] text-[#eeedfe] placeholder:text-[#5c5686] outline-none transition focus:border-[#7f77dd]"
                  />
                  <button
                    onClick={handleGenerateReadme}
                    disabled={isSubmitting}
                    className="rounded-[14px] bg-[linear-gradient(135deg,#6258c4,#534ab7)] px-6 py-3 text-[14px] font-medium text-[#eeedfe] shadow-[0_18px_40px_rgba(83,74,183,0.35)] transition hover:translate-y-[-1px] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Generating..." : "Generate README"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {submitMessage && (
            <p className={`mt-2 text-[12px] ${isSubmitMessageError ? "text-[#e0a4be]" : "text-[#afa9ec]"}`}>
              {submitMessage}
            </p>
          )}
        </div>


        {/* inline README preview: shown after generation */}
        {generatedReadme && (
          <div className="mb-7 overflow-hidden rounded-[28px] border border-[#30295a] bg-[linear-gradient(180deg,rgba(29,26,46,0.97),rgba(15,13,27,0.99))] shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
            <div className="border-b border-[#262141] bg-[linear-gradient(90deg,rgba(24,20,40,0.98),rgba(20,26,35,0.9))] px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7f77dd]">Generated README</p>
                  <h3 className="mt-2 text-[30px] font-medium tracking-tight text-[#f6f4ff]">{generatedRepoName || "Preview"}</h3>
                  <p className="mt-2 max-w-[620px] text-[12px] leading-6 text-[#afa9ec]">
                    Review the generated markdown in a reading-first layout, then copy it directly into the repository.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-[#255246] bg-[#132820] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#9fe1cb]">
                    Markdown ready
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(generatedReadme)}
                    className="rounded-[12px] border border-[#3a336f] bg-[#201c35] px-4 py-2.5 text-[12px] text-[#eeedfe] transition hover:border-[#7f77dd]"
                  >
                    Copy Markdown
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[0.26fr_0.74fr]">
              <aside className="border-r border-[#262141] bg-[#131021] px-5 py-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7f77dd]">Document map</p>
                <div className="mt-4 space-y-2">
                  {generatedReadme.split(/\r?\n/).filter((line) => /^#{1,3}\s/.test(line)).map((line) => {
                    const depth = line.match(/^#+/)?.[0].length || 1;
                    const label = line.replace(/^#{1,3}\s+/, "");
                    return (
                      <a
                        key={slugifyRepoLabel(`${depth}-${label}`)}
                        href={`#${slugifyRepoLabel(label)}`}
                        className={`block rounded-[10px] px-3 py-2 text-[12px] transition hover:bg-[#1b1730] ${
                          depth === 1 ? "text-[#f6f4ff]" : depth === 2 ? "pl-5 text-[#c8c2ef]" : "pl-7 text-[#9e97c9]"
                        }`}
                      >
                        {label}
                      </a>
                    );
                  })}
                  {!generatedReadme.split(/\r?\n/).some((line) => /^#{1,3}\s/.test(line)) && (
                    <p className="text-[12px] leading-6 text-[#7f77dd]">No section headings were found in this README.</p>
                  )}
                </div>
              </aside>

              <div className="max-h-[720px] overflow-y-auto px-6 py-7">
                <article className="mx-auto flex max-w-[760px] flex-col gap-5">
                  {renderMarkdownViewer(generatedReadme).map((block, index) => (
                    <div key={`md-${index}`} id={block.anchor}>
                      {block.node}
                    </div>
                  ))}
                </article>
              </div>
            </div>
          </div>
        )}

        {/* recent activity: live StoredRepo cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#eeedfe] text-[16px] font-medium">Recent activity</p>
            {/* View All links to the My READMEs page */}
            <Link href="/MyReadmes" className="text-[#7f77dd] text-[12px] hover:text-[#afa9ec] transition">
              View All
            </Link>
          </div>

          {/* Loading skeleton */}
          {isLoadingActivity && (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-4 animate-pulse">
                  <div className="h-4 bg-[#252240] rounded w-[60%] mb-2" />
                  <div className="h-3 bg-[#252240] rounded w-[80%] mb-4" />
                  <div className="h-3 bg-[#252240] rounded w-[40%]" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoadingActivity && recentRepos.length === 0 && (
            <p className="text-[#7f77dd] text-[13px]">No repos yet - generate your first README above!</p>
          )}


          {/* live repo cards: 3-col grid matching stat cards */}
          {!isLoadingActivity && recentRepos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {recentRepos.map((repo) => {
                // language tags from metadata
                const languages: string[] = repo.Metadata?.languages?.length
                  ? repo.Metadata.languages.slice(0, 3)
                  : repo.Metadata?.language
                  ? [repo.Metadata.language]
                  : [];

                const hasReadme = Boolean(repo.Readme && repo.Readme.trim());
                const generationNumber = Math.max(0, Number(repo.GenerationNumber || 0));
                const failureReason = extractReadmeFailureReason(repo, repo.Name);

                return (
                  <div
                    key={repo._id}
                    onClick={() => { window.location.href = `/MyReadmes?open=${repo._id}`; }}
                    className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-4 flex items-start justify-between cursor-pointer hover:border-[#1d9e75] transition"
                  >
                    {/* Left: repo name, URL, language tags */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#eeedfe] text-[16px] font-medium mb-1 truncate">{repo.Name}</p>
                      <p className="text-[#7f77dd] text-[10px] truncate w-[200px] mb-3">
                        {repo.RemoteUrl.replace(/^https?:\/\//, "")}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {languages.map((lang) => (
                          <span key={lang} className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: status badge, timestamp, view button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                      {hasReadme ? (
                        <span className="bg-[#9fe1cb] border border-[#085041] border-[0.5px] text-[#085041] text-[8px] font-medium px-2 py-0.5 rounded-full">
                          Done
                        </span>
                      ) : (
                        <span className="bg-[#3a1f2c] border border-[#7a3a57] border-[0.5px] text-[#e0a4be] text-[8px] font-medium px-2 py-0.5 rounded-full">
                          Failed
                        </span>
                      )}
                      <p className="text-[#7f77dd] text-[8px]">{timeAgo(repo.UpdatedAt)}</p>
                      <p className="text-[#afa9ec] text-[8px]">v{generationNumber}</p>
                      {/* Action buttons row - View, Regenerate, Delete */}
                      <div className="flex gap-1.5">
                        {/* View README - navigates to MyReadmes with this repo expanded */}
                        <button
                          disabled={!hasReadme}
                          onClick={(e) => { e.stopPropagation(); if (hasReadme) window.location.href = `/MyReadmes?open=${repo._id}`; }}
                          className={`text-[11px] font-medium px-2.5 py-1.5 rounded-[5px] border border-[0.5px] transition ${
                            hasReadme
                              ? "bg-[#252240] border-[#3c3489] text-[#eeedfe] hover:border-[#7f77dd]"
                              : "bg-[#1c1a2d] border-[#676670] text-[#676670] cursor-not-allowed"
                          }`}
                        >
                          View
                        </button>
                        {/* Regenerate - re-runs /analyze and refreshes the card */}
                        <button
                          disabled={regeneratingId === repo._id || deletingId === repo._id}
                          onClick={(e) => { e.stopPropagation(); handleRegenerateRepo(repo); }}
                          title="Regenerate README"
                          className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#5dcaa5] px-2.5 py-1.5 rounded-[5px] hover:border-[#5dcaa5] transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {regeneratingId === repo._id ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                              <path d="M13 7A6 6 0 1 1 7 1v2a4 4 0 1 0 4 4h2Z" fill="currentColor"/>
                              <path d="M7 1l2.5 2.5L7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        {/* Delete - removes the repo from the DB */}
                        <button
                          disabled={deletingId === repo._id || regeneratingId === repo._id}
                          onClick={(e) => { e.stopPropagation(); handleDeleteRepo(repo._id); }}
                          title="Delete repo"
                          className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#e0a4be] px-2.5 py-1.5 rounded-[5px] hover:border-[#e0a4be] transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingId === repo._id ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                              <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                      {!hasReadme && (
                        <p
                          className="max-w-[140px] text-right text-[8px] leading-3 text-[#e0a4be]"
                          title={failureReason}
                        >
                          {failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
