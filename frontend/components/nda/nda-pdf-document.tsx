import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer"

// Courier Prime from the official Google Fonts static CDN.
// react-pdf v4: Font.register accepts { src, family } or { family, fonts[] }.
const FONT_REGULAR =
  "https://fonts.gstatic.com/s/courierprime/v8/u-4n0q2lw_W4X4RUxhJcPRj0UXrOQv3fDQq1pXU.woff2"
const FONT_BOLD =
  "https://fonts.gstatic.com/s/courierprime/v8/u-4p0q2lw_W4X4RUxhJsMHdcQv3fDQq1p1pU2Q.woff2"

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
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    marginBottom: 24,
  },
  signatureCol: {
    width: "45%",
  },
  sigLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#111111",
    marginBottom: 2,
  },
  sigLabel: {
    fontSize: 9,
    color: "#555555",
  },
})

interface NDAPDFDocumentProps {
  renderedContent: string
  partyAName: string
  partyBName: string
}

// Re-export so callers can register fonts without repeating the URLs.
export { fontSources }

export function NDAPDFDocument({
  renderedContent,
  partyAName,
  partyBName,
}: NDAPDFDocumentProps) {
  // Split on blank lines to produce paragraphs; headings are all-caps lines.
  const paragraphs = renderedContent.split(/\n{2,}/).filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>NON-DISCLOSURE AGREEMENT</Text>

        {paragraphs.map((para, i) => {
          const isHeading = /^[A-Z][A-Z\s]+$/.test(para.trim())
          return (
            <Text key={i} style={isHeading ? styles.heading : styles.body}>
              {para.trim()}
            </Text>
          )
        })}

        <Text style={styles.signatureRow}>
          <Text style={styles.signatureCol}>
            <Text style={styles.sigLine}>{"\n"}</Text>
            <Text style={styles.sigLabel}>
              Party A: {partyAName || "[Party A]"}
            </Text>
            {"\n"}
            <Text style={styles.sigLabel}>Date: _____________________</Text>
          </Text>
          <Text style={styles.signatureCol}>
            <Text style={styles.sigLine}>{"\n"}</Text>
            <Text style={styles.sigLabel}>
              Party B: {partyBName || "[Party B]"}
            </Text>
            {"\n"}
            <Text style={styles.sigLabel}>Date: _____________________</Text>
          </Text>
        </Text>
      </Page>
    </Document>
  )
}
