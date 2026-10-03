"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PasswordSchema, normalizeBangladeshiPhone } from "@prochar/shared";
import { Button, Input, Wordmark, useToast } from "@/components/ui";
import { post, ApiError } from "@/lib/api";

const RegisterFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "নাম অন্তত ২ অক্ষরের হতে হবে" })
    .max(60, { message: "নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে" }),
  identifier: z
    .string()
    .min(3, { message: "সঠিক ইমেইল বা ফোন নম্বর দিন" })
    .refine(
      (val) => {
        const trimmed = val.trim();
        const isEmail = z.string().email().safeParse(trimmed).success;
        const isPhone = normalizeBangladeshiPhone(trimmed) !== null;
        return isEmail || isPhone;
      },
      { message: "সঠিক ইমেইল বা ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)" }
    ),
  password: PasswordSchema,
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const nextUrl = searchParams.get("next") || "/templates";
  const safeNext = nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/templates";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      name: "",
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    const isEmail = values.identifier.includes("@");
    const payload = {
      name: values.name.trim(),
      email: isEmail ? values.identifier.trim().toLowerCase() : undefined,
      phone: !isEmail ? values.identifier.trim() : undefined,
      password: values.password,
    };

    try {
      await post<{ user: unknown }>("/api/auth/register", payload);
      toast("অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে", "success");
      router.push(safeNext);
      router.refresh();
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof ApiError && err.status === 409) {
        toast("এই ইমেইল বা ফোন নম্বর দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট রয়েছে", "error");
      } else if (err instanceof ApiError && err.message) {
        toast(err.message, "error");
      } else {
        toast("নিবন্ধন সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।", "error");
      }
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
            <h1 className="font-display font-extrabold text-3xl text-ink">নিবন্ধন</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Input
              id="register-name"
              label="নাম"
              helper="আপনার পূর্ণ নাম বাংলায় লিখুন"
              bangla
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              id="register-identifier"
              label="ইমেইল বা ফোন"
              helper="যেকোনো একটি দিলেই হবে"
              type="text"
              autoComplete="username"
              error={errors.identifier?.message}
              {...register("identifier")}
            />

            <Input
              id="register-password"
              label="পাসওয়ার্ড"
              helper="কমপক্ষে ৮ অক্ষর (অক্ষর ও সংখ্যা মিলিয়ে)"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              নিবন্ধন করুন
            </Button>
          </form>

          {/* Switch link */}
          <div className="mt-6 pt-4 border-t border-ink/30 text-center">
            <Link
              href={`/login${nextUrl !== "/templates" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="inline-flex items-center justify-center min-h-12 py-2 font-body text-sm font-semibold text-ink hover:text-press-red underline focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
            >
              আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন
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
