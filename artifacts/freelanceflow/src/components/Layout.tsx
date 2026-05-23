import { Link, useLocation } from "wouter";
import { UserButton, useClerk, useUser } from "@clerk/react";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Bookmark,
  Menu,
  Users,
  Receipt,
  TrendingUp,
  User,
  Calculator,
  Mail,
  Bell,
  FileStack,
  Target,
  FileSearch,
  Clock,
  CheckSquare,
  Wallet,
  Trophy,
  FileSignature,
  MessageSquare,
  BookOpen,
  Sparkles,
  Send,
  MessagesSquare,
  Shield,
  AlarmClock,
  Linkedin,
  BookOpenCheck,
  Package as PackageIcon,
  PlusCircle,
  Inbox,
  MessageSquareQuote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CreditsPill from "@/components/CreditsPill";
import { CreditCard } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
}

const navGroups: { labelKey: string; items: { href: string; labelKey: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    labelKey: "nav.group.work",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/jobs", labelKey: "nav.jobFeed", icon: Briefcase },
      { href: "/resume-match", labelKey: "nav.resumeMatch", icon: FileSearch },
      { href: "/proposals", labelKey: "nav.proposals", icon: FileText },
      { href: "/saved", labelKey: "nav.savedJobs", icon: Bookmark },
      { href: "/my-jobs", labelKey: "nav.myJobs", icon: PlusCircle },
    ],
  },
  {
    labelKey: "nav.group.business",
    items: [
      { href: "/clients", labelKey: "nav.clients", icon: Users },
      { href: "/packages", labelKey: "nav.packages", icon: PackageIcon },
      { href: "/leads", labelKey: "nav.leads", icon: Inbox },
      { href: "/reviews", labelKey: "nav.reviews", icon: MessageSquareQuote },
      { href: "/invoices", labelKey: "nav.invoices", icon: Receipt },
      { href: "/earnings", labelKey: "nav.earnings", icon: TrendingUp },
      { href: "/expenses", labelKey: "nav.expenses", icon: Wallet },
      { href: "/followups", labelKey: "nav.followups", icon: Bell },
    ],
  },
  {
    labelKey: "nav.group.productivity",
    items: [
      { href: "/time", labelKey: "nav.timeTracker", icon: Clock },
      { href: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
      { href: "/goals", labelKey: "nav.goals", icon: Trophy },
    ],
  },
  {
    labelKey: "nav.group.aiTools",
    items: [
      { href: "/dream-job", labelKey: "nav.dreamJob", icon: Sparkles },
      { href: "/niche-finder", labelKey: "nav.nicheFinder", icon: Target },
      { href: "/outreach", labelKey: "nav.outreach", icon: Send },
      { href: "/cover-letter", labelKey: "nav.coverLetter", icon: Mail },
      { href: "/proposal-score", labelKey: "nav.proposalScore", icon: Target },
      { href: "/discovery-questions", labelKey: "nav.discoveryQuestions", icon: MessagesSquare },
      { href: "/negotiate", labelKey: "nav.negotiate", icon: MessageSquare },
      { href: "/scope-creep", labelKey: "nav.scopeCreep", icon: Shield },
      { href: "/late-payment", labelKey: "nav.latePayment", icon: AlarmClock },
      { href: "/linkedin-post", labelKey: "nav.linkedinPost", icon: Linkedin },
      { href: "/case-study", labelKey: "nav.caseStudy", icon: BookOpenCheck },
      { href: "/contract", labelKey: "nav.contract", icon: FileSignature },
      { href: "/rate-calculator", labelKey: "nav.rateCalculator", icon: Calculator },
      { href: "/skill-gap", labelKey: "nav.skillGap", icon: BookOpen },
      { href: "/templates", labelKey: "nav.templates", icon: FileStack },
      { href: "/profile", labelKey: "nav.profile", icon: User },
      { href: "/billing", labelKey: "nav.billing", icon: CreditCard },
      { href: "/contact", labelKey: "nav.contact", icon: Mail },
    ],
  },
];

function AccountLabel() {
  const { user } = useUser();
  const { t } = useT();
  const label = user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? t("account.myAccount");
  return (
    <span className="truncate text-sm font-medium text-sidebar-foreground" title={label}>
      {label}
    </span>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  const { t } = useT();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      <LogOut className="h-4 w-4" />
      {t("account.signOut")}
    </Button>
  );
}

function SidebarNav() {
  const [location] = useLocation();
  const { t } = useT();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold text-primary tracking-tight">
          FreelanceFlow<span className="text-foreground">.ai</span>
        </span>
      </div>
      <nav className="flex-1 space-y-4 px-4 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.labelKey} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t(group.labelKey)}
            </p>
            {group.items.map((item) => {
              const isActive =
                location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-4 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
          <AccountLabel />
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { t } = useT();
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("common.toggleNav")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 p-0 bg-sidebar border-r-sidebar-border"
              >
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <span className="text-lg font-bold text-primary">FreelanceFlow.ai</span>
          </div>
          <div className="flex-1 max-w-md md:block">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <CreditsPill />
            <LanguageSwitcher />
            <NotificationsBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
