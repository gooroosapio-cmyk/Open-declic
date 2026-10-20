"""Extrait les 200 modèles du PDF « Open_declic_200_Modeles_Duplicables_V1 » vers JSON.

Usage : python3 -I scripts/extract-catalogue-pdf.py content/sources/Open_declic_200_Modeles_Duplicables_V1.pdf content/sources/catalogue-200-v1.json
Dépendances : pdftotext (poppler-utils) et pypdf. Les liens des sources sont lus
dans les annotations du PDF ; leur domaine est contrôlé contre le texte affiché.
"""
import json
import re
import subprocess
import sys
from collections import Counter

from pypdf import PdfReader

pdf, out_path = sys.argv[1], sys.argv[2]
raw = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True, check=True).stdout

skip = re.compile(r"^(LES MODÈLES À ADAPTER|G1–G3 : difficulté.*|Votre idée\. Votre prochain pas\.|\d{2} / 56|OD-\d{3} À OD-\d{3}|Open declic)$")
lines = [l.strip() for l in raw.split("\n")]
text = "\n".join(l for l in lines if not skip.match(l))
start = text.index("\nOD-001\n")
body = text[start:text.index("SOURCES & USAGE DU CATALOGUE", start)]
chunks = re.split(r"\n(OD-\d{3})\n", body)

models = []
for i in range(1, len(chunks), 2):
    oid, c = chunks[i], chunks[i + 1].strip()
    nonempty = [l for l in c.split("\n") if l]
    rest = re.sub(r"\s+", " ", " ".join(nonempty[2:]))
    m = re.search(r"V1\. (.*?) Local\. (.*?) Revenu\. (.*?) Construire\. (.*?) ([ABO]) · (.*)$", rest)
    if not m:
        sys.exit(f"Entrée illisible : {oid}")
    tags = [t.strip() for t in nonempty[1].split("·")]
    models.append({
        "numero": oid, "titre": nonempty[0], "type": tags[0], "domaine": tags[1], "client": tags[2],
        "difficulte": tags[3], "ia": tags[4], "v1": m[1], "local": m[2], "revenu": m[3],
        "construire": m[4], "preuve": m[5], "source_texte": m[6],
    })

# Liens des pages de catalogue (p. 6 à 55), dans l'ordre de lecture.
reader = PdfReader(pdf)
links = []
for pi, page in enumerate(reader.pages, start=1):
    if not 6 <= pi <= 55:
        continue
    for a in page.get("/Annots") or []:
        a = a.get_object()
        if a.get("/Subtype") == "/Link" and "/URI" in a.get("/A", {}):
            links.append((pi, -float(a["/Rect"][1]), a["/A"]["/URI"]))
links.sort()
with_source = [m for m in models if m["preuve"] != "O"]
if len(links) != len(with_source):
    sys.exit(f"{len(links)} liens pour {len(with_source)} sources")
for m, (_, _, uri) in zip(with_source, links):
    s = re.match(r"Source : (.*) — (\S+)$", m["source_texte"])
    if not s or s[2].removeprefix("www.") not in uri:
        sys.exit(f"Lien incohérent pour {m['numero']} : {uri}")
    m["source_nom"], m["source_url"] = s[1], uri
for m in models:
    m.setdefault("source_nom", None)
    m.setdefault("source_url", None)

counts = (Counter(m["type"] for m in models), Counter(m["difficulte"] for m in models), Counter(m["preuve"] for m in models))
print(len(models), *counts)
json.dump({"source": pdf.split("/")[-1], "modeles": models}, open(out_path, "w"), ensure_ascii=False, indent=1)
