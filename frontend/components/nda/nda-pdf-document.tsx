import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer"

const FONT_REGULAR =
  "https://fonts.gstatic.com/s/courierprime/v8/u-4n0q2lw_W4X4RUxhJcPRj0UXrOQv3fDQq1pXU.woff2"
const FONT_BOLD =
  "https://fonts.gstatic.com/s/courierprime/v8/u-4p0q2lw_W4X4RUxhJsMHdcQv3fDQq1p1pU2Q.woff2"

export const fontSources = [
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
  title: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "CourierPrime",
    fontWeight: "bold",
    marginBottom: 20,
    textDecoration: "underline",
  },
  heading: {
    fontSize: 11,
    fontFamily: "CourierPrime",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  body: {
    fontSize: 11,
    fontFamily: "CourierPrime",
    marginBottom: 6,
  },
})

interface NDAPDFDocumentProps {
  renderedContent: string
  documentName: string
}

export function NDAPDFDocument({ renderedContent, documentName }: NDAPDFDocumentProps) {
  const paragraphs = renderedContent.split(/\n{2,}/).filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{documentName.toUpperCase()}</Text>

        {paragraphs.map((para, i) => {
          const isHeading = /^[A-Z][A-Z\s]+$/.test(para.trim())
          return (
            <Text key={i} style={isHeading ? styles.heading : styles.body}>
              {para.trim()}
            </Text>
          )
        })}
      </Page>
    </Document>
  )
}
