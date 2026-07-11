import "@testing-library/jest-dom"
import { vi } from "vitest"

// Polyfill fetch for jsdom
if (!global.fetch) {
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const response = await globalThis.fetch!(url, init)
    return response as unknown as ReturnType<typeof fetch>
  }
}

// Mock URL.createObjectURL and revoke
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url")
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = vi.fn()
}

// Suppress console.error noise in tests
vi.spyOn(console, "error").mockImplementation(() => {})
