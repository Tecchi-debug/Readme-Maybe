"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// team member data
const team = [
  { initials: "SA", name: "Santiago Aguilar", role: "Project Manager / API", color: "#1d9e75", text: "#e1f5ee" },
  { initials: "RC", name: "Reyjay Collazo", role: "Project Manager / Frontend", color: "#1d9e75", text: "#04342c" },
  { initials: "AS", name: "Aiden Sperr", role: "Frontend Developer / API", color: "#7f77dd", text: "#eeedfe" },
  { initials: "NG", name: "Nicole Gonzalez", role: "Mobile Developer", color: "#1d9e75", text: "#e1f5ee" },
  { initials: "KD", name: "Kiara Delgado", role: "Auth Developer / Slides", color: "#afa9ec", text: "#26215c" },
  { initials: "SY", name: "Selin Yilmaz", role: "Database Engineer / AI", color: "#7f77dd", text: "#eeedfe" },
  { initials: "WS", name: "William Sharpe", role: "AI Engineer", color: "#1d9e75", text: "#04342c" },
];

// fades in and slides up each card using IntersectionObserver
function AnimatedTeammateCard({ member, index }: { member: typeof team[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // stagger each card by 100ms
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
      {/* avatar */}
      <div
        className="flex items-center justify-center w-[56px] h-[56px] rounded-full text-[18px] font-medium flex-shrink-0"
        style={{ background: member.color, color: member.text }}
      >
        {member.initials}
      </div>
      <p className="text-[#eeedfe] text-[15px] font-medium leading-tight">{member.name}</p>
      {/* role badge */}
      <span
        className="text-[11px] font-medium px-3 py-1 rounded-full"
        style={{ background: member.color + "22", color: member.color, border: `0.5px solid ${member.color}55` }}
      >
        {member.role}
      </span>
    </div>
  );
}

export default function AboutUs() {

  // sidebar user info from localStorage
  const [displayName, setDisplayName] = useState("");
  const [userInitials, setUserInitials] = useState("RM");

  useEffect(() => {
    const raw = localStorage.getItem("user_data");
    if (!raw) return;
    try {
      const userData = JSON.parse(raw);
      const first = userData?.firstName || "";
      const last = userData?.lastName || "";
      if (first) {
        const initials = last ? `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() : first.charAt(0).toUpperCase();
        setDisplayName(last ? `${first} ${last}` : first);
        setUserInitials(initials || "RM");
      }
    } catch { /* ignore parse errors */ }
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#13111e] font-mono overflow-hidden relative">

      {/* bg glows */}
      <div className="pointer-events-none absolute -top-20 right-[-60px] w-[340px] h-[340px] rounded-full bg-[#1d9e75] opacity-[0.07]" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[160px] w-[300px] h-[300px] rounded-full bg-[#534ab7] opacity-[0.07]" />
      <div className="pointer-events-none absolute bottom-[-60px] right-[80px] w-[260px] h-[260px] rounded-full bg-[#1d9e75] opacity-[0.06]" />
      <div className="pointer-events-none absolute top-[40%] left-[-60px] w-[220px] h-[220px] rounded-full bg-[#7f77dd] opacity-[0.05]" />

      {/* sidebar */}
      <aside className="relative z-10 flex flex-col w-[220px] flex-shrink-0 bg-[#1c1a2e] border-r border-[#252240]">

        {/* logo */}
        <div className="flex items-center gap-3 px-5 py-[22px] border-b border-[#252240]">
          <div className="flex flex-col justify-center gap-[3px] w-[33px] h-[32px] bg-[#1d9e75] rounded-[8px] px-[7px] flex-shrink-0">
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm w-full" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-80 w-[65%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-60 w-[80%]" />
            <div className="h-[2px] bg-[#d9d9d9] rounded-sm opacity-40 w-[50%]" />
          </div>
          <span className="text-[#eeedfe] text-[20px] font-medium tracking-tight">ReadMeMaybe</span>
        </div>

        {/* nav */}
        <nav className="flex flex-col gap-1 px-[10px] pt-4 flex-1">

          {/* dashboard: inactive */}
          <Link href="/Dashboard" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] cursor-pointer hover:bg-[#252240]/50">
            <div className="grid grid-cols-2 gap-[2px] w-[15px] h-[15px] flex-shrink-0">
              <div className="bg-[#7f77dd] rounded-[1.5px]" /><div className="bg-[#7f77dd] rounded-[1.5px]" />
              <div className="bg-[#7f77dd] rounded-[1.5px]" /><div className="bg-[#7f77dd] rounded-[1.5px]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">Dashboard</span>
          </Link>

          {/* my readmes: inactive */}
          <Link href="/MyReadmes" className="flex items-center gap-[10px] px-[10px] py-2 rounded-[7px] hover:bg-[#252240]/50">
            <div className="flex flex-col gap-[3px] w-[15px] flex-shrink-0">
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-full" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[80%]" />
              <div className="h-[3px] bg-[#7f77dd] rounded-sm w-[65%]" />
            </div>
            <span className="text-[#7f77dd] text-[13px] font-medium">My READMEs</span>
          </Link>

          {/* about us: active */}
          <div className="flex items-center gap-[10px] px-[7px] py-2 rounded-[4px] bg-[#252240] border-l-[3px] border-[#1d9e75]">
            <svg className="w-[15px] h-[15px] flex-shrink-0" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="4.5" r="2.5" stroke="#1d9e75" strokeWidth="1.5" />
              <path d="M2 13c0-3.037 2.462-5.5 5.5-5.5S13 9.963 13 13" stroke="#1d9e75" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[#eeedfe] text-[13px] font-bold">About Us</span>
          </div>
        </nav>

        {/* user footer: name, initials, logout */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#252240]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[#534ab7] text-[#eeedfe] text-[12px] font-medium flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#eeedfe] text-[13px] font-medium leading-tight truncate">{displayName}</p>
          </div>
          {/* logout: clear session, redirect to /Login */}
          <button onClick={() => { localStorage.removeItem("user_data"); window.location.href = "/Login"; }} title="Log out" className="text-[#7f77dd] hover:text-[#e0a4be] transition flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* main content */}
      <main className="relative z-10 flex-1 flex flex-col px-8 pt-8 pb-6 overflow-y-auto bg-gradient-to-br from-[#0f7f5f40] via-transparent to-[#1c1530]">
        <div className="mb-2">
          <h1 className="text-[#eeedfe] text-[24px] font-medium leading-tight">About Us</h1>
          <p className="text-[#7f77dd] text-[13px] mt-1">The team behind ReadMeMaybe</p>
        </div>
        <div className="w-full h-px bg-[#252240] mb-8" />
        <p className="text-[#afa9ec] text-[13px] leading-relaxed max-w-[600px] mb-10">
          We&apos;re a team of seven UCF students building ReadMeMaybe!
        </p>
        {/* team grid with staggered fade-in */}
        <div className="grid grid-cols-4 gap-4">
          {team.map((member, i) => (
            <AnimatedTeammateCard key={member.initials} member={member} index={i} />
          ))}
        </div>
      </main>

    </div>
  );
}
