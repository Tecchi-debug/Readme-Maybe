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
    <div id="accessUIDiv" className="">
      <br />
      <input
        type="text"
        id="searchText"
        placeholder="Card To Search For"
        onChange={handleSearchTextChange}
      />
      <button
        type="button"
        id="searchCardButton"
        className="buttons"
        onClick={searchCard}
      >
        {" "}
        Search Card{" "}
      </button>
      <br />
      <span id="cardSearchResult">{searchResults}</span>
      <p id="cardList"></p>
      <br />
      <br />
      <input
        type="text"
        id="cardText"
        placeholder="Card To Add"
        onChange={handleCardTextChange}
      />
      <button
        type="button"
        id="addCardButton"
        className="buttons"
        onClick={addCard}
      >
        {" "}
        Add Card{" "}
      </button>
      <br />
      <span id="cardAddResult">{message}</span>
    </div>
  );
}
export default CardUI;
