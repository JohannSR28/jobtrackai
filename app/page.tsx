"use client";

import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

export default function HomePage() {
  const mainStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f0f2f5",
    fontFamily: "Arial, sans-serif",
  };

  const h1Style: CSSProperties = {
    color: "#333",
    marginBottom: "3rem",
  };

  const buttonContainerStyle: CSSProperties = {
    display: "flex",
    gap: "1rem",
  };

  const buttonStyle: CSSProperties = {
    padding: "1rem 2rem",
    fontSize: "1rem",
    color: "#fff",
    backgroundColor: "#0070f3",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    transition: "background-color 0.3s, transform 0.2s",
  };

  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "#005bb5";
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "#0070f3";
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "scale(0.98)";
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "scale(1)";
  };

  return (
    <main style={mainStyle}>
      <h1 style={h1Style}>Welcome to the Home Page</h1>
      <div style={buttonContainerStyle}>
        <button
          onClick={() => redirect("/auth-test-page")}
          style={buttonStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          Go to Auth Test Page
        </button>
        <button
          onClick={() => redirect("/mail-connection")}
          style={buttonStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          Connexion à la boîte mail
        </button>
        <button
          onClick={() => redirect("/scan-and-analyze")}
          style={buttonStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          Scan & Analyse automatique
        </button>
      </div>
    </main>
  );
}
