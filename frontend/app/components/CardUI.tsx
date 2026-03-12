"use client";

import React, { useState, useEffect } from "react";

function CardUI() {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [searchResults, setResults] = useState("");
  const [cardList, setCardList] = useState("");
  const [search, setSearchValue] = React.useState("");
  const [card, setCardNameValue] = React.useState("");

  useEffect(() => {
    const _ud = localStorage.getItem("user_data");
    if (_ud) {
      const ud = JSON.parse(_ud);
      setUserId(ud.id);
    }
  }, []);

  async function addCard(e: any): Promise<void> {
    e.preventDefault();

    let obj = { userId: userId, card: card };
    let js = JSON.stringify(obj);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/addcard`, {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      let txt = await response.text();
      let res = JSON.parse(txt);

      if (res.error.length > 0) {
        setMessage("API Error:" + res.error);
      } else {
        setMessage("Card has been added");
      }
    } catch (error: any) {
      setMessage(error.toString());
    }
  }

  async function searchCard(e: any): Promise<void> {
    e.preventDefault();

    let obj = { userId: userId, search: search };
    let js = JSON.stringify(obj);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/searchcards`, {
        method: "POST",
        body: js,
        headers: { "Content-Type": "application/json" },
      });

      let txt = await response.text();
      let res = JSON.parse(txt);
      let _results = res.results;
      let resultText = "";
      for (let i = 0; i < _results.length; i++) {
        resultText += _results[i];
        if (i < _results.length - 1) {
          resultText += ", ";
        }
      }
      setResults("Card(s) have been retrieved");
      setCardList(resultText);
    } catch (error: any) {
      alert(error.toString());
      setResults(error.toString());
    }
  }

  function handleSearchTextChange(e: any): void {
    setSearchValue(e.target.value);
  }
  function handleCardTextChange(e: any): void {
    setCardNameValue(e.target.value);
  }

  return (
    <div id="accessUIDiv" className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-purple-600">
          ✨ My Card Collection ✨
        </h1>

        {/* Search Card Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-8 border-4 border-pink-200 transform hover:scale-105 transition-transform">
          <h2 className="text-2xl font-bold text-pink-500 mb-4">🔍 Search Cards</h2>
          <div className="flex gap-3">
            <input
              type="text"
              id="searchText"
              placeholder="What card are you looking for? 🎴"
              onChange={handleSearchTextChange}
              className="flex-1 px-4 py-3 rounded-full border-2 border-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
            <button
              type="button"
              id="searchCardButton"
              onClick={searchCard}
              className="bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold py-3 px-8 rounded-full hover:from-pink-500 hover:to-pink-600 shadow-md transform hover:scale-110 transition-all active:scale-95"
            >
              Search
            </button>
          </div>
          {searchResults && (
            <div className="mt-4 p-4 bg-pink-50 rounded-2xl border-2 border-pink-200">
              <p className="text-pink-600 font-semibold">{searchResults}</p>
              {cardList && (
                <p id="cardList" className="text-purple-700 mt-2 font-medium">
                  {cardList}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Add Card Section */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border-4 border-blue-200 transform hover:scale-105 transition-transform">
          <h2 className="text-2xl font-bold text-blue-500 mb-4">➕ Add New Card</h2>
          <div className="flex gap-3">
            <input
              type="text"
              id="cardText"
              placeholder="Enter card name here! 🎨"
              onChange={handleCardTextChange}
              className="flex-1 px-4 py-3 rounded-full border-2 border-blue-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              id="addCardButton"
              onClick={addCard}
              className="bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-3 px-8 rounded-full hover:from-blue-500 hover:to-blue-600 shadow-md transform hover:scale-110 transition-all active:scale-95"
            >
              Add
            </button>
          </div>
          {message && (
            <div className={`mt-4 p-4 rounded-2xl border-2 ${
              message.includes("added") 
                ? "bg-green-50 border-green-200 text-green-600" 
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              <span id="cardAddResult" className="font-semibold">
                {message}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default CardUI;
