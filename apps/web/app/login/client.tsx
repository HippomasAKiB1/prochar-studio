"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput } from "@prochar/shared";
import { Button, Input, Wordmark, useToast } from "@/components/ui";
import { post } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const nextUrl = searchParams.get("next") || "/templates";
  // Safe redirect target: must be a relative path
  const safeNext = nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/templates";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    try {
      await post<{ user: unknown }>("/api/auth/login", values);
      toast("সফলভাবে লগইন হয়েছে", "success");
      router.push(safeNext);
      router.refresh();
    } catch {
      setLoading(false);
      // Generic error message for both wrong password and unknown user
      const msg = "ইমেইল/ফোন অথবা পাসওয়ার্ড ভুল";
      toast(msg, "error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* Header */}
      <header className="border-b-2 border-ink bg-paper-hi py-3">
        <div className="mx-auto max-w-5xl px-4 flex justify-center sm:justify-start">
          <Link href="/" className="inline-flex items-center min-h-12 py-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard">
            <Wordmark />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] border-2 border-ink rounded bg-paper-hi p-6 sm:p-8 shadow-hard">
          {/* Double-ruled Title */}
          <div className="border-y-4 border-double border-ink py-2 text-center mb-6">
            <h1 className="font-display font-extrabold text-3xl text-ink">লগইন</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Input
              id="login-identifier"
              label="ইমেইল বা ফোন"
              helper="আপনার নিবন্ধিত ইমেইল বা ১১ সংখ্যার মোবাইল নম্বর"
              type="text"
              autoComplete="username"
              error={errors.identifier?.message}
              {...register("identifier")}
            />

            <Input
              id="login-password"
              label="পাসওয়ার্ড"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              প্রবেশ করুন
            </Button>
          </form>

          {/* Switch link */}
          <div className="mt-6 pt-4 border-t border-ink/30 text-center">
            <Link
              href={`/register${nextUrl !== "/templates" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="inline-flex items-center justify-center min-h-12 py-2 font-body text-sm font-semibold text-ink hover:text-press-red underline focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
            >
              নতুন অ্যাকাউন্ট? নিবন্ধন করুন
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70">
        প্রচারে: Prochar Studio · গোপনীয়তা
      </footer>
    </div>
  );
}
