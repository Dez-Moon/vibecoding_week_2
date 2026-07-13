"use client"

import { useCallback, useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { downloadText, sanitizeFilename } from "@/lib/download"
import { NDAPDFDocument, fontSources } from "./nda-pdf-document"
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
  const [pdfError, setPdfError] = useState<string | null>(null)

  const handleDownloadText = useCallback(() => {
    if (!renderedContent) return
    const filename = sanitizeFilename(`${template.name}.txt`)
    downloadText(renderedContent, filename)
  }, [renderedContent, template.name])

  const handleDownloadPdf = useCallback(async () => {
    if (!renderedContent) return
    setPdfError(null)
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const { NDAPDFDocument, fontSources } = await import("./nda-pdf-document")

      const blob = await pdf(
        <NDAPDFDocument
          renderedContent={renderedContent}
          documentName={template.name}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = sanitizeFilename(`${template.name}.pdf`)
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(
        "PDF generation failed. Please try downloading as text instead."
      )
      console.error("[NDA] PDF generation error:", err)
    }
  }, [renderedContent, template.name])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadText}
            disabled={!renderedContent}
            className="h-7 text-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            TXT
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={!renderedContent}
            className="h-7 text-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {pdfError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{pdfError}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to render document: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !renderedContent && (
          <p className="text-sm text-muted-foreground">
            Fill in the form to preview your document.
          </p>
        )}

        {renderedContent && !isLoading && (
          <div className="space-y-0">
            {renderedContent.split("\n").map((line, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-foreground"
                style={{ whiteSpace: "pre-wrap", minHeight: "1.5em" }}
              >
                {line || " "}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
