import { ClerkProvider, RedirectToSignIn, SignIn, SignUp, useAuth } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Proposals from "@/pages/Proposals";
import ProposalNew from "@/pages/ProposalNew";
import SavedJobs from "@/pages/SavedJobs";
import Pricing from "@/pages/Pricing";
import Clients from "@/pages/Clients";
import Invoices from "@/pages/Invoices";
import Earnings from "@/pages/Earnings";
import Followups from "@/pages/Followups";
import Templates from "@/pages/Templates";
import Profile from "@/pages/Profile";
import RateCalculator from "@/pages/RateCalculator";
import CoverLetter from "@/pages/CoverLetter";
import ProposalScore from "@/pages/ProposalScore";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl="/clerk"
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/jobs"><ProtectedRoute component={Jobs} /></Route>
            <Route path="/jobs/:id"><ProtectedRoute component={JobDetail} /></Route>
            <Route path="/proposals"><ProtectedRoute component={Proposals} /></Route>
            <Route path="/proposals/new"><ProtectedRoute component={ProposalNew} /></Route>
            <Route path="/saved"><ProtectedRoute component={SavedJobs} /></Route>
            <Route path="/clients"><ProtectedRoute component={Clients} /></Route>
            <Route path="/invoices"><ProtectedRoute component={Invoices} /></Route>
            <Route path="/earnings"><ProtectedRoute component={Earnings} /></Route>
            <Route path="/followups"><ProtectedRoute component={Followups} /></Route>
            <Route path="/templates"><ProtectedRoute component={Templates} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
            <Route path="/rate-calculator"><ProtectedRoute component={RateCalculator} /></Route>
            <Route path="/cover-letter"><ProtectedRoute component={CoverLetter} /></Route>
            <Route path="/proposal-score"><ProtectedRoute component={ProposalScore} /></Route>

            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
