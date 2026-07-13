"use client"

import { useQuery } from "@tanstack/react-query"
import { getTemplate } from "@/lib/api"

export function useTemplate(templateId: number | null) {
  return useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getTemplate(templateId!),
    enabled: templateId !== null,
    staleTime: Infinity,
  })
}
