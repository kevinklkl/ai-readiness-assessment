import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Introduction from "./pages/Introduction";
import Questionnaire from "./pages/Questionnaire";
import Dashboard from "./pages/Dashboard";
import AboutUs from "./pages/AboutUs";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Introduction} />
      <Route path={"/questionnaire"} component={Questionnaire} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route path="/about-us" component={AboutUs} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}



function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
