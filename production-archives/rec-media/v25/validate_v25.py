#!/usr/bin/env python3
"""Check V25 media and documents without changing images, Git state or history.
Writes only reports/QA_V25.json. Pillow is required. No browser or engine QA.
"""
from pathlib import Path
from collections import Counter
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone
import argparse, ast, hashlib, json, re, subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
BASE = "226fbba85ef7d9b248974eee8c455ec01cee95d4"
PREFIX = "production-archives/rec-media/v25/"
REPORT = ROOT / "reports/QA_V25.json"
FLAGS = ("engine_admitted", "animation_complete", "canonical_fidelity_1_1_certified")
REF_NAMES = {
    "steam_920562_00.jpg": "native", "re2_gamewith_33.jpg": "native",
    "steam_381710_00.jpg": "native", "re0_faxagate_22.webp": "native",
    "claire_re2r_military_right.png": "base", "billy_re0hd_wolf_force_front.png": "base",
}
ERRORS, RESULTS = [], {}


def check(ok, label, detail):
    if not ok:
        ERRORS.append({"check": label, "detail": detail})
    return ok


def git(*args):
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, check=True).stdout


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inside(value, base=ROOT):
    path = (base / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError("Delivery path leaves V25: " + str(value))
    return path


def metadata(path):
    data = path.read_bytes()
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        im.load()
        alpha = im.getchannel("A") if "A" in im.getbands() else None
        return dict(sha256=hashlib.sha256(data).hexdigest(),
                    git_blob_sha=hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest(),
                    dimensions=[im.width, im.height], mode=im.mode, file_bytes=len(data),
                    alpha_range=list(alpha.getextrema()) if alpha else None, format=im.format)


def compare(record, actual, context, required=True):
    for key in ("sha256", "git_blob_sha", "dimensions", "mode", "file_bytes", "alpha_range"):
        value = record.get(key, record.get("bytes") if key == "file_bytes" else None)
        if key == "dimensions" and isinstance(value, dict):
            value = [value.get("width"), value.get("height")]
        if required or value is not None:
            check(value == actual[key], "metadata", f"{context}: {key} {value!r} != {actual[key]!r}")


def walk(obj):
    if isinstance(obj, dict):
        yield obj
        for value in obj.values():
            yield from walk(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk(value)


def scoped_path(value, context):
    value = str(value)
    if value.startswith(PREFIX):
        return inside(value[len(PREFIX):])
    if value.startswith(("characters/", "helena/", "claire/", "reports/")):
        return inside(value)
    return inside(value, context.parent)


def validate_assets(manifest, expected):
    assets, source_records, source_hashes, actual = {}, {}, {}, {}
    for row in manifest["source_manifests"]:
        file = inside(row["path"])
        doc = read(file)
        source_hashes[row["path"]] = digest(file)
        check(row["sha256"] == digest(file), "source_manifest_hash", row["path"])
        check(row["assets"] == len(doc["assets"]), "source_manifest_count", row["path"])
        for record in doc["assets"]:
            aid = record["asset_id"]
            check(aid not in source_records, "source_id_unique", aid)
            source_records[aid] = (record, file)
    for asset in manifest["assets"]:
        aid, path = asset["asset_id"], inside(asset["path"])
        check(aid not in assets, "asset_id_unique", aid)
        assets[aid] = asset
        measured = metadata(path)
        actual[asset["path"]] = measured
        compare(asset, measured, aid)
        check(measured["format"] == "PNG" and measured["mode"] == "RGBA", "rgba_png", aid)
        check(measured["alpha_range"][0] == 0 and measured["alpha_range"][1] > 0, "real_alpha", aid)
        for flag in FLAGS:
            check(asset.get(flag) is False, "required_false_flag", aid + "." + flag)
        check(type(asset.get("candidate")) is bool, "candidate_boolean", aid)
        check(asset.get("post_generation_pixel_edits") is False, "post_generation_edits", aid)
        record, file = source_records[aid]
        compare(record, measured, "author/" + aid)
        check(asset["source_manifest"] == str(file.relative_to(ROOT)), "source_manifest_path", aid)
        check(asset["source_manifest_sha256"] == source_hashes[asset["source_manifest"]], "source_digest", aid)
        for flag in FLAGS:
            check(record.get(flag) is False, "author_false_flag", aid + "." + flag)
        for flag in ("pixels_modified_after_generation", "image_pixels_modified_after_generation", "post_generation_pixel_edits"):
            if flag in record:
                check(record[flag] is False, "author_pixel_edits", aid + "." + flag)
        author = Path(record["path"])
        author = author if author.is_absolute() else inside(record["path"], file.parent)
        check(author.is_file() and digest(author) == measured["sha256"], "author_copy_bytes", aid)
        if asset["status"] != record["status"]:
            check(asset.get("candidate") is False and bool(asset.get("superseded_by") or asset.get("replaced_by")),
                  "documented_status_override", aid)
    disk = {str(p.relative_to(ROOT)) for p in ROOT.rglob("*.png")}
    check(disk == set(actual) and len(actual) == len(assets), "png_orphans_or_duplicate_paths", sorted(disk ^ set(actual)))
    check(set(assets) == set(source_records), "global_source_ids", sorted(set(assets) ^ set(source_records)))
    summary = manifest["summary"]
    n = len(assets)
    check(n == summary["png"], "summary_png", n)
    if expected is not None:
        check(n == expected, "expected_png", {"expected": expected, "actual": n})
    candidates = sum(a["candidate"] is True for a in assets.values())
    check(candidates == summary.get("candidate_png", summary.get("candidates")), "summary_candidates", candidates)
    if "superseded_trials" in summary:
        check(n - candidates == summary["superseded_trials"], "summary_trials", n - candidates)
    check(sum(x["file_bytes"] for x in actual.values()) == summary["total_png_bytes"], "summary_bytes", summary["total_png_bytes"])
    check(manifest["base_commit"] == BASE, "parent_commit", manifest["base_commit"])
    RESULTS["assets"] = {"png": n, "candidates": candidates, "non_candidates": n - candidates,
                         "total_bytes": sum(x["file_bytes"] for x in actual.values()),
                         "records": [{"asset_id": a["asset_id"], "path": a["path"], **actual[a["path"]]} for a in assets.values()]}
    return assets, actual, source_records


def validate_receipts(assets, actual):
    seen, records = set(), []
    for file in sorted(ROOT.glob("*/GIT_BLOB*.json")):
        doc = read(file)
        rows = doc.get("blobs", doc.get("assets", [doc])) if isinstance(doc, dict) else doc
        for row in rows:
            value = row.get("relative_path", row.get("path"))
            declared = Path(value)
            if declared.is_absolute():
                matches = [a for a in assets.values() if Path(a["path"]).name == declared.name
                           and a["path"].startswith(file.parent.name + "/")]
                check(len(matches) == 1, "receipt_absolute_path", value)
                path = inside(matches[0]["path"])
                check(declared.is_file() and digest(declared) == actual[matches[0]["path"]]["sha256"], "receipt_author_bytes", value)
            else:
                path = scoped_path(value, file)
            rel = str(path.relative_to(ROOT))
            matches = [a for a in assets.values() if a["path"] == rel]
            check(len(matches) == 1 and rel not in seen, "receipt_unique_target", rel)
            asset = matches[0]
            if row.get("asset_id"):
                check(row["asset_id"] == asset["asset_id"], "receipt_asset_id", rel)
            sha = row.get("returned_git_blob_sha", row.get("sha", row.get("git_blob_sha")))
            check(sha == actual[rel]["git_blob_sha"], "receipt_git_sha", rel)
            check(row.get("bytes", row.get("file_bytes")) == actual[rel]["file_bytes"], "receipt_bytes", rel)
            if row.get("sha256"):
                check(row["sha256"] == actual[rel]["sha256"], "receipt_sha256", rel)
            seen.add(rel)
            records.append({"path": rel, "sha": sha, "receipt": str(file.relative_to(ROOT))})
    check(seen == set(actual), "receipt_coverage", sorted(set(actual) - seen))
    RESULTS["receipts"] = {"count": len(records), "records": records, "remote_refetch": False}


def validate_references_and_reviews(manifest, assets, actual, sources):
    refs, reviewed, reports = {}, set(), []
    chars_docs = [read(p) for p in (ROOT / "characters").glob("*.json") if not p.name.startswith("GIT_BLOB")]
    path_keys = ("path", "local_path", "local_file", "local_reference_path", "reference_path",
                 "copy_path", "scratch_file", "file", "filename", "base_path", "original_path")
    for doc in chars_docs:
        for row in walk(doc):
            if not row.get("sha256"):
                continue
            for key in path_keys:
                value = row.get(key)
                if not isinstance(value, str) or Path(value).name not in REF_NAMES:
                    continue
                name = Path(value).name
                path = Path(value)
                if not path.is_absolute():
                    options = [ROOT / "characters" / value, ROOT / value,
                               REPO.parent / "v25-character-research" / name]
                    path = next((p for p in options if p.is_file()), options[0])
                check(path.is_file(), "reference_present", str(path))
                measured = metadata(path)
                compare(row, measured, "reference/" + name, required=False)
                check(row["sha256"] == measured["sha256"], "reference_hash", name)
                if name in refs:
                    check(refs[name]["sha256"] == row["sha256"], "reference_consistent", name)
                refs[name] = {"role": REF_NAMES[name], "path": str(path), "sha256": row["sha256"],
                              "dimensions": measured["dimensions"]}
    check(set(refs) == set(REF_NAMES), "four_native_two_base_references", sorted(set(REF_NAMES) - set(refs)))
    correction_inputs = []
    for aid, (source, file) in sources.items():
        if file.parent.name not in ("helena", "claire"):
            continue
        inputs = source.get("input_records")
        if inputs is None:
            inputs = read(file.parent / "inputs.json")["inputs"]
        for row in inputs:
            path = Path(row["copy_path"])
            measured = metadata(path)
            compare(row, measured, "correction_input/" + aid, required=False)
            check(row["sha256"] == measured["sha256"], "correction_input_hash", aid + ":" + str(path))
            original = Path(row["original_path"])
            check(original.is_file() and digest(original) == measured["sha256"], "correction_input_original", str(original))
            correction_inputs.append({"asset_id": aid, "path": str(path), "sha256": row["sha256"]})
    for name in manifest["independent_reviews"]:
        file = inside(name)
        doc = read(file)
        rows = doc.get("assets", [doc] if "asset_id" in doc else [])
        covered = []
        for row in rows:
            path = scoped_path(row["path"], file)
            rel = str(path.relative_to(ROOT))
            check(rel in actual, "review_target", rel)
            compare(row, actual[rel], "review/" + rel, required=False)
            check(row.get("sha256") == actual[rel]["sha256"], "review_hash", rel)
            if row.get("asset_id"):
                check(assets.get(row["asset_id"], {}).get("path") == rel, "review_asset_id", rel)
            for flag in FLAGS:
                if flag in row:
                    check(row[flag] is False, "review_false_flag", name + ":" + flag)
            covered.append(rel)
            reviewed.add(rel)
        if doc.get("source_manifest_sha256") and doc.get("source_manifest"):
            check(digest(scoped_path(doc["source_manifest"], file)) == doc["source_manifest_sha256"], "review_author_manifest_hash", name)
        if doc.get("author_manifest_sha256"):
            check(digest(ROOT / "characters/manifest.json") == doc["author_manifest_sha256"], "review_author_manifest_hash", name)
        for row in doc.get("reference_files", []):
            key = row.get("filename", Path(row.get("local_inspection_path", "")).name)
            reference = refs.get(key)
            if reference is None:
                correction_hashes = {item["sha256"] for item in correction_inputs}
                matches = [item for item in assets.values()
                           if Path(item["path"]).name == key and item["sha256"] in correction_hashes]
                if len(matches) == 1:
                    reference = matches[0]
            check(reference is not None and row.get("sha256") == reference["sha256"], "review_reference_hash", name + ":" + key)
            if reference is not None and "dimensions" in row:
                check(row["dimensions"] == reference["dimensions"], "review_reference_dimensions", key)
        if doc.get("asset_id") and doc.get("comparisons"):
            known = {r["sha256"] for r in correction_inputs if r["asset_id"] == doc["asset_id"]}
            check({r["sha256"] for r in doc["comparisons"]} <= known, "correction_review_inputs", name)
        reports.append({"path": name, "sha256": digest(file), "covered_assets": covered})
    check(reviewed == set(actual), "review_coverage", sorted(set(actual) - reviewed))
    for asset in assets.values():
        check(any(r["path"] == asset["independent_review"] and asset["path"] in r["covered_assets"] for r in reports),
              "asset_review_reference", asset["asset_id"])
    RESULTS["references"] = {"records": refs, "native": sum(r["role"] == "native" for r in refs.values()),
                              "bases": sum(r["role"] == "base" for r in refs.values()), "correction_inputs": correction_inputs}
    RESULTS["reviews"] = {"reports": reports, "covered_png": len(reviewed), "visual_qa_repeated": False}


class HTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids, self.images, self.links = [], [], []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.append(a["id"])
        if tag == "img": self.images.append(a)
        self.links.extend(a[k] for k in ("href", "src") if a.get(k))


def documents_and_scope():
    tracked = set(git("ls-tree", "-r", "--name-only", "-z", "HEAD").decode().split("\0"))
    stats = Counter()
    for file in sorted(ROOT.rglob("*")):
        if not file.is_file() or file == REPORT: continue
        if file.suffix == ".json": read(file); stats["json_parsed"] += 1
        if file.suffix == ".py": ast.parse(file.read_text(), filename=str(file)); stats["python_ast_parsed"] += 1
        if file.suffix not in (".html", ".md"): continue
        text = file.read_text(); parser = HTML(); parser.feed(text)
        check(len(parser.ids) == len(set(parser.ids)), "html_id_unique", str(file.relative_to(ROOT)))
        check(all(a.get("alt", "").strip() for a in parser.images), "html_img_alt", str(file.relative_to(ROOT)))
        stats["html_ids"] += len(parser.ids)
        stats["html_images"] += len(parser.images)
        links = parser.links
        if file.suffix == ".md":
            links += [m.group(1) or m.group(2) for m in re.finditer(r"!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))", text)]
        for link in links:
            u = urlsplit(link)
            if u.scheme or u.netloc: stats["external_links_not_fetched"] += 1; continue
            target = (file.parent / unquote(u.path)).resolve() if u.path else file
            if not check(target.is_relative_to(REPO), "local_link_scope", {"from":str(file.relative_to(ROOT)), "link":link}): continue
            rel = str(target.relative_to(REPO))
            exists = target == REPORT or target.exists() or rel in tracked
            check(exists, "local_link_exists", {"from":str(file.relative_to(ROOT)), "link":link})
            if exists: stats["local_links"] += 1
            if exists and not target.exists() and target != REPORT: stats["sparse_git_links"] += 1
            if u.fragment and exists and target.suffix == ".html":
                body = target.read_text() if target.exists() else git("show", "HEAD:" + rel).decode()
                p = HTML(); p.feed(body); check(unquote(u.fragment) in p.ids, "html_anchor", link)
    changed = set(git("diff", "--no-ext-diff", "--name-only", "-z", "--no-renames", BASE, "--").decode().split("\0"))
    changed |= set(git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0"))
    outside = sorted(p for p in changed if p and not p.startswith(PREFIX))
    check(not outside, "changes_only_v25", outside)
    RESULTS["documents"] = dict(stats)
    RESULTS["git_scope"] = {"base": BASE, "head": git("rev-parse", "HEAD").decode().strip(), "outside_v25": outside}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-png", type=int, help="Optional final count confirmed by the coordinator.")
    args = parser.parse_args()
    snapshot = lambda: {str(p.relative_to(ROOT)): digest(p) for p in ROOT.rglob("*")
                        if p.is_file() and p != REPORT and "__pycache__" not in p.parts}
    before = snapshot()
    try:
        manifest = read(ROOT / "ASSET_MANIFEST_V25.json")
        assets, actual, sources = validate_assets(manifest, args.expected_png)
        for label, action in [
            ("receipts", lambda: validate_receipts(assets, actual)),
            ("references_reviews", lambda: validate_references_and_reviews(manifest, assets, actual, sources)),
            ("documents_scope", documents_and_scope),
        ]:
            try: action()
            except Exception as exc: check(False, label + "_exception", repr(exc))
    except Exception as exc: check(False, "assets_exception", repr(exc))
    check(before == snapshot(), "stable_inputs", "Input files changed during validation.")
    report = {"schema": "rec-v25-release-qa-1", "generated_at": datetime.now(timezone.utc).isoformat(),
              "status": "FAIL" if ERRORS else "PASS", "parent_commit": BASE,
              "validator_sha256": digest(Path(__file__)), "checks": RESULTS, "errors": ERRORS,
              "browser_qa_performed": False, "engine_tests_performed": False,
              "visual_fidelity_certified": False, "pixels_edited": False, "git_mutation": False,
              "limits": ["Technical reconciliation only; independent visual reviews are not repeated.",
                         "External links and remote blobs are not fetched again.",
                         "Native reference bitmaps remain outside the repository and must be present for this check."],
              "only_written_file": PREFIX + "reports/QA_V25.json"}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "errors": ERRORS, "report": str(REPORT)}, ensure_ascii=False))
    return bool(ERRORS)


if __name__ == "__main__":
    raise SystemExit(main())

