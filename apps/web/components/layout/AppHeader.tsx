"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SignOut, FolderSimple } from "@phosphor-icons/react/dist/ssr";
import { Wordmark, useToast } from "@/components/ui";
import { get, post } from "@/lib/api";

interface UserProfile {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
  };
}

export function AppHeader() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: authData } = useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: () => get<UserProfile>("/api/auth/me"),
    staleTime: 60_000,
  });

  const userIdentifier = authData?.user?.email || authData?.user?.phone || authData?.user?.name || "";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await post("/api/auth/logout", {});
      queryClient.clear();
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast("লগআউট করতে সমস্যা হয়েছে।", "error");
    }
  };

  return (
    <header className="border-b-2 border-ink bg-paper-hi sticky top-0 z-30 py-2 sm:py-3">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-3">
        {/* Left: Wordmark links to /templates */}
        <Link
          href="/templates"
          aria-label="Prochar Studio — টেমপ্লেট গ্যালারি"
          className="inline-flex items-center min-h-12 py-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <Wordmark />
        </Link>

        {/* Right: Username, My Posters link, Logout button */}
        <div className="flex items-center gap-2 sm:gap-4">
          {userIdentifier && (
            <span
              title={userIdentifier}
              className="hidden md:inline font-mono text-xs text-ink/75 truncate max-w-[200px]"
            >
              {userIdentifier}
            </span>
          )}

          <Link
            href="/posters"
            className="inline-flex items-center gap-1.5 min-h-12 px-3 py-2 font-body text-sm font-semibold text-ink hover:text-press-red border border-transparent hover:border-ink/20 rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink transition-colors"
          >
            <FolderSimple size={18} weight="bold" />
            <span>আমার পোস্টার</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="লগআউট"
            className="inline-flex items-center gap-1.5 min-h-12 px-3 py-2 border border-ink rounded bg-paper hover:bg-lime-wash font-body text-sm font-semibold text-ink transition-[transform,box-shadow] duration-[80ms] active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <SignOut size={16} weight="bold" />
            <span className="hidden xs:inline">লগআউট</span>
          </button>
        </div>
      </div>
    </header>
  );
}
