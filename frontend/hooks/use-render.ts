"use client"

import { useQuery } from "@tanstack/react-query"
import { renderTemplate } from "@/lib/api"
import type { RenderRequest } from "@/lib/types"

export function useTemplatePreview(
  templateId: number,
  values: Record<string, string> | null
) {
  return useQuery({
    queryKey: ["render", templateId, values],
    queryFn: () =>
      renderTemplate(templateId, {
        variables: values ?? {},
      } satisfies RenderRequest),
    enabled: !!values,
    staleTime: 30 * 1000,
  })
}
