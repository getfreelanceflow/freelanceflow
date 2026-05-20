import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
      { href: "/followups", label: "Follow-ups", icon: Bell },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { href: "/cover-letter", label: "Cover Letter", icon: Mail },
      { href: "/proposal-score", label: "Score Proposal", icon: Target },
      { href: "/rate-calculator", label: "Rate Calculator", icon: Calculator },
      { href: "/templates", label: "Templates", icon: FileStack },
      { href: "/profile", label: "Profile & Bio", icon: User },
    ],
  },
];

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
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
          <span className="text-sm font-medium text-sidebar-foreground">My Account</span>
        </div>
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <span className="text-xl font-bold text-primary">FreelanceFlow.ai</span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
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
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
