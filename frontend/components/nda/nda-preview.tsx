"use client"

import { useCallback, useState } from "react"
import { Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { downloadText, sanitizeFilename } from "@/lib/download"
import { NDAPDFDocument, fontSources } from "./nda-pdf-document"
import type { NDAFormSchema } from "@/lib/validation"
import type { NDATemplate } from "@/lib/types"

interface NDAPreviewProps {
  template: NDATemplate
  renderedContent: string | null
  formValues: Partial<NDAFormSchema> | null
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
      const { pdf } = await import("@react-pdf/renderer")
      // Register fonts once before generating the document.
      // react-pdf v4: SingleLoad shape is { src, family, fontWeight?, fontStyle? }
      const { Font } = await import("@react-pdf/renderer")
      fontSources.forEach(({ src, family, fontWeight, fontStyle }) =>
        Font.register({ src, family, fontWeight, fontStyle })
      )

      const partyAName =
        formValues?.party_a_name ??
        template.default_variables.party_a_name ??
        "nda"
      const partyBName = formValues?.party_b_name ?? ""
      const filename = `NDA_${sanitizeFilename(partyAName)}.pdf`

      const blob = await pdf(
        <NDAPDFDocument
          renderedContent={renderedContent}
          partyAName={partyAName}
          partyBName={partyBName}
        />
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <h2 className="text-sm font-semibold">Document Preview</h2>
          <p className="text-xs text-muted-foreground">
            Live preview — updates as you type
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadText}
            disabled={!renderedContent}
          >
            <Download className="mr-1.5 size-3.5" />
            Download .txt
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!renderedContent || pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-3.5" />
            )}
            Download .pdf
          </Button>
        </div>
      </div>

      {pdfError && (
        <div className="px-6 pt-4 shrink-0">
          <Alert variant="destructive">
            <AlertDescription>{pdfError}</AlertDescription>
          </Alert>
        </div>
      )}

      <Separator />

      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
            Fill in the form to preview your NDA.
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
