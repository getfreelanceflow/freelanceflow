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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";

interface LayoutProps {
  children: React.ReactNode;
}

const navGroups: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Work",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Job Feed", icon: Briefcase },
      { href: "/resume-match", label: "Resume Match", icon: FileSearch },
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/saved", label: "Saved Jobs", icon: Bookmark },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/earnings", label: "Earnings", icon: TrendingUp },
      { href: "/expenses", label: "Expenses", icon: Wallet },
      { href: "/followups", label: "Follow-ups", icon: Bell },
    ],
  },
  {
    label: "Productivity",
    items: [
      { href: "/time", label: "Time Tracker", icon: Clock },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/goals", label: "Goals", icon: Trophy },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { href: "/dream-job", label: "Dream Job Finder", icon: Sparkles },
      { href: "/niche-finder", label: "Niche Finder", icon: Target },
      { href: "/outreach", label: "Cold Outreach", icon: Send },
      { href: "/cover-letter", label: "Cover Letter", icon: Mail },
      { href: "/proposal-score", label: "Score Proposal", icon: Target },
      { href: "/discovery-questions", label: "Discovery Qs", icon: MessagesSquare },
      { href: "/negotiate", label: "Negotiate", icon: MessageSquare },
      { href: "/scope-creep", label: "Scope Creep", icon: Shield },
      { href: "/late-payment", label: "Chase Payment", icon: AlarmClock },
      { href: "/linkedin-post", label: "LinkedIn Posts", icon: Linkedin },
      { href: "/case-study", label: "Case Study", icon: BookOpenCheck },
      { href: "/contract", label: "Contract Gen", icon: FileSignature },
      { href: "/rate-calculator", label: "Rate Calculator", icon: Calculator },
      { href: "/skill-gap", label: "Skill Gap", icon: BookOpen },
      { href: "/templates", label: "Templates", icon: FileStack },
      { href: "/profile", label: "Profile & Bio", icon: User },
    ],
  },
];

function AccountLabel() {
  const { user } = useUser();
  const label = user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? "My Account";
  return (
    <span className="truncate text-sm font-medium text-sidebar-foreground" title={label}>
      {label}
    </span>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={() => signOut({ redirectUrl: "/" })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}

function SidebarNav() {
  const [location] = useLocation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <span className="text-xl font-bold text-primary tracking-tight">
          FreelanceFlow<span className="text-foreground">.ai</span>
        </span>
      </div>
      <nav className="flex-1 space-y-4 px-4 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
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
                    {item.label}
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
                  <span className="sr-only">Toggle navigation menu</span>
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
