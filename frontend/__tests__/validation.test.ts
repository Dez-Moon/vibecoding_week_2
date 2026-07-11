import { describe, it, expect } from "vitest"
import { ndaFormSchema } from "@/lib/validation"

describe("ndaFormSchema", () => {
  describe("party_a_name", () => {
    it("accepts a valid party A name", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(true)
    })

    it("rejects empty party A name", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("party_a_name")
      }
    })

    it("rejects party A name longer than 200 characters", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "A".repeat(201),
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })

    it("accepts special characters in party A name", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: 'Acme & Co. "LLC"',
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("party_b_name", () => {
    it("rejects empty party B name", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("effective_date", () => {
    it("accepts a valid ISO date", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(true)
    })

    it("rejects an invalid date format", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "11/07/2026",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty effective date", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("term_years", () => {
    it("accepts a positive integer", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "5",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(true)
    })

    it("rejects non-numeric term", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "two",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty term", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("governing_state", () => {
    it("accepts unicode in governing state", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "München, Deutschland",
      })
      expect(result.success).toBe(true)
    })

    it("rejects governing state longer than 100 characters", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "Evaluating a potential partnership.",
        term_years: "2",
        governing_state: "A".repeat(101),
      })
      expect(result.success).toBe(false)
    })
  })

  describe("purpose", () => {
    it("accepts a 500-character purpose string", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "A".repeat(500),
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(true)
    })

    it("rejects a purpose longer than 500 characters", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "A".repeat(501),
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })

    it("rejects empty purpose", () => {
      const result = ndaFormSchema.safeParse({
        party_a_name: "Acme Corp.",
        party_b_name: "Beta LLC",
        effective_date: "2026-07-11",
        purpose: "",
        term_years: "2",
        governing_state: "California, USA",
      })
      expect(result.success).toBe(false)
    })
  })
})
