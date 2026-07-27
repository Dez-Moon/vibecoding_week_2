import { describe, it, expect } from "vitest"
import { NDAPDFDocument, fontSources } from "@/components/nda/nda-pdf-document"
import { Document, Page, Text } from "@react-pdf/renderer"
import { isValidElement, type ReactNode } from "react"

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(flattenText).join("")
  }

  if (isValidElement(node)) {
    return flattenText(node.props.children)
  }

  return ""
}

describe("NDAPDFDocument", () => {
  describe("fontSources", () => {
    it("exports two font sources: regular and bold", () => {
      expect(fontSources).toHaveLength(2)
    })

    it("both fonts use CourierPrime family", () => {
      fontSources.forEach((src) => {
        expect(src.family).toBe("CourierPrime")
      })
    })

    it("regular font has normal weight and style", () => {
      const regular = fontSources.find(
        (f) => f.fontWeight === "normal" && f.fontStyle === "normal"
      )
      expect(regular?.src).toMatch(/\.ttf$/)
    })

    it("bold font has bold weight", () => {
      const bold = fontSources.find((f) => f.fontWeight === "bold")
      expect(bold?.src).toMatch(/\.ttf$/)
    })

    it("both font URLs are from fonts.gstatic.com", () => {
      fontSources.forEach((src) => {
        expect(src.src).toMatch(/^https:\/\/fonts\.gstatic\.com\//)
      })
    })
  })

  describe("renders paragraphs correctly", () => {
    it("splits content on blank lines into separate paragraphs", () => {
      const content = "NON-DISCLOSURE AGREEMENT\n\nThis is the body.\n\nAnd more."
      const paragraphs = content.split(/\n{2,}/).filter(Boolean)
      expect(paragraphs).toHaveLength(3)
      expect(paragraphs[0]).toBe("NON-DISCLOSURE AGREEMENT")
      expect(paragraphs[1]).toBe("This is the body.")
      expect(paragraphs[2]).toBe("And more.")
    })

    it("handles content with no blank lines", () => {
      const content = "Single paragraph."
      const paragraphs = content.split(/\n{2,}/).filter(Boolean)
      expect(paragraphs).toHaveLength(1)
    })

    it("handles multiple consecutive blank lines", () => {
      const content = "First\n\n\n\nSecond"
      const paragraphs = content.split(/\n{2,}/).filter(Boolean)
      expect(paragraphs).toHaveLength(2)
    })
  })

  describe("document formatting", () => {
    it("strips markdown markers and inline html placeholders from paragraph text", () => {
      const content = "# Standard Terms\n\n1. **Introduction**. This applies to <span class=\"coverpage_link\">Purpose</span>."
      const document = NDAPDFDocument({ renderedContent: content })
      const page = document.props.children
      const paragraphs = Array.isArray(page.props.children)
        ? page.props.children
        : [page.props.children]

      expect(flattenText(paragraphs[0].props.children)).toBe("Standard Terms")
      expect(flattenText(paragraphs[1].props.children)).toBe("1. Introduction. This applies to Purpose.")
    })

    it("disables automatic hyphenation for body paragraphs", () => {
      const content = "This Mutual Non-Disclosure Agreement contains confidential information."
      const document = NDAPDFDocument({ renderedContent: content })
      const page = document.props.children
      const paragraph = Array.isArray(page.props.children)
        ? page.props.children[0]
        : page.props.children

      expect(paragraph.props.hyphenationCallback).toBeDefined()
      expect(paragraph.props.hyphenationCallback("Confidential", () => ["Confi-", "dential"])).toEqual([
        "Confidential",
      ])
    })
  })
})
