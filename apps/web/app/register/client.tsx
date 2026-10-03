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
import { authMessages, commonMessages } from "@/messages/bn";

const RegisterFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: authMessages.nameLengthMin })
    .max(60, { message: authMessages.nameLengthMax }),
  identifier: z
    .string()
    .min(3, { message: authMessages.identifierInvalid })
    .refine(
      (val) => {
        const trimmed = val.trim();
        const isEmail = z.string().email().safeParse(trimmed).success;
        const isPhone = normalizeBangladeshiPhone(trimmed) !== null;
        return isEmail || isPhone;
      },
      { message: authMessages.identifierBangladeshiPhonePrompt }
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
      toast(authMessages.registerSuccessToast, "success");
      router.push(safeNext);
      router.refresh();
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof ApiError && err.status === 409) {
        toast(authMessages.accountConflictToast, "error");
      } else if (err instanceof ApiError && err.message) {
        toast(err.message, "error");
      } else {
        toast(authMessages.registerErrorToast, "error");
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
            <h1 className="font-display font-extrabold text-3xl text-ink">{authMessages.registerTitle}</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            <Input
              id="register-name"
              label={authMessages.nameLabel}
              helper={authMessages.nameHelperRegister}
              bangla
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              id="register-identifier"
              label={authMessages.identifierLabel}
              helper={authMessages.identifierHelperRegister}
              type="text"
              autoComplete="username"
              error={errors.identifier?.message}
              {...register("identifier")}
            />

            <Input
              id="register-password"
              label={authMessages.passwordLabel}
              helper={authMessages.passwordHelper}
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
              {authMessages.registerSubmit}
            </Button>
          </form>

          {/* Switch link */}
          <div className="mt-6 pt-4 border-t border-ink/30 text-center">
            <Link
              href={`/login${nextUrl !== "/templates" ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="inline-flex items-center justify-center min-h-12 py-2 font-body text-sm font-semibold text-ink hover:text-press-red underline focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-mustard"
            >
              {authMessages.switchToLogin}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70">
        {commonMessages.footerCopyright}
      </footer>
    </div>
  );
}
