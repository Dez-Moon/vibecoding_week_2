"use client"

import { useQuery } from "@tanstack/react-query"
import { renderTemplate } from "@/lib/api"
import type { NDAFormSchema } from "@/lib/validation"

export function useNDARenderedPreview(
  templateId: number | undefined,
  values: Partial<NDAFormSchema> | null
) {
  return useQuery({
    queryKey: ["render", templateId, values],
    queryFn: () => renderTemplate(templateId!, { variables: values ?? {} }),
    enabled: !!templateId && !!values,
    staleTime: 30 * 1000,
  })
}
