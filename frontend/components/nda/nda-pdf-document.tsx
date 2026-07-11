import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer"

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

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "CourierPrime",
    fontSize: 11,
    color: "#111111",
    lineHeight: 1.7,
  },
  body: {
    fontFamily: "CourierPrime",
    fontSize: 11,
    marginBottom: 6,
  },
})

interface NDAPDFDocumentProps {
  renderedContent: string
}

// Re-export so callers can register fonts without repeating the URLs.
export { fontSources }

export function NDAPDFDocument({ renderedContent }: NDAPDFDocumentProps) {
  // Split on blank lines to produce paragraphs.
  // ALL CAPS lines are rendered as section headings.
  const paragraphs = renderedContent.split(/\n{2,}/).filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paragraphs.map((para, i) => {
          const isHeading = /^[A-Z][A-Z\s]+$/.test(para.trim())
          return (
            <Text key={i} style={styles.body}>
              {para.trim()}
            </Text>
          )
        })}
      </Page>
    </Document>
  )
}
