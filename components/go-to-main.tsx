"use client";

import { redirect } from "next/navigation";

export default function GoToMainButton() {
  return (
    <button
      onClick={() => redirect("/")}
      className="mb-4 border-none bg-gray-100 px-3 py-1.5 rounded cursor-pointer text-sm"
    >
      ← Retour à l’accueil
    </button>
  );
}
