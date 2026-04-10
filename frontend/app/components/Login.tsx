"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

function Login() {

  // form mode: sign in or create account
  const [isCreateAccount, setIsCreateAccount] = useState(false);

  // feedback message below the form
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // create account only fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // shared fields
  const [loginName, setLoginName] = React.useState("");
  const [loginPassword, setPassword] = React.useState("");

  // input handlers
  function handleSetFirstName(e: any): void { setFirstName(e.target.value); }
  function handleSetLastName(e: any): void { setLastName(e.target.value); }
  function handleSetLoginName(e: any): void { setLoginName(e.target.value); }
  function handleSetPassword(e: any): void { setPassword(e.target.value); }

  // saves user session to localStorage and redirects to dashboard
  function completeAuth(res: any): void {
    const user = {
      firstName: res.user.FirstName,
      lastName: res.user.LastName,
      id: res.user._id,
      token: res.jwtToken,
      refreshToken: res.refreshToken,
    };
    localStorage.setItem("user_data", JSON.stringify(user));
    setMessage("");
    window.location.href = "/Dashboard";
  }

  // on mount: check for github oauth callback params in the URL
  useEffect(() => {
    const jwtToken = searchParams.get("jwtToken");
    const refreshToken = searchParams.get("refreshToken");
    const userId = searchParams.get("userId");
    const firstNameFromQuery = searchParams.get("firstName");
    const lastNameFromQuery = searchParams.get("lastName");
    const authError = searchParams.get("error");

    if (authError) {
      setMessage(authError);
      router.replace("/Login");
      return;
    }

    if (!jwtToken || !refreshToken || !userId) return;

    completeAuth({
      jwtToken,
      refreshToken,
      user: {
        _id: userId,
        FirstName: firstNameFromQuery || "",
        LastName: lastNameFromQuery || "",
      },
    });
  }, [router, searchParams]);

  // POST to /api/auth/login
  async function doLogin(event: any): Promise<void> {
    event.preventDefault();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        body: JSON.stringify({ Email: loginName, Password: loginPassword }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      if (!response.ok) { setMessage(res.message || "Login failed"); }
      else { completeAuth(res); }
    } catch (error: any) {
      alert(error.toString());
    }
  }

  // POST to /api/auth/register
  async function doRegister(event: any): Promise<void> {
    event.preventDefault();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          FirstName: firstName,
          LastName: lastName,
          Login: loginName,
          Email: loginName,
          Password: loginPassword,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await response.json();
      if (!response.ok) { setMessage(res.message || "Registration failed"); }
      else { completeAuth(res); }
    } catch (error: any) {
      alert(error.toString());
    }
  }

  // routes to the right handler based on active tab
  async function handleAuthSubmit(event: any): Promise<void> {
    if (isCreateAccount) { await doRegister(event); return; }
    await doLogin(event);
  }

  // determines styling for the feedback message box
  const isErrorMessage =
    message.toLowerCase().includes("invalid") ||
    message.toLowerCase().includes("incorrect") ||
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("in use") ||
    message.toLowerCase().includes("verify") ||
    message.toLowerCase().includes("required");


  return (
    <div className="grid h-screen w-full grid-cols-[57%_43%] overflow-hidden font-mono">

      {/* left panel: marketing/feature overview */}
      <section className="relative h-full overflow-hidden border-r border-[#252240] bg-[#08071a] text-[#EEEDFE]">

        {/* bg circle */}
        <div className="absolute -left-20 bottom-14 h-70 w-70 rounded-full bg-[#534AB7]/12" />

        <div className="relative flex h-full flex-col px-14 pt-25 py-8">

          {/* logo */}
          <div className="flex items-center gap-4">
            <Image
              src="/assets/Icon.jpg"
              alt="ReadMeMaybe logo"
              width={44}
              height={44}
              className="h-9 w-9 rounded-2xl sm:h-10 sm:w-10"
              unoptimized
              priority
            />
            <span className="mx-4 text-base font-mono tracking-tight sm:text-lg md:text-2xl">
              ReadMeMaybe
            </span>
          </div>

          {/* version badge */}
          <div className="mt-6">
            <span className="inline-flex rounded-full border bg-[#1c1a2e] border-[#534AB7]/40 px-3 py-1 text-[10px] text-[#7F77DD] sm:px-4 sm:text-xs md:text-sm">
              pre-v1.0 - AI-powered ReadMe&apos;s
            </span>
          </div>

          {/* hero heading */}
          <div className="mt-6 space-y-3">
            <h1 className="text-2xl leading-tight tracking-tight sm:text-3xl sm:leading-10 md:text-[30px]">
              <div>Give your repositories</div>
              <div className="text-[#1D9E75]">descriptive ReadMe&apos;s</div>
              <div>in seconds</div>
            </h1>
            <p className="max-w-62.5 pt-3 text-sm leading-5 text-[#7F77DD] sm:text-base sm:leading-6 md:text-[17px]">
              Paste a GitHub URL and let AI analyze your codebase and generate a
              polished README, ready to display.
            </p>
          </div>

          {/* feature bullets */}
          <div className="mt-8 grid max-w-72.5 gap-14 text-sm leading-5 sm:text-base sm:leading-6 md:text-lg">
            <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#1D9E75]" />
              <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                <span className="font-semibold text-[#EEEDFE]">Smart structure detection</span>
                {" "}scans folders, files, and dependencies automatically.
              </p>
            </div>
            <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#7F77DD]" />
              <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                <span className="font-semibold text-[#EEEDFE]">Markdown output</span>
                {" "}copy, preview, or export your README instantly.
              </p>
            </div>
            <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
              <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#534AB7]" />
              <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                <span className="font-semibold text-[#EEEDFE]">Version history</span>
                {" "}every generation is saved so you can compare and restore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* right panel: auth form */}
      <div className="h-full">
        <section className="relative h-full overflow-hidden bg-[#08071a] text-[#EEEDFE]">

          {/* bg circle */}
          <div className="pointer-events-none absolute left-20 -top-38 h-98 w-98 rounded-full bg-[#141D25]" />

          <div className="relative flex h-full flex-col px-14 pt-25 py-8 max-w-135">

            {/* heading changes based on active tab */}
            <h2 className="text-2xl font-mono tracking-tight">
              {isCreateAccount ? "Hello, new user" : "Welcome back"}
            </h2>
            <p className="mt-2 text-base text-[#7F77DD]">
              {isCreateAccount ? "Create a new account to continue" : "Sign in to your account to continue"}
            </p>

            {/* tab switcher */}
            <div className="mt-8 grid grid-cols-2 rounded-xl border border-[#252240] bg-[#1c1a2e] p-1">
              <button
                type="button"
                onClick={() => { setIsCreateAccount(false); setMessage(""); }}
                className={`rounded-lg px-4 py-2 text-base font-medium transition ${!isCreateAccount ? "bg-[#5A53B7]" : "text-[#7F77DD] hover:text-[#AFA9EC]"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setIsCreateAccount(true); setMessage(""); }}
                className={`rounded-lg px-4 py-2 text-base font-mono transition ${isCreateAccount ? "bg-[#5A53B7]" : "text-[#7F77DD] hover:text-[#AFA9EC]"}`}
              >
                Create Account
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleAuthSubmit}>

              {/* name fields: create account only */}
              {isCreateAccount && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">FIRST NAME</label>
                    <input type="text" id="firstName" placeholder="Your First Name" value={firstName} onChange={handleSetFirstName}
                      className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">LAST NAME</label>
                    <input type="text" id="lastName" placeholder="Your Last Name" value={lastName} onChange={handleSetLastName}
                      className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3" />
                  </div>
                </div>
              )}

              {/* email */}
              <div>
                <label htmlFor="loginName" className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">EMAIL</label>
                <input type="text" id="loginName" placeholder="you@example.com" value={loginName} onChange={handleSetLoginName}
                  className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3" />
              </div>

              {/* password */}
              <div>
                <label htmlFor="loginPassword" className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">PASSWORD</label>
                <input type="password" id="loginPassword" placeholder="........" value={loginPassword} onChange={handleSetPassword}
                  className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3" />
              </div>

              {/* submit */}
              <button type="submit" id="loginButton"
                className="mt-2 w-full rounded-xl bg-[#1D8E75] px-4 py-3 text-xl font-mono transition hover:bg-[#23b184] active:scale-[0.99]">
                {isCreateAccount ? "Create Account" : "Sign in"}
              </button>

              {/* oauth divider */}
              <div className="flex items-center gap-3 text-sm text-[#7F77DD]">
                <div className="h-px flex-1 bg-[#252240]" />
                <span>or continue with</span>
                <div className="h-px flex-1 bg-[#252240]" />
              </div>

              {/* github oauth */}
              <button type="button"
                onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/github`; }}
                className="w-full rounded-xl border border-[#3A336F] bg-[#1B1935] px-4 py-3 text-lg font-mono transition hover:border-[#5A53BC]">
                Continue with Github
              </button>

              {/* feedback message */}
              {message && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${isErrorMessage
                    ? "border-red-400/50 bg-red-500/10 text-red-200"
                    : "border-[#1D9E75]/50 bg-[#1D9E75]/10 text-green-200"}`}>
                  <span id="loginResult">{message}</span>
                </div>
              )}

            </form>
          </div>
        </section>
      </div>

    </div>
  );
}
export default Login;
