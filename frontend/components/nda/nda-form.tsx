"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ndaFormSchema, type NDAFormSchema } from "@/lib/validation"
import type { NDATemplate } from "@/lib/types"

interface NDAFormProps {
  template: NDATemplate
  onFormChange: (values: Partial<NDAFormSchema> | null) => void
}

export function NDAForm({ template, onFormChange }: NDAFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useForm<NDAFormSchema>({
    resolver: zodResolver(ndaFormSchema),
    defaultValues: {
      party_a_name: template.default_variables.party_a_name ?? "",
      party_b_name: template.default_variables.party_b_name ?? "",
      effective_date: template.default_variables.effective_date ?? "",
      purpose: template.default_variables.purpose ?? "",
      term_years: template.default_variables.term_years ?? "",
      governing_state: template.default_variables.governing_state ?? "",
    },
  })

  // useWatch returns the same object reference unless values actually change,
  // preventing the infinite-re-render loop caused by watch() in a useEffect.
  const values = useWatch({ control })

  useEffect(() => {
    onFormChange(values)
  }, [values, onFormChange])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="party_a_name">Party A — Disclosing Party</Label>
          <Input
            id="party_a_name"
            placeholder="e.g. Acme Corp."
            aria-invalid={!!errors.party_a_name}
            {...register("party_a_name")}
          />
          {errors.party_a_name && (
            <FieldError message={errors.party_a_name.message} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="party_b_name">Party B — Receiving Party</Label>
          <Input
            id="party_b_name"
            placeholder="e.g. Beta LLC"
            aria-invalid={!!errors.party_b_name}
            {...register("party_b_name")}
          />
          {errors.party_b_name && (
            <FieldError message={errors.party_b_name.message} />
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="effective_date">Effective Date</Label>
          <Input
            id="effective_date"
            type="date"
            aria-invalid={!!errors.effective_date}
            {...register("effective_date")}
          />
          {errors.effective_date && (
            <FieldError message={errors.effective_date.message} />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="term_years">Term (years)</Label>
          <Input
            id="term_years"
            type="number"
            min="1"
            max="50"
            placeholder="e.g. 2"
            aria-invalid={!!errors.term_years}
            {...register("term_years")}
          />
          {errors.term_years && (
            <FieldError message={errors.term_years.message} />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="governing_state">Governing State / Country</Label>
        <Input
          id="governing_state"
          placeholder="e.g. California, USA"
          aria-invalid={!!errors.governing_state}
          {...register("governing_state")}
        />
        {errors.governing_state && (
          <FieldError message={errors.governing_state.message} />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purpose">Business Purpose</Label>
        <Textarea
          id="purpose"
          rows={3}
          placeholder="Describe the purpose for which Confidential Information will be shared..."
          aria-invalid={!!errors.purpose}
          {...register("purpose")}
        />
        {errors.purpose && (
          <FieldError message={errors.purpose.message} />
        )}
      </div>
    </div>
  )
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
