"use client"

import { useQuery } from "@tanstack/react-query"
import { renderTemplate } from "@/lib/api"
import type { NDAFormSchema } from "@/lib/validation"

const NDA_TEMPLATE_ID = 1

export function useNDARenderedPreview(values: Partial<NDAFormSchema> | null) {
  return useQuery({
    queryKey: ["render", NDA_TEMPLATE_ID, values],
    queryFn: () =>
      renderTemplate(NDA_TEMPLATE_ID, {
        variables: values ?? {},
      }),
    enabled: !!values,
    staleTime: 30 * 1000,
  })
}
