"use client"

import { useCallback, useState } from "react"
import { Scale } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { useNDATemplate } from "@/hooks/use-template"
import { useNDARenderedPreview } from "@/hooks/use-render"
import { NDAForm } from "./nda-form"
import { NDAPreview } from "./nda-preview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { NDAFormSchema } from "@/lib/validation"

export function NDACreator() {
  const [formValues, setFormValues] = useState<Partial<NDAFormSchema> | null>(null)

  const templateQuery = useNDATemplate()
  const previewQuery = useNDARenderedPreview(templateQuery.data?.id, formValues)

  const handleFormChange = useCallback((values: Partial<NDAFormSchema> | null) => {
    setFormValues(values)
  }, [])

  if (templateQuery.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Failed to load template</AlertTitle>
          <AlertDescription>
            Could not connect to the backend at{" "}
            <code className="text-xs">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code>.
            Make sure the FastAPI server is running.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (templateQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brand-gold/10 animate-ping" />
            <div className="relative flex items-center justify-center size-14 rounded-full bg-brand-gold/10 border border-brand-gold/20">
              <Scale className="size-6 text-brand-gold" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Loading your workspace</p>
            <p className="text-xs text-muted-foreground mt-0.5">Preparing the NDA template...</p>
          </div>
        </div>
      </div>
    )
  }

  const template = templateQuery.data

  return (
    <div className="min-h-[100vh] flex flex-col bg-[var(--background)]">
      {/* Branded header */}
      <header className="shrink-0 border-b border-[var(--paper-border)] bg-[var(--paper)]">
        <div className="max-w-screen-xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Brand mark */}
            <div className="flex items-center justify-center size-10 rounded-xl text-white shadow-sm bg-[#1A2B4A]">
              <Scale className="size-5" />
            </div>
            <div>
              <h1
                className="text-[15px] font-semibold leading-tight text-[#1A2B4A]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Mutual NDA Creator
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Legal document generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {template && (
              <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-[#E8E7E2] border border-[#D8D7D2]">
                {template.category}
              </span>
            )}
          </div>
        </div>

        {/* Gold accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--color-brand-gold)] to-transparent" />
      </header>

      <main className="flex-1 grid flex-shrink-0 lg:grid-cols-[420px_1fr] gap-0 min-h-0">
        {/* Form panel */}
        <div className="border-r border-[var(--paper-border)] bg-[var(--paper)] flex flex-col">
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="px-8 py-8">
              {/* Template intro */}
              <div className="mb-8">
                <p
                  className="text-[11px] font-medium uppercase tracking-widest text-[var(--color-brand-gold)] mb-2"
                >
                  Document Template
                </p>
                <h2
                  className="text-xl font-semibold text-[var(--color-brand-ink)] leading-snug"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {template?.name}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  {template?.description}
                </p>
              </div>

              <Separator className="mb-8 border-[var(--paper-border)]" />

              {/* Form section */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-5">
                  Party Information
                </p>
                <NDAForm template={template!} onFormChange={handleFormChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="bg-[#F0EFEC] flex flex-col min-h-0">
          <NDAPreview
            template={template!}
            renderedContent={previewQuery.data?.rendered_content ?? null}
            formValues={formValues}
            isLoading={previewQuery.isLoading}
            error={previewQuery.error as Error | null}
          />
        </div>
      </main>
    </div>
  )
}
