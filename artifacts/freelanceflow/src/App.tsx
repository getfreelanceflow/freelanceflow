import { lazy, Suspense } from "react";
import { ClerkProvider, RedirectToSignIn, SignIn, SignUp, useAuth } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";

import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const ProposalNew = lazy(() => import("@/pages/ProposalNew"));
const ProposalStudio = lazy(() => import("@/pages/ProposalStudio"));
const SavedJobs = lazy(() => import("@/pages/SavedJobs"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Clients = lazy(() => import("@/pages/Clients"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Earnings = lazy(() => import("@/pages/Earnings"));
const Followups = lazy(() => import("@/pages/Followups"));
const Templates = lazy(() => import("@/pages/Templates"));
const Profile = lazy(() => import("@/pages/Profile"));
const RateCalculator = lazy(() => import("@/pages/RateCalculator"));
const CoverLetter = lazy(() => import("@/pages/CoverLetter"));
const ProposalScore = lazy(() => import("@/pages/ProposalScore"));
const ResumeMatch = lazy(() => import("@/pages/ResumeMatch"));
const TimeTracker = lazy(() => import("@/pages/TimeTracker"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Goals = lazy(() => import("@/pages/Goals"));
const Packages = lazy(() => import("@/pages/Packages"));
const Leads = lazy(() => import("@/pages/Leads"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const PublicPackage = lazy(() => import("@/pages/PublicPackage"));
const PublicProfile = lazy(() => import("@/pages/PublicProfile"));
const Contract = lazy(() => import("@/pages/Contract"));
const Negotiate = lazy(() => import("@/pages/Negotiate"));
const SkillGap = lazy(() => import("@/pages/SkillGap"));
const DreamJob = lazy(() => import("@/pages/DreamJob"));
const Outreach = lazy(() => import("@/pages/Outreach"));
const DiscoveryQuestions = lazy(() => import("@/pages/DiscoveryQuestions"));
const ScopeCreep = lazy(() => import("@/pages/ScopeCreep"));
const LatePayment = lazy(() => import("@/pages/LatePayment"));
const LinkedInPost = lazy(() => import("@/pages/LinkedInPost"));
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));
const NicheFinder = lazy(() => import("@/pages/NicheFinder"));
const Contact = lazy(() => import("@/pages/Contact"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </Layout>
  );
}

function PublicLazy({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
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
        <LanguageProvider>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/pricing"><PublicLazy component={Pricing} /></Route>
            <Route path="/contact"><PublicLazy component={Contact} /></Route>
            <Route path="/p/:slug"><PublicLazy component={PublicPackage} /></Route>
            <Route path="/u/:slug"><PublicLazy component={PublicProfile} /></Route>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/jobs"><ProtectedRoute component={Jobs} /></Route>
            <Route path="/resume-match"><ProtectedRoute component={ResumeMatch} /></Route>
            <Route path="/jobs/:id"><ProtectedRoute component={JobDetail} /></Route>
            <Route path="/proposals"><ProtectedRoute component={Proposals} /></Route>
            <Route path="/proposals/new"><ProtectedRoute component={ProposalNew} /></Route>
            <Route path="/studio"><ProtectedRoute component={ProposalStudio} /></Route>
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
            <Route path="/packages"><ProtectedRoute component={Packages} /></Route>
            <Route path="/leads"><ProtectedRoute component={Leads} /></Route>
            <Route path="/reviews"><ProtectedRoute component={Reviews} /></Route>
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

            <Route><PublicLazy component={NotFound} /></Route>
          </Switch>
        </TooltipProvider>
        <Toaster />
        </LanguageProvider>
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
