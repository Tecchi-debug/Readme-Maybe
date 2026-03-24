"use client";

import Image from "next/image";
import React, { useState } from "react";

function Login() {
    const [message, setMessage] = useState("");
    const [isCreateAccount, setIsCreateAccount] = useState(false);
    const [fullName, setFullName] = useState("");
    const [loginName, setLoginName] = React.useState("");
    const [loginPassword, setPassword] = React.useState("");

    function handleSetFullName(e: any): void {
        setFullName(e.target.value);
    }
    function handleSetLoginName(e: any): void {
        setLoginName(e.target.value);
    }
    function handleSetPassword(e: any): void {
        setPassword(e.target.value);
    }

    async function doLogin(event: any): Promise<void> {
        event.preventDefault();

        var obj = { login: loginName, password: loginPassword };
        var js = JSON.stringify(obj);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
                method: "POST",
                body: js,
                headers: { "Content-Type": "application/json" },
            });

            var res = JSON.parse(await response.text());

            if (res.id <= 0) {
                setMessage("User/Password combination incorrect");
            } else {
                var user = {
                    firstName: res.firstName,
                    lastName: res.lastName,
                    id: res.id,
                };
                localStorage.setItem("user_data", JSON.stringify(user));

                setMessage("");
                window.location.href = "/PageCard";
            }
        } catch (error: any) {
            alert(error.toString());
            return;
        }
    }

    async function handleAuthSubmit(event: any): Promise<void> {
        if (isCreateAccount) {
            event.preventDefault();
            setMessage("Not yet implemented.");
            return;
        }

        await doLogin(event);
    }

    return (
        <div className="grid h-screen w-full grid-cols-[57%_43%] overflow-hidden font-mono">
            {/* Description */}
            <section className="relative h-full overflow-hidden border-r border-[#252240] bg-[#08071a] text-[#EEEDFE]">
                {/* Circle */}
                <div className="absolute -left-20 bottom-14 h-70 w-70 rounded-full bg-[#534AB7]/12" />

                {/* content */}
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

                    {/* badge */}
                    <div className="mt-6">
                        <span className="inline-flex rounded-full border bg-[#1c1a2e] border-[#534AB7]/40 px-3 py-1 text-[10px] text-[#7F77DD] sm:px-4 sm:text-xs md:text-sm">
                            pre-v1.0 - AI-powered ReadMe’s
                        </span>
                    </div>

                    {/* hero text */}
                    <div className="mt-6 space-y-3">
                        <h1 className="text-2xl leading-tight tracking-tight sm:text-3xl sm:leading-10 md:text-[30px]">
                            <div>Give your repositories</div>
                            <div className="text-[#1D9E75]">descriptive ReadMe’s</div>
                            <div>in seconds</div>
                        </h1>

                        <p className="max-w-62.5 pt-3 text-sm leading-5 text-[#7F77DD] sm:text-base sm:leading-6 md:text-[17px]">
                            Paste a GitHub URL and let AI analyze your codebase and generate a
                            polished README, ready to display.
                        </p>
                    </div>

                    {/* features */}
                    <div className="mt-8 grid max-w-72.5 gap-14 text-sm leading-5 sm:text-base sm:leading-6 md:text-lg">
                        <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
                            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#1D9E75]" />
                            <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                                <span className="font-semibold text-[#EEEDFE]">
                                    Smart structure detection
                                </span>{" "}
                                — scans folders, files, and dependencies automatically.
                            </p>
                        </div>

                        <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
                            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#7F77DD]" />
                            <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                                <span className="font-semibold text-[#EEEDFE]">
                                    Markdown output
                                </span>{" "}
                                — copy, preview, or export your README instantly.
                            </p>
                        </div>

                        <div className="grid h-16 grid-cols-[10px_1fr] items-start gap-4">
                            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#534AB7]" />
                            <p className="text-xs text-[#afa9ec] sm:text-sm md:text-[15px]">
                                <span className="font-semibold text-[#EEEDFE]">
                                    Version history
                                </span>{" "}
                                — every generation is saved so you can compare and restore.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Login Logic */}
            <div className="h-full">
                <section className="relative h-full overflow-hidden bg-[#08071a] text-[#EEEDFE]">
                    {/* Circle */}
                    <div className="pointer-events-none absolute left-20 -top-38 h-98 w-98 rounded-full bg-[#141D25]" />

                    {/* Content */}
                    <div className="relative flex h-full flex-col px-14 pt-25 py-8 max-w-135">
                        <h2 className="text-2xl  font-mono tracking-tight">
                            {isCreateAccount ? "Hello, new user" : "Welcome back"}
                        </h2>
                        <p className="mt-2 text-base text-[#7F77DD]">
                            {isCreateAccount ? "Create a new account to continue" : "Sign in to your account to continue"}
                        </p>

                        <div className="mt-8 grid grid-cols-2 rounded-xl border border-[#252240] bg-[#1c1a2e] p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreateAccount(false);
                                    setMessage("");
                                }}
                                className={`rounded-lg px-4 py-2 text-base font-medium transition ${
                                    !isCreateAccount
                                        ? "bg-[#5A53B7] "
                                        : "text-[#7F77DD] hover:text-[#AFA9EC]"
                                }`}
                            >
                                Sign in
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreateAccount(true);
                                    setMessage("");
                                }}
                                className={`rounded-lg px-4 py-2 text-base font-mono transition ${
                                    isCreateAccount
                                        ? "bg-[#5A53B7]"
                                        : "text-[#7F77DD] hover:text-[#AFA9EC]"
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        <form className="mt-6 space-y-5" onSubmit={handleAuthSubmit}>
                            {isCreateAccount && (
                                <div>
                                    <label className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">
                                        NAME
                                    </label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        placeholder="Your Name"
                                        value={fullName}
                                        onChange={handleSetFullName}
                                        className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3"
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="loginName" className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">
                                    EMAIL
                                </label>
                                <input
                                    type="text"
                                    id="loginName"
                                    placeholder="you@example.com"
                                    value={loginName}
                                    onChange={handleSetLoginName}
                                    className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3 "
                                />
                            </div>

                            <div>
                                <label htmlFor="loginPassword" className="mb-2 block text-sm font-mono tracking-wide text-[#AFA9EC]">
                                    PASSWORD
                                </label>
                                <input
                                    type="password"
                                    id="loginPassword"
                                    placeholder="........"
                                    value={loginPassword}
                                    onChange={handleSetPassword}
                                    className="w-full rounded-xl border border-[#3C3489] bg-[#1c1a2e] px-4 py-3 placeholder:text-[#534AB7] outline-none transition focus:border-[#7F77DD] focus:border-3"
                                />
                            </div>

                            {!isCreateAccount && (
                                <div className="-mt-1 text-right">
                                    <button type="button" className="text-sm text-[#7F77DD] hover:text-[#AFA9EC]">
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                id="loginButton"
                                className="mt-2 w-full rounded-xl bg-[#1D8E75] px-4 py-3 text-xl font-mono transition hover:bg-[#23b184] active:scale-[0.99]"
                            >
                                {isCreateAccount ? "Create Account" : "Sign in"}
                            </button>

                            <div className="flex items-center gap-3 text-sm text-[#7F77DD]">
                                <div className="h-px flex-1 bg-[#252240]" />
                                <span>or continue with</span>
                                <div className="h-px flex-1 bg-[#252240]" />
                            </div>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-[#3A336F] bg-[#1B1935] px-4 py-3 text-lg font-mono transition hover:border-[#5A53BC]"
                            >
                                Continue with Github
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-[#3A336F] bg-[#1B1935] px-4 py-3 text-lg font-mono transition hover:border-[#5A53BC]"
                            >
                                Continue with Google
                            </button>

                            <p className="pt-1 text-center text-sm text-[#7F77DD]">
                                Don&apos;t have an account? <span className="text-[#AFA9EC]">Create one free</span>
                            </p>

                            {message && (
                                <div
                                    className={`rounded-xl border px-4 py-3 text-sm ${
                                        message.includes("incorrect")
                                            ? "border-red-400/50 bg-red-500/10 text-red-200"
                                            : "border-[#7F77DD]/50 bg-[#7F77DD]/10 "
                                    }`}
                                >
                                    <span id="loginResult">{message}</span>
                                </div>
                            )}
                        </form>
                    </div>
                </section>
            </div>

            {/* <div id="loginDiv" className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border-4 border-purple-200">
                <h1 className="text-4xl font-bold text-center mb-2 text-purple-600">
                    🎴 Card Club
                </h1>
                <p className="text-center text-gray-500 mb-8 font-medium">
                    Welcome back! Let's collect some cards
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-purple-600 font-bold mb-2">👤 Username</label>
                        <input
                            type="text"
                            id="loginName"
                            placeholder="Enter your username"
                            onChange={handleSetLoginName}
                            className="w-full px-4 py-3 rounded-xl border-2 border-purple-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-pink-600 font-bold mb-2">🔐 Password</label>
                        <input
                            type="password"
                            id="loginPassword"
                            placeholder="Enter your password"
                            onChange={handleSetPassword}
                            className="w-full px-4 py-3 rounded-xl border-2 border-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        id="loginButton"
                        onClick={doLogin}
                        className="w-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 text-white font-bold py-4 rounded-xl hover:from-purple-500 hover:via-pink-500 hover:to-purple-600 shadow-lg transform hover:scale-105 transition-all active:scale-95 mt-6"
                    >
                        ✨ Log In ✨
                    </button>
                </div>

                {message && (
                    <div className={`mt-6 p-4 rounded-xl border-2 text-center font-semibold ${message.includes("incorrect")
                            ? "bg-red-50 border-red-200 text-red-600"
                            : message === ""
                                ? "bg-green-50 border-green-200 text-green-600"
                                : "bg-blue-50 border-blue-200 text-blue-600"
                        }`}>
                        <span id="loginResult">{message || "✅ Logging in..."}</span>
                    </div>
                )}
            </div> */}
        </div>
    );
}
export default Login;
