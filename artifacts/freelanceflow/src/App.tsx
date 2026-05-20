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
import ResumeMatch from "@/pages/ResumeMatch";
import TimeTracker from "@/pages/TimeTracker";
import Tasks from "@/pages/Tasks";
import Expenses from "@/pages/Expenses";
import Goals from "@/pages/Goals";
import Contract from "@/pages/Contract";
import Negotiate from "@/pages/Negotiate";
import SkillGap from "@/pages/SkillGap";
import DreamJob from "@/pages/DreamJob";
import Outreach from "@/pages/Outreach";
import DiscoveryQuestions from "@/pages/DiscoveryQuestions";
import ScopeCreep from "@/pages/ScopeCreep";
import LatePayment from "@/pages/LatePayment";
import LinkedInPost from "@/pages/LinkedInPost";
import CaseStudy from "@/pages/CaseStudy";
import NicheFinder from "@/pages/NicheFinder";
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
      {...(import.meta.env.PROD ? { proxyUrl: "/api/__clerk" } : {})}
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
            <Route path="/resume-match"><ProtectedRoute component={ResumeMatch} /></Route>
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
            <Route path="/time"><ProtectedRoute component={TimeTracker} /></Route>
            <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
            <Route path="/expenses"><ProtectedRoute component={Expenses} /></Route>
            <Route path="/goals"><ProtectedRoute component={Goals} /></Route>
            <Route path="/contract"><ProtectedRoute component={Contract} /></Route>
            <Route path="/negotiate"><ProtectedRoute component={Negotiate} /></Route>
            <Route path="/skill-gap"><ProtectedRoute component={SkillGap} /></Route>
            <Route path="/dream-job"><ProtectedRoute component={DreamJob} /></Route>
            <Route path="/outreach"><ProtectedRoute component={Outreach} /></Route>
            <Route path="/discovery-questions"><ProtectedRoute component={DiscoveryQuestions} /></Route>
            <Route path="/scope-creep"><ProtectedRoute component={ScopeCreep} /></Route>
            <Route path="/late-payment"><ProtectedRoute component={LatePayment} /></Route>
            <Route path="/linkedin-post"><ProtectedRoute component={LinkedInPost} /></Route>
            <Route path="/case-study"><ProtectedRoute component={CaseStudy} /></Route>
            <Route path="/niche-finder"><ProtectedRoute component={NicheFinder} /></Route>

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
