"use client"

import { useCallback, useState } from "react"
import { FileText, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading template...</p>
        </div>
      </div>
    )
  }

  const template = templateQuery.data

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="border-b bg-background shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Mutual NDA Creator
              </h1>
              <p className="text-xs text-muted-foreground">
                {template?.name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {template?.category}
          </Badge>
        </div>
      </header>

      <main className="flex-1 grid flex-shrink-0 lg:grid-cols-2 gap-0">
        <div className="border-r bg-muted/20">
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-6 py-6">
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-1">Template Details</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {template?.description}
                </p>
              </div>

              <Separator className="mb-6" />

              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-4">
                  Fill in the Details
                </h2>
                <NDAForm template={template!} onFormChange={handleFormChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background flex flex-col min-h-0">
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
