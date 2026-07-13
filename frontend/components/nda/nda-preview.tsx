"use client"

import { useCallback, useState } from "react"
import { Download, Loader2, FileText, Save, Check } from "lucide-react"
import { pdf, Font } from "@react-pdf/renderer"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { downloadText, sanitizeFilename } from "@/lib/download"
import { NDAPDFDocument, fontSources } from "./nda-pdf-document"
import { saveDocument } from "@/lib/api-auth"
import { useAuth } from "@/contexts/auth-context"
import type { NDATemplate } from "@/lib/types"

interface NDAPreviewProps {
  template: NDATemplate
  renderedContent: string | null
  formValues: Record<string, string> | null
  isLoading: boolean
  error: Error | null
}

export function NDAPreview({
  template,
  renderedContent,
  formValues,
  isLoading,
  error,
}: NDAPreviewProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const { user } = useAuth()

  const handleSave = useCallback(async () => {
    if (!renderedContent || !user) return
    setSaveState("saving")
    try {
      await saveDocument({
        template_id: template.id,
        name: formValues?.party_a_name
          ? `${template.name} - ${formValues.party_a_name}`
          : template.name,
        doc_type: template.name,
        content: renderedContent,
      })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2000)
    } catch (err) {
      console.error("[NDA] Save failed:", err)
      setSaveState("error")
      setTimeout(() => setSaveState("idle"), 3000)
    }
  }, [renderedContent, user, template, formValues])

  const handleDownloadText = useCallback(() => {
    if (!renderedContent) return
    const partyAName =
      formValues?.party_a_name ??
      template.default_variables.party_a_name ??
      "nda"
    const filename = `NDA_${sanitizeFilename(partyAName)}.txt`
    downloadText(renderedContent, filename)
  }, [renderedContent, formValues, template])

  const handleDownloadPDF = useCallback(async () => {
    if (!renderedContent) return
    setPdfLoading(true)
    setPdfError(null)

    let objectUrl: string | null = null

    try {
      fontSources.forEach(({ src, family, fontWeight, fontStyle }) =>
        Font.register({ src, family, fontWeight, fontStyle })
      )

      const partyAName =
        formValues?.party_a_name ??
        template.default_variables.party_a_name ??
        "nda"
      const filename = `NDA_${sanitizeFilename(partyAName)}.pdf`

      const blob = await pdf(
        <NDAPDFDocument renderedContent={renderedContent} />
      ).toBlob()

      objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setPdfError(
        "PDF generation failed. Please try downloading as text instead."
      )
      console.error("[NDA] PDF generation error:", err)
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setPdfLoading(false)
    }
  }, [renderedContent, formValues, template])

  return (
    <div className="flex flex-col h-full bg-[#ECEAE4]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0 bg-[#ECEAE4]">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[var(--color-brand-ink)]" />
          <span
            className="text-sm font-medium text-[var(--color-brand-ink)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Document Preview
          </span>
          {isLoading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground ml-1" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && renderedContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveState === "saving" || saveState === "saved"}
              className="h-8 gap-1.5 text-[12px]"
            >
              {saveState === "saving" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saveState === "saved" ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saveState === "saved" ? "Saved!" : saveState === "error" ? "Retry save" : "Save"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadText}
            disabled={!renderedContent}
            className="h-8 gap-1.5 text-[12px]"
          >
            <Download className="size-3.5" />
            Download .txt
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!renderedContent || pdfLoading}
            className="h-8 gap-1.5 text-[12px]"
          >
            {pdfLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Paper canvas */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="max-w-[680px] mx-auto pt-8">
          {pdfError && (
            <div className="mb-4">
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{pdfError}</AlertDescription>
              </Alert>
            </div>
          )}

          {saveState === "error" && (
            <div className="mb-4">
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>Failed to save document. Please try again.</AlertDescription>
              </Alert>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-5 animate-spin text-[var(--paper-border)]" />
                <p className="text-xs text-muted-foreground">Updating preview...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-white rounded-xl border border-red-200 p-4 mt-8">
              <p className="text-sm text-red-600">Failed to render document: {error.message}</p>
            </div>
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
                Your NDA will appear here
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Fill in the party information on the left to generate a real-time preview of your Non-Disclosure Agreement.
              </p>
            </div>
          )}

          {renderedContent && !isLoading && (
            <DocumentContent content={renderedContent} />
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentContent({ content }: { content: string }) {
  const lines = content.split("\n")

  return (
    <div className="relative">
      {/* Paper card */}
      <div className="bg-[var(--paper)] rounded-xl shadow-[0_2px_24px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Top gold accent bar */}
        <div className="h-1 bg-gradient-to-r from-[var(--color-brand-gold)] via-[var(--color-brand-gold)]/60 to-transparent" />

        {/* Document header */}
        <div className="px-12 pt-10 pb-6 border-b border-[var(--paper-border)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-brand-gold)] font-medium mb-2">
                Non-Disclosure Agreement
              </p>
              <h1
                className="text-2xl font-semibold text-[var(--color-brand-ink)] leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Mutual NDA
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
              <p
                className="text-sm font-medium text-[var(--color-brand-ink)] mt-0.5"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Mutual
              </p>
            </div>
          </div>
        </div>

        {/* Document body */}
        <div
          className="px-12 py-8"
          style={{ fontFamily: "var(--font-document)" }}
        >
          {lines.map((line, i) => (
            <DocumentLine key={i} line={line} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-12 pb-8 pt-4 border-t border-[var(--paper-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-px w-10 bg-[var(--color-brand-gold)]" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Confidential
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Generated with NDA Creator
            </p>
          </div>
        </div>

        {/* Bottom gold accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-[var(--color-brand-gold)]/40 to-transparent" />
      </div>
    </div>
  )
}

function DocumentLine({ line, index }: { line: string; index: number }) {
  const trimmed = line.trim()

  if (trimmed === "") {
    return <div className="h-4" />
  }

  const isClauseHeading =
    /^(ARTICLE|Section|Clause|DEFINITIONS|RECITALS|TERM|TERMINATION|CONFIDENTIAL INFORMATION|NON-DISCLOSURE|RETURN|REMEDIES|GOVERNING LAW|GENERAL|MISCELLANEOUS|Obligations|Exclusions|General|Assignment|Notices|Severability|Waiver|Entire)/i.test(trimmed)

  if (isClauseHeading) {
    return (
      <h3
        className="text-[12px] font-semibold text-[var(--color-brand-ink)] uppercase tracking-wide mt-6 mb-3 first:mt-0"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {trimmed}
      </h3>
    )
  }

  const isListItem = /^[A-Z]\)\s/.test(trimmed) || /^\d+\)\s/.test(trimmed) || /^-\s/.test(trimmed)
  const isIndented = /^[\s\t]/.test(line)

  if (isListItem) {
    return (
      <p
        className="text-[13px] leading-[1.9] text-[var(--color-brand-ink)]/85 pl-5"
        style={{ fontFamily: "var(--font-document)" }}
      >
        {line}
      </p>
    )
  }

  if (isIndented) {
    return (
      <p
        className="text-[13px] leading-[1.9] text-[var(--color-brand-ink)]/85"
        style={{ fontFamily: "var(--font-document)" }}
      >
        {line}
      </p>
    )
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
