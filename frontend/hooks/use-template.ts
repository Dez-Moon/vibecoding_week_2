"use client"

import { useQuery } from "@tanstack/react-query"
import { listTemplates } from "@/lib/api"

const NDA_TEMPLATE_NAME = "Non-Disclosure Agreement (Mutual)"

export function useNDATemplate() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
    staleTime: Infinity,
    select: (templates) => {
      const nda = templates.find((t) => t.name === NDA_TEMPLATE_NAME)
      if (!nda) throw new Error(`Template "${NDA_TEMPLATE_NAME}" not found`)
      return nda
    },
  })
}
