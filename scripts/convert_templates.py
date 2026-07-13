#!/usr/bin/env python3
"""Convert markdown templates from GitHub to JSON format for the backend."""

import json
import re
from pathlib import Path

TEMPLATES_DIR = Path("templates")
BACKEND_TEMPLATES_DIR = Path("backend/data/templates")
CATALOG_PATH = Path("catalog.json")

BACKEND_TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

with open(CATALOG_PATH) as f:
    catalog = json.load(f)

category_map = {
    "Mutual Non-Disclosure Agreement": "Confidentiality",
    "Mutual NDA Cover Page": "Confidentiality",
    "Cloud Service Agreement": "Services",
    "Design Partner Agreement": "Services",
    "Service Level Agreement": "Services",
    "Professional Services Agreement": "Services",
    "Partnership Agreement": "Business",
    "Software License Agreement": "Licensing",
    "Data Processing Agreement": "Privacy",
    "Pilot Agreement": "Services",
    "Business Associate Agreement": "Healthcare",
    "AI Addendum": "AI",
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def extract_variables(content: str) -> dict[str, str]:
    vars = {}
    for m in re.finditer(r'<span class="(?:coverpage_link|orderform_link|keyterms_link)">([^<]+)</span>', content):
        name = m.group(1).strip()
        key = slugify(name)
        if key and key not in vars:
            vars[key] = f"[{name}]"
    return vars


def convert_content(content: str) -> str:
    content = re.sub(
        r'<span class="(?:coverpage_link|orderform_link|keyterms_link)">([^<]+)</span>',
        lambda m: "{{" + slugify(m.group(1).strip()) + "}}",
        content,
    )
    content = re.sub(r"<[^>]+>", "", content)
    return content.strip()


def order_key(name: str) -> int:
    order = [
        "Mutual Non-Disclosure Agreement",
        "Mutual NDA Cover Page",
        "Cloud Service Agreement",
        "Design Partner Agreement",
        "Service Level Agreement",
        "Professional Services Agreement",
        "Partnership Agreement",
        "Software License Agreement",
        "Data Processing Agreement",
        "Pilot Agreement",
        "Business Associate Agreement",
        "AI Addendum",
    ]
    try:
        return order.index(name)
    except ValueError:
        return 999


for idx, tmpl in enumerate(sorted(catalog["templates"], key=lambda t: order_key(t["name"]))):
    filename = tmpl["filename"]
    md_path = TEMPLATES_DIR / filename
    if not md_path.exists():
        print(f"SKIP: {filename} not found")
        continue

    content = md_path.read_text(encoding="utf-8")
    variables = extract_variables(content)
    converted_content = convert_content(content)

    entry = {
        "name": tmpl["name"],
        "category": category_map.get(tmpl["name"], "General"),
        "description": tmpl["description"],
        "content": converted_content,
        "default_variables": variables,
    }

    out_name = f"{idx + 1:02d}-{tmpl['name'].split()[0]}.json"
    out_path = BACKEND_TEMPLATES_DIR / out_name
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump([entry], f, indent=2, ensure_ascii=False)

    print(f"Created: {out_path} ({len(variables)} variables)")
