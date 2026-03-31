"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// -------------------------------------------------------------------------
// Team data
// -------------------------------------------------------------------------
const team = [
  { initials: "SA", name: "Santiage Aguilar", role: "Project Manager", sub: "Deployment", color: "#1d9e75", text: "#e1f5ee" },
  { initials: "RC", name: "Reyjay Collazo", role: "Project Manager", sub: "Wild Card", color: "#1d9e75", text: "#04342c" },
  { initials: "AS", name: "Aiden Sperr", role: "Frontend Developer", sub: "UI & Design", color: "#7f77dd", text: "#eeedfe" },
  { initials: "NG", name: "Nicole Gonzales", role: "Mobile Developer", sub: "iOS & Android", color: "#1d9e75", text: "#e1f5ee" },
  { initials: "KD", name: "Kiara Delgado", role: "Auth Developer", sub: "Slides", color: "#afa9ec", text: "#26215c" },
  { initials: "SY", name: "Selin Yilmaz", role: "Database Engineer", sub: "AI Engineering", color: "#7f77dd", text: "#eeedfe" },
  { initials: "WS", name: "William Sharpe", role: "AI Engineer", sub: "Generation", color: "#1d9e75", text: "#e1f5ee" },
];

// -------------------------------------------------------------------------
// AnimatedTeammateCard: each team card gets an IntersectionObserver so it
// fades in and slides up when the page loads
// -------------------------------------------------------------------------
function AnimatedTeammateCard({ member, index }: { member: typeof team[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Each card waits an extra 100ms pastd the previous one
          setTimeout(() => setVisible(true), index * 100);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="bg-[#1c1a2e] border border-[#3c3489] rounded-[12px] p-6 flex flex-col items-center text-center gap-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(24px)",
        transition: `opacity 0.55s ease ${index * 100}ms, transform 0.55s ease ${index * 100}ms`,
        borderWidth: "0.5px",
      }}
    >
      {/* Avatar circle */}
      <div
        className="flex items-center justify-center w-[56px] h-[56px] rounded-full text-[18px] font-medium flex-shrink-0"
        style={{ background: member.color, color: member.text }}
      >
        {member.initials}
      </div>

      {/* Name */}
      <p className="text-[#eeedfe] text-[15px] font-medium leading-tight">{member.name}</p>

      {/* Role */}
      <p className="text-[#7f77dd] text-[12px] font-medium">{member.role}</p>

      {/* Secondary role badge */}
      <span
        className="text-[11px] font-medium px-3 py-1 rounded-full"
        style={{
          background: member.color + "22",
          color: member.color,
          border: `0.5px solid ${member.color}55`,
        }}
      >
        {member.sub}
      </span>
    </div>
  );
}

// -------------------------------------------------------------------------
// Main page UI
// -------------------------------------------------------------------------
export default function AboutUs() {
  return (
    <div className="flex h-screen w-full bg-[#13111e] font-mono overflow-hidden relative">

      {/* ----------------------------------------------------------------
          Background Circles, same as Dashboard
      ---------------------------------------------------------------- */}
      {/* Top right circle */}
      <div className="pointer-events-none absolute -top-20 right-[-60px] w-[340px] h-[340px] rounded-full bg-[#1d9e75] opacity-[0.07]" />

      {/* ----------------------------------------------------------------
          Sidebar items, same as Dashboard
      ---------------------------------------------------------------- */}
      <aside className="relative z-10 flex flex-col w-[220px] flex-shrink-0 bg-[#1c1a2e] border-r border-[#252240]">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-[#252240]">
          <div className="flex flex-col justify-center gap-[3px] w-[33px] h-[32px] bg-[#1d9e75] rounded-[8px] px-[7px] flex-shrink-0">
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm w-full" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-80 w-[65%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-60 w-[80%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-40 w-[50%]" />
          </div>
          <span className="text-[#eeedfe] text-[20px] font-medium tracking-tight">ReadMeMaybe</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 px-[10px] pt-4 flex-1">

          {/* Inactive: Dashboard */}
          <Link href="/Dashboard" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] cursor-pointer hover:bg-[#252240]/50">
            <div className="grid grid-cols-2 gap-[2px] w-[15px] h-[15px] flex-shrink-0">
              <div className="bg-[#7f77dd] rounded-[1.5px]" />
              <div className="bg-[#7f77dd] rounded-[1.5px]" />
              <div className="bg-[#7f77dd] rounded-[1.5px]" />
              <div className="bg-[#7f77dd] rounded-[1.5px]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">Dashboard</span>
          </Link>

          {/* Inactive: My Repos */}
          <div className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] cursor-pointer hover:bg-[#252240]/50">
            <div className="flex flex-col gap-[3px] w-[15px] flex-shrink-0">
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-full" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[80%]" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[65%]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">My Repos</span>
          </div>

          {/* Active: About Us */}
          <div className="flex items-center gap-[10px] px-[7px] py-2 rounded-[4px] bg-[#252240] border-l-[3px] border-[#1d9e75]">
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="4.5" r="2.5" stroke="#1d9e75" strokeWidth="1.5" />
              <path d="M2 13c0-3.037 2.462-5.5 5.5-5.5S13 9.963 13 13" stroke="#1d9e75" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#eeedfe] text-[13px] font-bold">About Us</span>
          </div>

        </nav>

        {/* User footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#252240]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#534ab7] text-[#eeedfe] text-[12px] font-medium flex-shrink-0">
            JD
          </div>
          <p className="text-[#eeedfe] text-[13px] font-medium">Jane Doe</p>
        </div>

      </aside>

      {/* ----------------------------------------------------------------
          Main content
      ---------------------------------------------------------------- */}
      <main className="relative z-10 flex-1 flex flex-col px-8 pt-8 pb-6 overflow-y-auto bg-gradient-to-br from-[#0f7f5f40] via-transparent to-[#1c1530]">

        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-[#eeedfe] text-[24px] font-medium leading-tight">About Us</h1>
          <p className="text-[#7f77dd] text-[13px] mt-1">The team behind ReadMeMaybe</p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#252240] mb-8" />

        {/* Intro text */}
        <p className="text-[#afa9ec] text-[13px] leading-relaxed max-w-[600px] mb-10">
          We&apos;re a team of seven UCF students building ReadMeMaybe!
        </p>

        {/* Team grid w/ animation */}
        <div className="grid grid-cols-4 gap-4">
          {team.map((member, i) => (
            <AnimatedTeammateCard key={member.initials} member={member} index={i} />
          ))}
        </div>

      </main>

    </div>
  );
}
