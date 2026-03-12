"use client";

import React, { useState } from "react";

function Login() {
  const [message, setMessage] = useState("");
  const [loginName, setLoginName] = React.useState("");
  const [loginPassword, setPassword] = React.useState("");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div id="loginDiv" className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border-4 border-purple-200">
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
          <div className={`mt-6 p-4 rounded-xl border-2 text-center font-semibold ${
            message.includes("incorrect")
              ? "bg-red-50 border-red-200 text-red-600"
              : message === ""
              ? "bg-green-50 border-green-200 text-green-600"
              : "bg-blue-50 border-blue-200 text-blue-600"
          }`}>
            <span id="loginResult">{message || "✅ Logging in..."}</span>
          </div>
        )}
      </div>
    </div>
  );
}
export default Login;
