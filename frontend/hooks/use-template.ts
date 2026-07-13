"use client"

import { useQuery } from "@tanstack/react-query"
import { getTemplate } from "@/lib/api"

export function useNDATemplate(templateId: number) {
  return useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getTemplate(templateId),
    staleTime: Infinity,
  })
}
