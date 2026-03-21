/**
 * Search folder page displaying search messages.
 * @module app/(private)/mail/search/page
 */

"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageList } from "@/components/mail/message-list";

// Mock search results
const mockResults = [
  {
    _id: "search-1",
    from: { name: "GitHub", address: "noreply@github.com" },
    subject: "[hustlemail/api] Pull request #42: Add spam detection",
    snippet: "mergify[bot] merged 1 commit into main from feature/spam-detection...",
    date: Date.now() - 1000 * 60 * 15,
    isRead: true,
    isStarred: true,
    labels: ["Work"],
    attachments: [],
  },
  {
    _id: "search-2",
    from: { name: "Linear", address: "notifications@linear.app" },
    subject: "Issue CM-89: Spam filter improvements needed",
    snippet: "The current spam detection is flagging too many legitimate emails...",
    date: Date.now() - 1000 * 60 * 60 * 24 * 3,
    isRead: true,
    isStarred: false,
    labels: ["Work"],
    attachments: [],
  },
  {
    _id: "search-3",
    from: { name: "Alex Thompson", address: "alex@example.com" },
    subject: "Re: Spam detection feature spec",
    snippet: "I reviewed the spec for the spam detection feature. Here are my thoughts...",
    date: Date.now() - 1000 * 60 * 60 * 24 * 7,
    isRead: true,
    isStarred: false,
    labels: [],
    attachments: [{ filename: "spam-spec-v2.pdf" }],
  },
];

const searchFilters = [
  { label: "from:", example: "from:alex@example.com" },
  { label: "to:", example: "to:me" },
  { label: "subject:", example: "subject:meeting" },
  { label: "has:attachment", example: "has:attachment" },
  { label: "is:unread", example: "is:unread" },
  { label: "is:starred", example: "is:starred" },
  { label: "after:", example: "after:2024/01/01" },
  { label: "before:", example: "before:2024/12/31" },
];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialQuery ? mockResults : []);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches] = useState(["spam detection", "from:github.com", "is:unread"]);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    // Simulate search
    await new Promise((r) => setTimeout(r, 300));
    setResults(mockResults);
    setIsSearching(false);
    
    // Update URL
    router.push(`/mail/search?q=${encodeURIComponent(q)}`);
  }, [router]);

  const handleSelect = (id: string) => {
    router.push(`/mail/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(query);
    }
  };

  const addFilter = (filter: string) => {
    setQuery((q) => (q ? `${q} ${filter}` : filter));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search emails... (try: from:github.com or has:attachment)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-9 font-mono text-sm"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Search filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {searchFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.label}
                  onClick={() => addFilter(filter.label)}
                  className="font-mono text-sm"
                >
                  {filter.example}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => handleSearch(query)} disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Quick:</span>
          {recentSearches.map((search) => (
            <Badge
              key={search}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 font-mono text-xs"
              onClick={() => {
                setQuery(search);
                handleSearch(search);
              }}
            >
              {search}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {results.length > 0 ? (
          <>
            <div className="px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
              {results.length} results for "{query}"
            </div>
            <MessageList
              messages={results}
              onSelect={handleSelect}
            />
          </>
        ) : query ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No results found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Try different keywords or search filters
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Search your emails</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Use filters like <code className="font-mono bg-muted px-1 rounded">from:</code>,{" "}
              <code className="font-mono bg-muted px-1 rounded">has:attachment</code>, or{" "}
              <code className="font-mono bg-muted px-1 rounded">is:unread</code>
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
