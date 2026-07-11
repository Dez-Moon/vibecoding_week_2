import { describe, it, expect } from "vitest"
import { sanitizeFilename } from "@/lib/download"

describe("sanitizeFilename", () => {
  it("returns a string", () => {
    const result = sanitizeFilename("Acme Corp.")
    expect(typeof result).toBe("string")
  })

  it("replaces spaces with underscores and lowercases", () => {
    // Implementation: replace all non-alphanumeric chars (except _ and -) with _, then toLowerCase()
    expect(sanitizeFilename("Acme Corp.")).toBe("acme_corp_")
  })

  it("replaces path traversal characters with underscores", () => {
    // Each '/' and '\' is a non-alphanumeric char → replaced with '_'
    expect(sanitizeFilename("../etc/passwd")).toBe("___etc_passwd")
    expect(sanitizeFilename("..\\windows\\system32")).toBe("___windows_system32")
  })

  it("replaces special characters with underscores and lowercases", () => {
    expect(sanitizeFilename('Acme & Co. "LLC"')).toBe("acme___co___llc_")
  })

  it("handles unicode characters", () => {
    const result = sanitizeFilename("München")
    // Unicode letters are non-alphanumeric, so they become underscores
    expect(result.length).toBeGreaterThan(0)
  })

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("")
  })

  it("does not strip trailing dots — they are replaced like any other char", () => {
    // trailing spaces are replaced, trailing dots are replaced too
    expect(sanitizeFilename("Acme Corp.  ")).toBe("acme_corp___")
  })
})
