"use client"

import { useQuery } from "@tanstack/react-query"
import { renderTemplate } from "@/lib/api"

export function useNDARenderedPreview(
  templateId: number | undefined,
  values: Record<string, string> | null
) {
  return useQuery({
    queryKey: ["render", templateId, values],
    queryFn: () => renderTemplate(templateId!, { variables: values ?? {} }),
    enabled: !!templateId && !!values,
    staleTime: 30 * 1000,
  })
}
