import { z } from "zod"

export const ndaFormSchema = z.object({
  party_a_name: z
    .string()
    .min(1, "Party A name is required")
    .max(200, "Party A name must be 200 characters or fewer"),
  party_b_name: z
    .string()
    .min(1, "Party B name is required")
    .max(200, "Party B name must be 200 characters or fewer"),
  effective_date: z
    .string()
    .min(1, "Effective date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD"),
  purpose: z
    .string()
    .min(1, "Business purpose is required")
    .max(500, "Purpose must be 500 characters or fewer"),
  term_years: z
    .string()
    .min(1, "Term length is required")
    .regex(/^\d+$/, "Term must be a whole number of years"),
  governing_state: z
    .string()
    .min(1, "Governing state/country is required")
    .max(100, "Governing state must be 100 characters or fewer"),
})

export type NDAFormSchema = z.infer<typeof ndaFormSchema>
