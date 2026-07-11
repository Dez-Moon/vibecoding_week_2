import { test, expect } from "@playwright/test"
import path from "path"

const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000"
const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000"

test.describe.configure({ mode: "serial" })

test.describe("NDA Creator — Full E2E Flow", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${API_URL}/templates/`)
    if (!res.ok) {
      throw new Error(
        `Backend not reachable at ${API_URL}. Start it with: cd backend && PYTHONPATH=. python -m uvicorn backend.app.main:app --reload`
      )
    }
  })

  test("M1: Initial load shows the NDA form with defaults", async ({ page }) => {
    await page.goto(FRONTEND_URL)

    // Header present
    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible({ timeout: 10000 })

    // Form fields present with seed data defaults
    const partyA = page.getByLabel(/Disclosing Party/i)
    await expect(partyA).toBeVisible({ timeout: 5000 })
    await expect(partyA).toHaveValue("Acme Corp.", { timeout: 5000 })

    // Preview renders with default variables (not empty state)
    await expect(page.getByRole("heading", { name: "NON-DISCLOSURE AGREEMENT", exact: true })).toBeVisible({ timeout: 5000 })
  })

  test("M2: Live preview updates as user types", async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await expect(page.getByLabel(/Disclosing Party/i)).toBeVisible({ timeout: 10000 })

    // Fill party A — preview should update with custom value
    await page.getByLabel(/Disclosing Party/i).fill("Acme Corp.")
    await expect(page.getByText("Acme Corp.").first()).toBeVisible({ timeout: 5000 })

    // Fill party B
    await page.getByLabel(/Receiving Party/i).fill("Beta LLC")
    await expect(page.getByText("Beta LLC").first()).toBeVisible({ timeout: 5000 })
  })

  test("M3: Download .txt works", async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await expect(page.getByLabel(/Disclosing Party/i)).toBeVisible({ timeout: 10000 })

    await page.getByLabel(/Disclosing Party/i).fill("Acme Corp.")
    await page.getByLabel(/Receiving Party/i).fill("Beta LLC")

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: /Download \.txt/i }).click()

    const download = await downloadPromise
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/NDA_/i)
    expect(filename).toMatch(/\.txt$/)

    // Save to a known temp path
    const tmpPath = path.join("/tmp", filename)
    await download.saveAs(tmpPath)
    const fs = await import("fs")
    const content = fs.readFileSync(tmpPath, "utf-8")

    expect(content).toContain("Acme Corp.")
    expect(content).toContain("Beta LLC")
    expect(content).not.toContain("{{") // No unsubstituted variables
    expect(content.toUpperCase()).toContain("NON-DISCLOSURE")
  })

  test("M4: Download PDF works and produces valid PDF", async ({ page }) => {
    await page.goto(FRONTEND_URL)
    await expect(page.getByLabel(/Disclosing Party/i)).toBeVisible({ timeout: 10000 })

    await page.getByLabel(/Disclosing Party/i).fill("Acme Corp.")
    await page.getByLabel(/Receiving Party/i).fill("Beta LLC")

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: /Download PDF/i }).click()

    const download = await downloadPromise
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/NDA_/i)
    expect(filename).toMatch(/\.pdf$/)

    const tmpPath = path.join("/tmp", filename)
    await download.saveAs(tmpPath)
    const fs = await import("fs")
    const buffer = fs.readFileSync(tmpPath)

    // PDF magic bytes
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF")
  })

  test("M5: Form validation prevents empty party names and shows errors", async ({ page }) => {
    await page.goto(FRONTEND_URL)

    const partyA = page.getByLabel(/Disclosing Party/i)
    await expect(partyA).toBeVisible({ timeout: 10000 })
    await expect(partyA).toHaveValue("Acme Corp.", { timeout: 5000 })

    // Trigger field validation by clearing and blurring
    await partyA.fill("")
    await partyA.blur()
    await page.keyboard.press("Tab")

    // FieldError renders a <span> wrapping the AlertTriangle icon
    const partyAError = page.locator("span:has(svg)").filter({ hasText: /Party A name is required/i }).first()
    await partyAError.waitFor({ state: "attached", timeout: 8000 })
    await expect(partyAError).toBeVisible()

    // Clear party B and trigger its validation
    const partyB = page.getByLabel(/Receiving Party/i)
    await partyB.fill("")
    await partyB.blur()
    await page.keyboard.press("Tab")

    const partyBError = page.locator("span:has(svg)").filter({ hasText: /Party B name is required/i }).first()
    await partyBError.waitFor({ state: "attached", timeout: 8000 })
    await expect(partyBError).toBeVisible()

    // Fix party A — its error disappears (party B still shows its own error)
    await partyA.fill("Acme Corp.")
    await expect(partyAError).not.toBeVisible()
  })

  test("M6: Backend offline shows error alert", async ({ page }) => {
    // Intercept API calls and force them to fail
    await page.route(`${API_URL}/templates/**`, (route) => {
      route.abort("failed")
    })

    await page.goto(FRONTEND_URL)

    await expect(page.getByText(/Failed to load template|Could not connect/i)).toBeVisible({ timeout: 8000 })
  })
})
