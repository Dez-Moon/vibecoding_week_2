"use client"

import { useQuery } from "@tanstack/react-query"
import { getTemplate } from "@/lib/api"

const NDA_TEMPLATE_ID = 1

export function useNDATemplate() {
  return useQuery({
    queryKey: ["template", NDA_TEMPLATE_ID],
    queryFn: () => getTemplate(NDA_TEMPLATE_ID),
    staleTime: Infinity,
  })
}
