import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { TradingProvider } from "@/contexts/TradingContext";
import { PageVisibilityProvider } from "@/contexts/PageVisibilityContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <TradingProvider>
      <PageVisibilityProvider>
        <App />
      </PageVisibilityProvider>
    </TradingProvider>
  </AuthProvider>
);
