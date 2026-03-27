import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import Accounts from "./pages/Accounts";
import Analytics from "./pages/Analytics";
import Psychology from "./pages/Psychology";
import Mistakes from "./pages/Mistakes";
import WeeklyPlan from "./pages/WeeklyPlan";
import DailyPlan from "./pages/DailyPlan";
import Notebook from "./pages/Notebook";
import WeeklyReview from "./pages/WeeklyReview";
import SetupPlaybook from "./pages/SetupPlaybook";
import BehaviorPatterns from "./pages/BehaviorPatterns";
import TradeQuality from "./pages/TradeQuality";
import AIInsights from "./pages/AIInsights";
import TradingRules from "./pages/TradingRules";
import BiasAnalytics from "./pages/BiasAnalytics";
import ControlCenter from "./pages/ControlCenter";
import ResearchLab from "./pages/ResearchLab";
import DailyChecklist from "./pages/DailyChecklist";
import BacktestingLab from "./pages/BacktestingLab";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/psychology" element={<Psychology />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/weekly-plan" element={<WeeklyPlan />} />
            <Route path="/daily-plan" element={<DailyPlan />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/weekly-review" element={<WeeklyReview />} />
            <Route path="/setup-playbook" element={<SetupPlaybook />} />
            <Route path="/behavior-patterns" element={<BehaviorPatterns />} />
            <Route path="/trade-quality" element={<TradeQuality />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/trading-rules" element={<TradingRules />} />
            <Route path="/bias-analytics" element={<BiasAnalytics />} />
            <Route path="/control-center" element={<ControlCenter />} />
            <Route path="/research-lab" element={<ResearchLab />} />
            <Route path="/daily-checklist" element={<DailyChecklist />} />
            
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
