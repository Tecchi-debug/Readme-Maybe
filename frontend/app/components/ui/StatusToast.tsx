"use client";

import { useEffect } from "react";

type StatusToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
  onDismiss: () => void;
  topClassName?: string;
};

const toneStyles: Record<NonNullable<StatusToastProps["tone"]>, string> = {
  success: "border-[#2b6b59] bg-[linear-gradient(135deg,rgba(22,50,41,0.96),rgba(19,40,32,0.98))] text-[#d8fff0]",
  error: "border-[#7a3a57] bg-[linear-gradient(135deg,rgba(58,31,44,0.96),rgba(33,17,25,0.98))] text-[#ffd2e2]",
  info: "border-[#3c3489] bg-[linear-gradient(135deg,rgba(37,34,64,0.96),rgba(24,20,40,0.98))] text-[#eeedfe]",
};

const toneAccentStyles: Record<NonNullable<StatusToastProps["tone"]>, string> = {
  success: "bg-[#5dcaa5]",
  error: "bg-[#e0a4be]",
  info: "bg-[#7f77dd]",
};

export default function StatusToast({
  message,
  tone = "info",
  onDismiss,
  topClassName = "top-6",
}: StatusToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={`pointer-events-none fixed right-6 ${topClassName} z-50 max-w-[420px]`}>
      <div className={`pointer-events-auto overflow-hidden rounded-[18px] border shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md ${toneStyles[tone]}`}>
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${toneAccentStyles[tone]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#afa9ec]">
              {tone === "success" ? "Success" : tone === "error" ? "Error" : "Update"}
            </p>
            <p className="mt-1 text-[12px] leading-6">{message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-[8px] border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#afa9ec] transition hover:border-[#7f77dd] hover:text-[#eeedfe]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
