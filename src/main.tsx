import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { TradingProvider } from "@/contexts/TradingContext";

createRoot(document.getElementById("root")!).render(
  <TradingProvider>
    <App />
  </TradingProvider>
);
