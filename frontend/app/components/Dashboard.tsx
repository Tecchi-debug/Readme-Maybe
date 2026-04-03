"use client";

import Link from "next/link";
import { useState } from "react";

// -------------------------------------------------------------------------
// Main Dashboard UI
// -------------------------------------------------------------------------

export default function Dashboard() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  async function handleGenerateReadme(): Promise<void> {
    const trimmedRepoUrl = repoUrl.trim();

    if (!trimmedRepoUrl) {
      setSubmitMessage("Please enter a GitHub repo URL.");
      return;
    }

    const userDataRaw = localStorage.getItem("user_data");
    if (!userDataRaw) {
      setSubmitMessage("Please sign in before submitting a repo.");
      return;
    }

    let userId = "";
    let token = "";

    try {
      const userData = JSON.parse(userDataRaw);
      userId = userData?.id || "";
      token = userData?.token || "";
    } catch {
      setSubmitMessage("Session data is invalid. Please sign in again.");
      return;
    }

    if (!userId) {
      setSubmitMessage("Missing user id. Please sign in again.");
      return;
    }

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setSubmitMessage("API URL is not configured.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repoUrl: trimmedRepoUrl,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitMessage(data?.error || "Failed to analyze repo.");
        return;
      }

      setSubmitMessage("Repo submitted successfully.");
      setRepoUrl("");
    } catch (error) {
      setSubmitMessage(
        error instanceof Error ? error.message : "Failed to analyze repo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#13111e] font-mono overflow-hidden relative">
      
      {/* ----------------------------------------------------------------
          Background Circles
      ---------------------------------------------------------------- */}
      {/* Top right circle */}
      <div className="pointer-events-none absolute -top-20 right-[-60px] w-[340px] h-[340px] rounded-full bg-[#1d9e75] opacity-[0.07]" />

      {/* ----------------------------------------------------------------
          Sidebar
      ---------------------------------------------------------------- */}
      <aside className="flex flex-col w-[220px] flex-shrink-0 bg-[#1c1a2e] border-r border-[#252240] z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-[#252240]">
          <div className="flex flex-col justify-center gap-[3px] w-[33px] h-[32px] bg-[#1d9e75] rounded-[8px] px-[7px] flex-shrink-0">
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm w-full" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-80 w-[65%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-60 w-[80%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-40 w-[50%]" />
          </div>
          <span className="text-[#eeedfe] text-[20px] font-medium tracking-tight">
            ReadMeMaybe
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 px-[10px] pt-4 flex-1">

          {/* Active: Dashboard */}
          <div className="flex items-center gap-[10px] px-[9px] py-2 rounded-[7px] bg-[#252240] border-l-[3px] border-[#1d9e75]">
            <div className="grid grid-cols-2 gap-[2px] w-[15px] h-[15px] flex-shrink-0">
              <div className="bg-[#1d9e75] rounded-[1.5px]" />
              <div className="bg-[#1d9e75] rounded-[1.5px]" />
              <div className="bg-[#1d9e75] rounded-[1.5px]" />
              <div className="bg-[#1d9e75] rounded-[1.5px]" />
            </div>
            <span className="text-[#eeedfe] text-[13px] font-bold">Dashboard</span>
          </div>

          {/* Inactive: My Repos */}
          <div className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] cursor-pointer hover:bg-[#252240]/50">
            <div className="flex flex-col gap-[3px] w-[15px] flex-shrink-0">
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-full" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[80%]" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[65%]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">My Repos</span>
          </div>

          {/* Inactive: About Us */}
          <Link href="/About" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="4.5" r="2.5" stroke="#7f77dd" strokeWidth="1.5" />
              <path d="M2 13c0-3.037 2.462-5.5 5.5-5.5S13 9.963 13 13" stroke="#7f77dd" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#7f77dd] text-[13px] font-medium">About Us</span>
          </Link>

        </nav>

        {/* User footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#252240]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#534ab7] text-[#eeedfe] text-[12px] font-medium flex-shrink-0">
            JD
          </div>
          <div>
            <p className="text-[#eeedfe] text-[13px] font-medium leading-tight">Jane Doe</p>
          </div>
        </div>

      </aside>

      {/* ----------------------------------------------------------------
          Main content
      ---------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col px-8 pt-8 pb-6 overflow-y-auto relative bg-gradient-to-br from-[#0f7f5f40] via-transparent to-[#1c1530]">

        {/* Page header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-[#eeedfe] text-[24px] font-medium leading-tight">Dashboard</h1>
            <p className="text-[#7f77dd] text-[13px] mt-1">Welcome back, Jane</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-7">

          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              READMEs<br />Generated
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">12</p>
            <p className="text-[#5dcaa5] text-[10px] mt-1">+2 this week</p>
          </div>

          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              Repos<br />Analyzed
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">8</p>
            <p className="text-[#afa9ec] text-[10px] mt-1">2 in progress</p>
          </div>

          <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] p-4">
            <p className="text-[#7f77dd] text-[11px] font-medium uppercase tracking-wide leading-tight mb-1">
              Saved<br />Versions
            </p>
            <p className="text-[#eeedfe] text-[24px] font-medium mt-2">24</p>
            <p className="text-[#5dcaa5] text-[10px] mt-1">across all repos</p>
          </div>

        </div>

        {/* Submit a repo */}
        <div className="mb-7">
          <p className="text-[#eeedfe] text-[16px] font-medium mb-3">Submit a repo</p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="https://github.com/user/repo-name"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-2.5 text-[#3c3489] text-[12px] placeholder:text-[#3c3489] outline-none w-[285px] focus:border-[#7f77dd] transition"
            />
            <button
              onClick={handleGenerateReadme}
              disabled={isSubmitting}
              className="bg-[#534ab7] text-[#eeedfe] text-[14px] font-medium px-6 py-2.5 rounded-[10px] hover:bg-[#6258c4] transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Generating..." : "Generate README"}
            </button>
          </div>
          {submitMessage ? (
            <p className="mt-2 text-[12px] text-[#afa9ec]">{submitMessage}</p>
          ) : null}
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#eeedfe] text-[16px] font-medium">Recent activity</p>
            <button className="text-[#7f77dd] text-[12px] hover:text-[#afa9ec] transition">View All</button>
          </div>

          <div className="flex gap-3">

            {/* Repo card — Done */}
            <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-4 flex items-start justify-between w-[375px]">
              <div className="flex-1 min-w-0">
                <p className="text-[#eeedfe] text-[16px] font-medium mb-1">portfolio-site</p>
                <p className="text-[#7f77dd] text-[10px] truncate w-[200px] mb-3">
                  github.com/janedev/portfolio-site
                </p>
                <div className="flex gap-1.5">
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">React</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">TypeScript</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">Vite</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                <span className="bg-[#9fe1cb] border border-[#085041] border-[0.5px] text-[#085041] text-[8px] font-medium px-2 py-0.5 rounded-full">Done</span>
                <p className="text-[#7f77dd] text-[8px]">2 mins ago</p>
                <button className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#eeedfe] text-[14px] font-medium px-3 py-1.5 rounded-[5px] hover:border-[#7f77dd] transition">
                  View README
                </button>
              </div>
            </div>

            {/* Repo card — Processing (disabled) */}
            <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-4 flex items-start justify-between w-[375px]">
              <div className="flex-1 min-w-0">
                <p className="text-[#eeedfe] text-[16px] font-medium mb-1">express-auth-api</p>
                <p className="text-[#7f77dd] text-[10px] truncate w-[200px] mb-3">
                  github.com/janedev/express-auth-api
                </p>
                <div className="flex gap-1.5">
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">Node.js</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">Express</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">MongoDB</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] font-medium px-2 py-0.5 rounded-full">Processing</span>
                <p className="text-[#7f77dd] text-[8px]">5 mins ago</p>
                <button disabled className="bg-[#1c1a2d] border border-[#676670] border-[0.5px] text-[#676670] text-[14px] font-medium px-3 py-1.5 rounded-[5px] cursor-not-allowed">
                  View README
                </button>
              </div>
            </div>

            {/* Repo card — Done */}
            <div className="bg-[#1c1a2e] border border-[#3c3489] border-[0.5px] rounded-[10px] px-4 py-4 flex items-start justify-between w-[375px]">
              <div className="flex-1 min-w-0">
                <p className="text-[#eeedfe] text-[16px] font-medium mb-1">data-viz-dashboard</p>
                <p className="text-[#7f77dd] text-[10px] truncate w-[200px] mb-3">
                  github.com/janedev/data-viz-dashboard
                </p>
                <div className="flex gap-1.5">
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">Python</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">Flask</span>
                  <span className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#afa9ec] text-[8px] px-2 py-0.5 rounded-full">D3.js</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                <span className="bg-[#9fe1cb] border border-[#085041] border-[0.5px] text-[#085041] text-[8px] font-medium px-2 py-0.5 rounded-full">Done</span>
                <p className="text-[#7f77dd] text-[8px]">Yesterday</p>
                <button className="bg-[#252240] border border-[#3c3489] border-[0.5px] text-[#eeedfe] text-[14px] font-medium px-3 py-1.5 rounded-[5px] hover:border-[#7f77dd] transition">
                  View README
                </button>
              </div>
            </div>

          </div>
        </div>

      </main>

    </div>
  );
}
