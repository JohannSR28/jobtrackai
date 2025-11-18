"use client";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { user, login, logout, loading } = useAuth();

  if (loading) return null;

  return user ? (
    <button onClick={logout}>Se déconnecter ({user.email})</button>
  ) : (
    <button onClick={login}>Se connecter avec Google</button>
  );
}
