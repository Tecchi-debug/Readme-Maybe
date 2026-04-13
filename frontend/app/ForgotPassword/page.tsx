"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isErrorMessage =
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("error");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setMessage("API URL is not configured.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email }),
      });

      const data = await response.json();
      setMessage(data?.message || "If that email exists, a reset link has been sent.");
    } catch {
      setMessage("Password reset request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08071a] px-6 py-10 font-mono text-[#EEEDFE]">
      <div className="w-full max-w-[520px] rounded-[24px] border border-[#252240] bg-[#1c1a2e] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <p className="text-sm uppercase tracking-[0.2em] text-[#7F77DD]">Password Reset</p>
        <h1 className="mt-3 text-[32px] leading-tight tracking-tight">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-[#AFA9EC]">
          Enter the email address tied to your account and we&apos;ll send you a reset link.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm tracking-wide text-[#AFA9EC]">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#3C3489] bg-[#151225] px-4 py-3 text-[#EEEDFE] placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-2"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#1D8E75] px-4 py-3 text-lg transition hover:bg-[#23b184] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>

          {message && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${
              isErrorMessage
                ? "border-red-400/50 bg-red-500/10 text-red-200"
                : "border-[#1D9E75]/50 bg-[#1D9E75]/10 text-green-200"
            }`}>
              {message}
            </div>
          )}
        </form>

        <div className="mt-6 text-sm text-[#7F77DD]">
          <Link href="/Login" className="transition hover:text-[#AFA9EC]">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
