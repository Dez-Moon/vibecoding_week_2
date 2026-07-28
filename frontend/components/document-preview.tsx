"use client"

import { useCallback, useState } from "react"
import { Download, Loader2, FileText, Save, Check } from "lucide-react"
import { pdf, Font } from "@react-pdf/renderer"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { downloadText, sanitizeFilename } from "@/lib/download"
import { NDAPDFDocument, fontSources } from "./nda/nda-pdf-document"
import { saveDocument } from "@/lib/api-auth"
import { useAuth } from "@/contexts/auth-context"
import type { NDATemplate } from "@/lib/types"

interface DocumentPreviewProps {
  template: NDATemplate
  renderedContent: string | null
  formValues: Record<string, string> | null
  isLoading: boolean
  error: Error | null
}

export function DocumentPreview({
  template,
  renderedContent,
  formValues,
  isLoading,
  error,
}: DocumentPreviewProps) {
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const { user } = useAuth()

  const handleDownloadText = useCallback(() => {
    if (!renderedContent) return
    const fallbackName = template?.name ?? "document"
    const safeTitle = formValues?.["document_title"] || formValues?.["title"] || fallbackName
    const filename = `${sanitizeFilename(safeTitle)}.txt`
    downloadText(renderedContent, filename)
  }, [renderedContent, template, formValues])

  const handleDownloadPdf = useCallback(async () => {
    if (!renderedContent) return
    setPdfError(null)
    fontSources.forEach(({ src, family, fontWeight, fontStyle }) =>
      Font.register({ src, family, fontWeight, fontStyle })
    )
    try {
      const safeTitle =
        formValues?.["document_title"] || formValues?.["title"] || template?.name || "document"
      const doc = <NDAPDFDocument renderedContent={renderedContent} />
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${sanitizeFilename(safeTitle)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError("PDF generation failed. Please try downloading as text instead.")
      console.error("[Doc] PDF generation error:", err)
    }
  }, [renderedContent, template, formValues])

  const handleSave = useCallback(async () => {
    if (!renderedContent || !user) {
      setSaveState("error")
      return
    }
    setSaveState("saving")
    try {
      const safeTitle =
        formValues?.["document_title"] || formValues?.["title"] || template?.name || "document"
      await saveDocument({
        template_id: template.id,
        name: safeTitle,
        doc_type: template.category ?? template.name,
        content: renderedContent,
        variables: formValues ?? {},
      })
      setSaveState("saved")
    } catch (err) {
      console.error("[Doc] Save failed:", err)
      setSaveState("error")
    }
  }, [renderedContent, template, formValues, user])

  const docTypeLabel = template?.name ?? "document"

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-brand-ink)]">
          <FileText className="size-4 text-[var(--color-brand-gold)]" />
          <span style={{ fontFamily: "var(--font-heading)" }}>{docTypeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!renderedContent || !user}
            data-testid="save-document-button"
          >
            {saveState === "saving" ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : saveState === "saved" ? (
              <Check className="size-4 mr-1 text-green-600" />
            ) : (
              <Save className="size-4 mr-1" />
            )}
            {saveState === "saved" ? "Saved!" : saveState === "error" ? "Retry save" : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadText}
            disabled={!renderedContent}
          >
            <Download className="size-4 mr-1" /> Text
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!renderedContent}
            className="bg-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/90 text-white"
          >
            <Download className="size-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#F0EFEC]">
        {pdfError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{pdfError}</AlertDescription>
          </Alert>
        )}
        {saveState === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Failed to save document. Please try again.</AlertDescription>
          </Alert>
        )}
        {error && !isLoading && (
          <p className="text-sm text-red-600">Failed to render document: {error.message}</p>
        )}
        {!isLoading && !error && !renderedContent && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="w-20 h-24 rounded-xl border-2 border-dashed border-[var(--paper-border)] flex items-center justify-center bg-[var(--paper)]">
                <FileText className="size-9 text-[var(--paper-border)]" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[var(--color-brand-gold)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            <p
              className="text-lg font-medium text-[var(--color-brand-ink)] mb-2"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your document preview will appear here
            </p>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Answer the questions in the chat on the left to generate a real-time preview of
              your {docTypeLabel}.
            </p>
          </div>
        )}

        {renderedContent && (
          <article
            className="mx-auto max-w-[680px] bg-[var(--paper)] rounded-lg shadow-sm border border-[var(--paper-border)] px-10 py-12"
            data-testid="document-preview"
          >
            <header className="mb-8 pb-6 border-b border-[var(--paper-border)]">
              <h1
                className="text-2xl font-semibold text-[var(--color-brand-ink)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {docTypeLabel}
              </h1>
            </header>
            <div className="space-y-1">
              {renderedContent.split("\n").map((line, idx) => (
                <RenderedLine key={idx} line={line} index={idx} />
              ))}
            </div>
            <footer
              className="mt-12 pt-6 border-t border-[var(--paper-border)] text-center text-xs text-muted-foreground"
              style={{ fontFamily: "var(--font-document)" }}
            >
              Generated with Prelegal
            </footer>
          </article>
        )}
      </div>
    </div>
  )
}

function RenderedLine({ line, index }: { line: string; index: number }) {
  const trimmed = line.trim()

  if (trimmed === "") {
    return <div className="h-2" />
  }

  if (index < 5 && trimmed !== "" && trimmed.length < 80) {
    return (
      <p
        className="text-[13px] leading-[1.9] font-semibold text-[var(--color-brand-ink)]/90"
        style={{ fontFamily: "var(--font-document)" }}
      >
        {line}
      </p>
    )
  }

  return (
    <p
      className="text-[13px] leading-[1.9] text-[var(--color-brand-ink)]/85"
      style={{ fontFamily: "var(--font-document)" }}
    >
      {line}
    </p>
  )
}
