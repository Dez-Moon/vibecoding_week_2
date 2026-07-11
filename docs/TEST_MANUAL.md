# Manual Test Plan — Mutual NDA Creator

## Environment Setup

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn backend.app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open: http://localhost:3000

---

## Test Cases

### M1 — Initial Load

- [ ] Page shows "Loading template..." spinner briefly, then the NDA form
- [ ] Form fields are pre-filled with default values from the template
- [ ] Template name "Non-Disclosure Agreement (Mutual)" is displayed in the header
- [ ] Category badge shows "NDA" or similar
- [ ] Document preview on the right shows placeholder text ("Your NDA will appear here")

**Expected**: No console errors, no network errors.

---

### M2 — Live Preview (Real-time Substitution)

- [ ] Type in "Party A" field — preview updates within 1–2 seconds
- [ ] Type in "Party B" field — preview updates
- [ ] Change "Effective Date" — preview updates
- [ ] Change "Term (years)" — preview shows correct year count
- [ ] Change "Governing State" — preview shows new state
- [ ] Type in "Business Purpose" — preview shows entered text

**Expected**: Preview panel updates, Party A/B names appear in correct places.

---

### M3 — Download .txt

- [ ] Click "Download .txt" — file downloads
- [ ] Filename contains the Party A name (e.g., `NDA_Acme_Corp_.txt`)
- [ ] File opens as plain text
- [ ] Content has all entered values substituted
- [ ] File has no placeholder syntax remaining (no `{{...}}`)
- [ ] Signature block is present

---

### M4 — Download .pdf

- [ ] Click "Download PDF" — file downloads
- [ ] Filename contains Party A name (e.g., `NDA_Acme_Corp_.pdf`)
- [ ] File opens as a valid PDF (Adobe Reader, browser, etc.)
- [ ] Content is readable (Courier Prime font renders)
- [ ] All entered values are in the PDF
- [ ] No duplicate content (title appears once, signature block once)
- [ ] No garbled/missing characters

---

### M5 — Form Validation

- [ ] Clear "Party A" field — inline error appears: "Party A name is required"
- [ ] Clear "Party B" field — inline error appears
- [ ] Enter 201+ characters in Party A — inline error: "must be 200 characters or fewer"
- [ ] Enter a non-date in Effective Date field — browser-native date picker prevents this
- [ ] Enter a letter in Term (years) — browser blocks it (number input)
- [ ] Enter 0 or negative in Term — edge case handling
- [ ] Clear all fields → preview shows defaults (not blank)

**Expected**: Errors appear inline, not as popups. Preview still works.

---

### M6 — Error States

- [ ] Stop the backend server → refresh the page → error alert shown: "Failed to load template"
- [ ] Restart backend → preview auto-recovers (TanStack Query retry)
- [ ] Network slow → "Loading template..." stays visible without crashing
- [ ] PDF generation failure → error alert shown: "PDF generation failed. Please try downloading as text instead."

---

### M7 — Edge Cases

- [ ] Very long Business Purpose (500 chars) — preview handles gracefully, no overflow
- [ ] Special characters in party names: `Acme & Co. "LLC"` — preview handles correctly
- [ ] Unicode in state: `München, Deutschland` — preview handles correctly
- [ ] Very short term: `1` year — preview shows "1 years" (grammatical note: this is a template issue, not a bug)
- [ ] Tab between fields — keyboard navigation works

---

### M8 — Mobile / Responsive

- [ ] Resize to mobile width (< 768px) — form and preview stack vertically
- [ ] Form is usable on mobile (fields are large enough to tap)
- [ ] Download buttons are visible and tappable on mobile

---

### M9 — Backend API (via curl)

```bash
# List all templates
curl -s http://localhost:8000/templates/ | jq '.[].name'

# Get NDA template specifically
curl -s http://localhost:8000/templates/5 | jq '.name, .category'

# Render with custom values
curl -s -X POST http://localhost:8000/templates/5/render \
  -H "Content-Type: application/json" \
  -d '{"variables":{"party_a_name":"Test Corp","party_b_name":"Client Inc"}}' \
  | jq '.rendered_content' | head -5
```

- [ ] All three commands return valid JSON
- [ ] Render endpoint substitutes variables correctly
- [ ] CORS headers present: `Access-Control-Allow-Origin: http://localhost:3000`

---

### M10 — Security

- [ ] `.env.local` is gitignored (no secrets committed)
- [ ] Only `NEXT_PUBLIC_API_URL` is exposed to browser (non-secret)
- [ ] No `dangerouslySetInnerHTML` used for user-supplied content
- [ ] PDF font URLs are from a trusted CDN (fonts.gstatic.com)

---

## Test Sign-off

| Test Area | Tester | Date | Result |
|-----------|--------|------|--------|
| M1 Initial Load | | | |
| M2 Live Preview | | | |
| M3 Download .txt | | | |
| M4 Download .pdf | | | |
| M5 Form Validation | | | |
| M6 Error States | | | |
| M7 Edge Cases | | | |
| M8 Responsive | | | |
| M9 Backend API | | | |
| M10 Security | | | |
