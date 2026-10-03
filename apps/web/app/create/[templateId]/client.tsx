"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PosterFormDataSchema } from "@prochar/shared";
import { Button, Input, Textarea, Card, EmptyState, Skeleton, useToast } from "@/components/ui";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhotoUploader, type UploadedPhoto } from "@/components/poster/PhotoUploader";
import { get, post, ApiError } from "@/lib/api";
import { createMessages, navMessages, commonMessages } from "@/messages/bn";

const CreateFormSchema = PosterFormDataSchema.omit({ occasionType: true }).extend({
  consent: z.literal(true, {
    errorMap: () => ({ message: createMessages.consentError }),
  }),
});

type CreateFormValues = z.infer<typeof CreateFormSchema>;

interface TemplateDetail {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  occasionType: string;
  thumbnailUrl?: string;
  aspectRatio: string;
}

export function CreatePosterForm({ templateId }: { templateId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: template,
    isLoading,
    isError,
  } = useQuery<TemplateDetail>({
    queryKey: ["template", templateId],
    queryFn: () => get<TemplateDetail>(`/api/templates/${templateId}`),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(CreateFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      designation: "",
      partyOrOrganization: "",
      union: "",
      thana: "",
      district: "",
      headline: "",
      subtext: "",
      creditLine: "",
      consent: undefined,
    },
  });

  const consentChecked = watch("consent");

  const onSubmit = async (values: CreateFormValues) => {
    if (photos.length === 0) {
      setPhotoError(createMessages.requiredPhotoError);
      toast(createMessages.requiredPhotoError, "error");
      return;
    }
    setPhotoError(null);

    if (!template) {
      toast(createMessages.templateNotFound, "error");
      return;
    }

    setSubmitting(true);

    const payload = {
      templateId,
      formData: {
        name: values.name,
        designation: values.designation,
        partyOrOrganization: values.partyOrOrganization,
        union: values.union || undefined,
        thana: values.thana || undefined,
        district: values.district,
        occasionType: template.occasionType,
        headline: values.headline,
        subtext: values.subtext || undefined,
        creditLine: values.creditLine || undefined,
      },
      photos: photos.map((p) => ({
        url: p.url,
        publicId: p.publicId,
      })),
      consent: true as const,
    };

    try {
      const res = await post<{ id: string }>("/api/posters", payload);
      toast(createMessages.createStartedToast, "success");
      router.push(`/posters/${res.id}`);
    } catch (err: unknown) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        if (err.status === 422 || err.code === "CONTENT_REJECTED") {
          toast(createMessages.contentRejectedToast, "error");
        } else if (err.status === 403 || err.code === "PHOTO_NOT_OWNED") {
          toast(createMessages.photoNotOwnedToast, "error");
        } else if (err.status === 429) {
          toast(createMessages.rateLimitedToast, "error");
        } else {
          toast(err.message || createMessages.genericCreateError, "error");
        }
      } else {
        toast(createMessages.genericCreateError, "error");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-paper text-ink p-8">
        <div className="mx-auto max-w-4xl w-full flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-4">
        <EmptyState
          message={createMessages.templateNotFound}
          action={
            <Link href="/templates">
              <Button>{navMessages.backToGallery}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isSubmitDisabled = !isValid || !consentChecked || photos.length === 0 || submitting;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <AppHeader />

      {/* Sub Header / Breadcrumb */}
      <div className="border-b-2 border-ink bg-paper py-2 px-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 min-h-12 py-2 font-body font-semibold text-ink hover:text-press-red focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <ArrowLeft size={18} weight="bold" />
            <span>{navMessages.changeTemplate}</span>
          </Link>
          <span className="font-mono text-xs uppercase tracking-wider text-ink/75">
            TEMPLATE № {template.slug.toUpperCase().slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {/* Double-ruled Title */}
        <div className="border-y-4 border-double border-ink py-2 text-center mb-8">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink">
            {createMessages.pageTitle}
          </h1>
          <p className="font-body text-sm text-ink/80 mt-1">
            {createMessages.selectedTemplate} <span className="font-bold">{template.title}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Form (7 cols on lg) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8 pb-20 lg:pb-8">
              {/* SECTION 1: Identity */}
              <fieldset className="border-2 border-ink rounded bg-paper-hi p-5 sm:p-6 shadow-hard flex flex-col gap-4">
                <legend className="font-display font-bold text-lg text-ink px-2 bg-paper-hi border-2 border-ink rounded">
                  {createMessages.section1Title}
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="create-name"
                    label={createMessages.nameLabel}
                    bangla
                    helper={createMessages.nameHelper}
                    error={errors.name?.message}
                    {...register("name")}
                  />
                  <Input
                    id="create-designation"
                    label={createMessages.designationLabel}
                    bangla
                    helper={createMessages.designationHelper}
                    error={errors.designation?.message}
                    {...register("designation")}
                  />
                </div>

                <Input
                  id="create-org"
                  label={createMessages.orgLabel}
                  bangla
                  helper={createMessages.orgHelper}
                  error={errors.partyOrOrganization?.message}
                  {...register("partyOrOrganization")}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    id="create-union"
                    label={createMessages.unionLabel}
                    bangla
                    error={errors.union?.message}
                    {...register("union")}
                  />
                  <Input
                    id="create-thana"
                    label={createMessages.thanaLabel}
                    bangla
                    error={errors.thana?.message}
                    {...register("thana")}
                  />
                  <Input
                    id="create-district"
                    label={createMessages.districtLabel}
                    bangla
                    error={errors.district?.message}
                    {...register("district")}
                  />
                </div>
              </fieldset>

              {/* SECTION 2: Photos */}
              <fieldset className="border-2 border-ink rounded bg-paper-hi p-5 sm:p-6 shadow-hard flex flex-col gap-4">
                <legend className="font-display font-bold text-lg text-ink px-2 bg-paper-hi border-2 border-ink rounded">
                  {createMessages.section2Title}
                </legend>

                <PhotoUploader
                  photos={photos}
                  onChange={(newPhotos) => {
                    setPhotos(newPhotos);
                    if (newPhotos.length > 0) setPhotoError(null);
                  }}
                  error={photoError || undefined}
                />
              </fieldset>

              {/* SECTION 3: Headline and Message */}
              <fieldset className="border-2 border-ink rounded bg-paper-hi p-5 sm:p-6 shadow-hard flex flex-col gap-4">
                <legend className="font-display font-bold text-lg text-ink px-2 bg-paper-hi border-2 border-ink rounded">
                  {createMessages.section3Title}
                </legend>

                <Input
                  id="create-headline"
                  label={createMessages.headlineLabel}
                  bangla
                  helper={createMessages.headlineHelper}
                  error={errors.headline?.message}
                  {...register("headline")}
                />

                <Textarea
                  id="create-subtext"
                  label={createMessages.subtextLabel}
                  bangla
                  helper={createMessages.subtextHelper}
                  rows={2}
                  error={errors.subtext?.message}
                  {...register("subtext")}
                />

                <Input
                  id="create-credit"
                  label={createMessages.creditLabel}
                  bangla
                  helper={createMessages.creditHelper}
                  error={errors.creditLine?.message}
                  {...register("creditLine")}
                />
              </fieldset>

              {/* Consent Checkbox */}
              <div className="border-2 border-ink rounded bg-paper-hi p-4 shadow-hard">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <Controller
                    name="consent"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                        className="mt-1 h-5 w-5 border-2 border-ink rounded bg-paper checked:bg-press-red text-paper-hi focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mustard focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"
                      />
                    )}
                  />
                  <span className="font-body text-base font-semibold text-ink">
                    {createMessages.consentLabel}
                  </span>
                </label>
                {errors.consent && (
                  <p className="mt-2 font-body text-sm font-semibold text-press-red-deep">
                    {errors.consent.message}
                  </p>
                )}
              </div>

              {/* Desktop Submit Button */}
              <div className="hidden lg:block">
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  disabled={isSubmitDisabled}
                  className="w-full text-lg min-h-14"
                >
                  {createMessages.submitButton}
                </Button>
              </div>

              {/* Mobile Sticky Bottom Submit Bar */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-hi border-t-2 border-ink p-4 shadow-hard">
                <Button
                  type="submit"
                  size="lg"
                  loading={submitting}
                  disabled={isSubmitDisabled}
                  className="w-full text-lg min-h-14"
                >
                  {createMessages.submitButton}
                </Button>
              </div>
            </form>
          </div>

          {/* Right: Sticky Template Preview Panel (5 cols on lg) */}
          <div className="lg:col-span-5 sticky top-24 hidden lg:block">
            <Card cropMarks caption={createMessages.previewCaption} className="bg-paper-hi">
              <div className="aspect-[3/4] w-full border border-ink bg-paper overflow-hidden flex items-center justify-center mb-3">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center font-display font-bold text-ink">
                    {template.title}
                  </div>
                )}
              </div>
              <div className="border-t border-ink/40 pt-2 flex flex-col gap-1">
                <h3 className="font-display font-bold text-lg text-ink">{template.title}</h3>
                <p className="font-mono text-xs text-ink/75 uppercase">
                  {createMessages.aspectRatioPrefix} {template.aspectRatio} · 1800 × 2400 PX
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-ink bg-paper-hi py-4 text-center text-xs font-body text-ink/70 mt-auto">
        {commonMessages.footerCopyright}
      </footer>
    </div>
  );
}
