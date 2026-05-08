import { createRoot } from "react-dom/client";
import "./index.css";

// If the user is on the login screen, remove any stale local auth cache before
// the auth client module loads. This prevents bad refresh tokens from starting
// an endless refresh loop before the user can sign in again.
try {
  if (window.location.pathname === '/login') {
    Object.keys(localStorage)
      .filter((key) => /^sb-.+-auth-token$/.test(key) || key === 'supabase.auth.token')
      .forEach((key) => localStorage.removeItem(key));
    console.info('[auth] cleared local auth cache on login route');
  }
} catch (error) {
  console.warn('[auth] local auth cache cleanup skipped', error);
}

// Apply persisted journal font instantly to avoid a flash of unstyled typography.
try {
  const saved = localStorage.getItem('ef_journal_font') || 'notion';
  document.documentElement.setAttribute('data-journal-font', saved);
} catch {
  document.documentElement.setAttribute('data-journal-font', 'notion');
}

import App from "./App.tsx";
import { AuthProvider } from "@/contexts/AuthContext";
import { TradingProvider } from "@/contexts/TradingContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <TradingProvider>
      <App />
    </TradingProvider>
  </AuthProvider>
);
