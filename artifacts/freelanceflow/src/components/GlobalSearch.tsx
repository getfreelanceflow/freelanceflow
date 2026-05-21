import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { globalSearch } from "@workspace/api-client-react";

interface Hit {
  id: number;
  title: string;
  subtitle?: string | null;
  href: string;
}

interface Results {
  jobs: Hit[];
  clients: Hit[];
  invoices: Hit[];
  proposals: Hit[];
}

const EMPTY: Results = { jobs: [], clients: [], invoices: [], proposals: [] };

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          // Allow opening from our own trigger button, but not while typing in
          // unrelated inputs (e.g. Clerk's sign-in form).
          return;
        }
      }
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length === 0) {
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await globalSearch({ q: term });
        if (!cancelled) setResults(data as Results);
      } catch {
        if (!cancelled) setResults(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      navigate(href);
    },
    [navigate],
  );

  const totalHits =
    results.jobs.length +
    results.clients.length +
    results.invoices.length +
    results.proposals.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between text-muted-foreground gap-3 sm:w-80"
        onClick={() => setOpen(true)}
        data-testid="global-search-trigger"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search everything…
        </span>
        <KbdGroup className="hidden sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search jobs, clients, invoices, proposals…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {q.trim().length === 0 ? (
            <CommandEmpty>Type to search across your workspace.</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Searching…</CommandEmpty>
          ) : totalHits === 0 ? (
            <CommandEmpty>No results for "{q}".</CommandEmpty>
          ) : null}

          {results.jobs.length > 0 && (
            <CommandGroup heading="Jobs">
              {results.jobs.map((h) => (
                <CommandItem key={`job-${h.id}`} value={`job-${h.id}`} onSelect={() => go(h.href)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{h.title}</span>
                    {h.subtitle ? (
                      <span className="text-xs text-muted-foreground">{h.subtitle}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.clients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clients">
                {results.clients.map((h) => (
                  <CommandItem key={`client-${h.id}`} value={`client-${h.id}`} onSelect={() => go(h.href)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{h.title}</span>
                      {h.subtitle ? (
                        <span className="text-xs text-muted-foreground">{h.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.invoices.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Invoices">
                {results.invoices.map((h) => (
                  <CommandItem key={`inv-${h.id}`} value={`inv-${h.id}`} onSelect={() => go(h.href)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{h.title}</span>
                      {h.subtitle ? (
                        <span className="text-xs text-muted-foreground">{h.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.proposals.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Proposals">
                {results.proposals.map((h) => (
                  <CommandItem key={`p-${h.id}`} value={`p-${h.id}`} onSelect={() => go(h.href)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{h.title}</span>
                      {h.subtitle ? (
                        <span className="text-xs text-muted-foreground">{h.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
