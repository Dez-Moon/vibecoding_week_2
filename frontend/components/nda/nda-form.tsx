"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { AlertTriangle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { NDATemplate } from "@/lib/types"

interface NDAFormProps {
  template: NDATemplate
  onFormChange: (values: Record<string, string> | null) => void
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive">
      <AlertTriangle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

export function NDAForm({ template, onFormChange }: NDAFormProps) {
  const variables = template.default_variables ?? {}

  const {
    register,
    control,
    formState: { errors },
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, v ?? ""])
    ) as Record<string, string>,
  })

  const values = useWatch<Record<string, string>>({ control })

  useEffect(() => {
    onFormChange(values as Record<string, string>)
  }, [values, onFormChange])

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(variables).map(([key, _default]) => {
        const label = humanize(key)
        const isLong = key.toLowerCase().includes("description") ||
                       key.toLowerCase().includes("content") ||
                       key.toLowerCase().includes("purpose") ||
                       key.toLowerCase().includes("details") ||
                       key.toLowerCase().includes("address") ||
                       key.toLowerCase().includes("terms") ||
                       key.toLowerCase().includes("conditions")

        return (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{label}</Label>
            {isLong ? (
              <Textarea
                id={key}
                rows={3}
                placeholder={`Enter ${label.toLowerCase()}...`}
                {...register(key)}
              />
            ) : (
              <Input
                id={key}
                placeholder={`Enter ${label.toLowerCase()}...`}
                {...register(key)}
              />
            )}
            <FieldError message={errors[key]?.message as string | undefined} />
          </div>
        )
      })}
    </div>
  )
}
