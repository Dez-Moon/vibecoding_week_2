import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  getTemplate,
  listTemplates,
  renderTemplate,
} from "@/lib/api"

describe("api", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe("getTemplate", () => {
    it("calls /templates/{id} with Content-Type header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 5, name: "NDA" }),
      } as unknown as Response)

      await getTemplate(5)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/templates/5"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      )
    })

    it("parses JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 5, name: "Non-Disclosure Agreement (Mutual)" }),
      } as unknown as Response)

      const result = await getTemplate(5)
      expect(result).toEqual({ id: 5, name: "Non-Disclosure Agreement (Mutual)" })
    })

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      } as unknown as Response)

      await expect(getTemplate(99)).rejects.toThrow("API error 404")
    })
  })

  describe("listTemplates", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 1, name: "Consulting Agreement" },
            { id: 5, name: "Non-Disclosure Agreement (Mutual)" },
          ]),
      } as unknown as Response)
    })

    it("calls /templates/ with Content-Type header", async () => {
      await listTemplates()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/templates/"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      )
    })

    it("returns array of templates", async () => {
      const result = await listTemplates()
      expect(result).toHaveLength(2)
      expect(result[1].name).toBe("Non-Disclosure Agreement (Mutual)")
    })
  })

  describe("renderTemplate", () => {
    it("POSTs to /templates/{id}/render with variables", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ template_id: 5, rendered_content: "Hello World" }),
      } as unknown as Response)

      const result = await renderTemplate(5, {
        variables: { party_a_name: "Acme Corp." },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/templates/5/render"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ variables: { party_a_name: "Acme Corp." } }),
        })
      )
      expect(result.rendered_content).toBe("Hello World")
    })

    it("sends empty variables object when no values provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ template_id: 5, rendered_content: "" }),
      } as unknown as Response)

      await renderTemplate(5, { variables: {} })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ variables: {} }),
        })
      )
    })
  })
})
