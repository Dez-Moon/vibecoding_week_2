"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { listTemplates } from "@/lib/api"

export default function Home() {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
  })

  if (selectedId !== null) {
    const { NDACreator } = require("@/components/nda/nda-creator")
    return <NDACreator templateId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b shrink-0">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Prelegal</h1>
            <p className="text-xs text-muted-foreground">Draft legal agreements from templates</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Choose a document type</h2>
          <p className="text-sm text-muted-foreground">
            Select the type of legal agreement you want to create.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates?.map((tmpl) => (
              <Card
                key={tmpl.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                onClick={() => setSelectedId(tmpl.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-tight">
                      {tmpl.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {tmpl.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tmpl.description}
                  </p>
                  <Separator className="mt-4" />
                  <Button variant="ghost" size="sm" className="mt-3 w-full h-7 text-xs">
                    Create document
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
