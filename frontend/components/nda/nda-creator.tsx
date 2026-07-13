"use client"

import { useCallback, useState } from "react"
import { ArrowLeft, Scale } from "lucide-react"
import { useTemplate } from "@/hooks/use-template"
import { useNDARenderedPreview } from "@/hooks/use-render"
import { ChatPanel } from "@/components/chat/chat-panel"
import { NDAPreview } from "./nda-preview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface NDACreatorProps {
  templateId: number
  onBack: () => void
}

export function NDACreator({ templateId, onBack }: NDACreatorProps) {
  const [formValues, setFormValues] = useState<Record<string, string> | null>(null)

  const templateQuery = useTemplate(templateId)
  const previewQuery = useNDARenderedPreview(templateQuery.data?.id, formValues)

  const handleFieldsExtracted = useCallback((fields: Record<string, string>) => {
    setFormValues(fields)
  }, [])

  const handleComplete = useCallback((fields: Record<string, string>) => {
    setFormValues(fields)
  }, [])

  const template = templateQuery.data

  if (templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Scale className="size-6 animate-pulse text-muted-foreground" />
      </div>
    )
  }

  if (templateQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Failed to load template</AlertTitle>
          <AlertDescription>{(templateQuery.error as Error).message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{template!.name}</h1>
          <p className="text-xs text-muted-foreground">{template!.description}</p>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="flex flex-1 min-h-0">
        {/* Chat panel */}
        <div className="w-1/2 border-r flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              templateName={template!.name}
              onFieldsExtracted={handleFieldsExtracted}
              onComplete={handleComplete}
            />
          </div>
        </div>

        {/* Preview panel */}
        <div className="w-1/2 bg-[#F0EFEC] flex flex-col min-h-0">
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
