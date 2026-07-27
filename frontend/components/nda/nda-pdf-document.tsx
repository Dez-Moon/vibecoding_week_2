import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer"
import type { ReactNode } from "react"

// Courier Prime from the official Google Fonts static CDN.
// Courier Prime is served as TTF (woff2 not available for this font).
const FONT_REGULAR =
  "https://fonts.gstatic.com/s/courierprime/v11/u-450q2lgwslOqpF_6gQ8kELWwY.ttf"
const FONT_BOLD =
  "https://fonts.gstatic.com/s/courierprime/v11/u-4k0q2lgwslOqpF_6gQ8kELY7pMf-c.ttf"

const fontSources = [
  { src: FONT_REGULAR, family: "CourierPrime", fontWeight: "normal" as const, fontStyle: "normal" as const },
  { src: FONT_BOLD, family: "CourierPrime", fontWeight: "bold" as const, fontStyle: "normal" as const },
]

const NO_HYPHENATION = (word: string) => [word]

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "CourierPrime",
    fontSize: 11,
    color: "#111111",
    lineHeight: 1.7,
  },
  heading: {
    fontFamily: "CourierPrime",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  body: {
    fontFamily: "CourierPrime",
    fontSize: 11,
    marginBottom: 6,
    textAlign: "left",
  },
  bold: {
    fontWeight: "bold",
  },
})

interface NDAPDFDocumentProps {
  renderedContent: string
}

function stripInlineHtml(text: string) {
  return text.replace(/<[^>]+>/g, "")
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={index} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      )
    }

    return part
  })
}

function normalizeParagraph(paragraph: string) {
  return stripInlineHtml(paragraph.trim()).replace(/^#\s+/, "")
}

// Re-export so callers can register fonts without repeating the URLs.
export { fontSources }

export function NDAPDFDocument({ renderedContent }: NDAPDFDocumentProps) {
  const paragraphs = renderedContent.split(/\n{2,}/).filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paragraphs.map((paragraph, index) => {
          const normalized = normalizeParagraph(paragraph)
          const isHeading = paragraph.trim().startsWith("# ")

          return (
            <Text
              key={index}
              style={isHeading ? styles.heading : styles.body}
              hyphenationCallback={NO_HYPHENATION}
            >
              {renderInlineMarkdown(normalized)}
            </Text>
          )
        })}
      </Page>
    </Document>
  )
}
