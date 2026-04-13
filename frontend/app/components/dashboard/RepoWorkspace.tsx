"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";

type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  private: boolean;
  visibility: string;
  language: string | null;
};

type RepoWorkspaceProps = {
  githubRepos: GithubRepo[];
  isLoadingRepos: boolean;
  reposMessage: string;
  isRepoMessageError: boolean;
  repoSearch: string;
  setRepoSearch: Dispatch<SetStateAction<string>>;
  repoUrl: string;
  setRepoUrl: Dispatch<SetStateAction<string>>;
  selectedRepoUrl: string;
  setSelectedRepoUrl: Dispatch<SetStateAction<string>>;
  setSubmitMessage: Dispatch<SetStateAction<string>>;
  isSubmitting: boolean;
  handleGenerateReadme: () => Promise<void>;
  submitMessage: string;
  isSubmitMessageError: boolean;
  generatedReadme: string;
  generatedRepoName: string;
};

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

export default function RepoWorkspace({
  githubRepos,
  isLoadingRepos,
  reposMessage,
  isRepoMessageError,
  repoSearch,
  setRepoSearch,
  repoUrl,
  setRepoUrl,
  selectedRepoUrl,
  setSelectedRepoUrl,
  setSubmitMessage,
  isSubmitting,
  handleGenerateReadme,
  submitMessage,
  isSubmitMessageError,
  generatedReadme,
  generatedRepoName
}: RepoWorkspaceProps) {
  const filteredGithubRepos = githubRepos.filter((repo) => {
    const query = repoSearch.trim().toLowerCase();
    if (!query) return true;
    return repo.fullName.toLowerCase().includes(query) ||
      (repo.language || "").toLowerCase().includes(query) ||
      repo.visibility.toLowerCase().includes(query);
  });

  const selectedGithubRepo = githubRepos.find((repo) => repo.htmlUrl === selectedRepoUrl) || null;

  return (
    <>
      <div className="mb-7">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[#eeedfe] text-[16px] font-medium">Submit a repo</p>
            <p className="mt-1 text-[12px] text-[#7f77dd]">Choose from your connected GitHub projects or paste a URL manually.</p>
          </div>
          <div className="rounded-full border border-[#2f2952] bg-[#151225] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#7f77dd]">
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
                          : "border-[#2c264b] bg-[#141125] hover:-translate-y-[1px] hover:border-[#4a4380] hover:bg-[#18142b]"
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

              <p className={`text-[12px] ${reposMessage && isRepoMessageError ? "text-[#e0a4be]" : "text-[#7f77dd]"}`}>
                {reposMessage || "Use the shelf for a quick pick, or paste any public GitHub URL below."}
              </p>
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
    </>
  );
}
