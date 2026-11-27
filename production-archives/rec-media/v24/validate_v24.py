#!/usr/bin/env python3
"""Read-only V24 release validation; writes only the selected JSON report.

This checks bytes, declarations, local links and Python syntax. It does not run
the game, execute Python project files, perform browser QA, edit image pixels,
or certify visual fidelity. Requires Pillow for PNG decoding.
"""
from __future__ import annotations

import argparse
import ast
from collections import Counter
from datetime import datetime, timezone
import hashlib
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

from PIL import Image

BASELINE = "246dbb81752c5fa41a55deb3aada3941ac966fec"
PREFIX = "production-archives/rec-media/v24/"
MANIFESTS = {
    "characters": "characters/ASSET_MANIFEST_CHARACTERS_V24.json",
    "creatures": "creatures/manifest.json",
    "projectiles": "projectiles/ASSET_MANIFEST_PROJECTILES_V24.json",
    "stages": "stages/manifest.json",
}
EXPECTED = {
    "characters": {"png": 6, "candidates": 6, "superseded_trials": 0},
    "creatures": {"png": 8, "candidates": 6, "superseded_trials": 2},
    "projectiles": {"png": 6, "candidates": 5, "superseded_trials": 1},
    "stages": {"png": 3, "candidates": 3, "superseded_trials": 0},
}
FALSE_FLAGS = {
    "canonical_fidelity_1_1_certified", "canonical_one_to_one_certified",
    "engine_admitted", "engine_approved", "animation_complete",
    "parallax_complete", "post_generation_pixel_edits",
    "image_pixels_modified_after_generation", "post_generation_bitmap_edits",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dimensions(value):
    if isinstance(value, dict):
        return [value.get("width"), value.get("height")]
    return value


def declared(record):
    return {
        "sha256": record.get("sha256"),
        "git_blob_sha": record.get("git_blob_sha"),
        "dimensions": dimensions(record.get("dimensions")),
        "mode": record.get("mode", record.get("color_mode")),
        "file_bytes": record.get("file_bytes", record.get("bytes")),
        "alpha_range": record.get("alpha_range", record.get("alpha_extrema")),
    }


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.images, self.links = [], [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "img":
            self.images.append({"src": attrs.get("src"), "alt": attrs.get("alt")})
        for key in ("href", "src", "poster"):
            if attrs.get(key):
                self.links.append((attrs[key], tag + "." + key))
        if attrs.get("srcset") and not attrs["srcset"].startswith("data:"):
            self.links.extend((x.strip().split()[0], tag + ".srcset")
                              for x in attrs["srcset"].split(",") if x.strip())
        if attrs.get("style"):
            self.links.extend((m.group(1), tag + ".style")
                              for m in re.finditer(r"url\(['\"]?([^)'\"]+)", attrs["style"]))


def markdown_content(text):
    """Strip fenced code so example links are not treated as document links."""
    lines, fence = [], None
    for line in text.splitlines():
        match = re.match(r"^\s*([`~]{3,})", line)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            lines.append("")
        else:
            lines.append("" if fence else line)
    return "\n".join(lines)


def md_links(text):
    text = markdown_content(text)
    pattern = r"!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))"
    links = [(m.group(1) or m.group(2), "markdown.inline")
             for m in re.finditer(pattern, text)]
    for match in re.finditer(r"(?m)^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))", text):
        links.append((match.group(1) or match.group(2), "markdown.reference"))
    page = Page()
    page.feed(text)
    return links + page.links


def md_ids(text):
    used, result = Counter(), set()
    for line in markdown_content(text).splitlines():
        match = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        if not match:
            continue
        heading = re.sub(r"<[^>]*>", "", match.group(1))
        heading = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", heading)
        slug = re.sub(r"[^\w\- ]", "", unescape(heading).lower()).replace(" ", "-")
        n = used[slug]
        used[slug] += 1
        result.add(slug + ("-" + str(n) if n else ""))
    page = Page()
    page.feed(text)
    return result | set(page.ids)


class Validator:
    def __init__(self, root, report, baseline):
        self.root = root.resolve()
        self.repo = self.root.parents[2]
        self.report = report.resolve()
        if not self.report.is_relative_to(self.root):
            raise ValueError("The report must remain within V24.")
        self.baseline = baseline
        self.errors, self.warnings, self.results = [], [], {}
        self.json_cache, self.page_cache = {}, {}
        self.tracked = set(self.git("ls-tree", "-r", "--name-only", "-z", "HEAD").split("\0")) - {""}
        self.actual = {}
        self.by_id = {}
        self.global_paths = set()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, text=True,
                              capture_output=True, check=True).stdout

    def require(self, ok, check, detail):
        if not ok:
            self.errors.append({"check": check, "detail": detail})
        return ok

    def read_json(self, path):
        path = path.resolve()
        if path not in self.json_cache:
            self.json_cache[path] = json.loads(path.read_text(encoding="utf-8"))
        return self.json_cache[path]

    def within(self, value, base=None):
        path = ((base or self.root) / value).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Path leaves V24: " + str(value))
        return path

    def snapshot(self):
        return {str(p.relative_to(self.root)): sha256(p)
                for p in self.root.rglob("*")
                if p.is_file() and p.resolve() != self.report
                and "__pycache__" not in p.parts}

    def flags(self, obj, context):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in FALSE_FLAGS or key.endswith("_certified"):
                    # Existing author/reviewer summaries use these names for
                    # integer counts, not per-asset boolean flags. A zero count
                    # is valid here; every actual asset flag is still required
                    # to be the literal JSON false in validate_assets().
                    zero_summary_count = (type(value) is int and value == 0
                                          and ".summary" in context)
                    self.require(value is False or zero_summary_count, "false_flags",
                                 f"{context}.{key} must be false; found {value!r}")
                self.flags(value, context + "." + key)
        elif isinstance(obj, list):
            for index, value in enumerate(obj):
                self.flags(value, f"{context}[{index}]")

    def image_metadata(self, path):
        content = path.read_bytes()
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            alpha = image.getchannel("A") if "A" in image.getbands() else None
            histogram = alpha.histogram() if alpha else None
            return {
                "sha256": hashlib.sha256(content).hexdigest(),
                "git_blob_sha": hashlib.sha1(
                    b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest(),
                "dimensions": [image.width, image.height],
                "mode": image.mode,
                "file_bytes": len(content),
                "format": image.format,
                "alpha_range": list(alpha.getextrema()) if alpha else None,
                "has_alpha_channel": alpha is not None,
                "fully_transparent_pixels": histogram[0] if histogram else 0,
                "fully_opaque_pixels": histogram[255] if histogram else image.width * image.height,
                "alpha_1_to_127_pixels": sum(histogram[1:128]) if histogram else 0,
                "low_alpha_1_to_15_pixels": sum(histogram[1:16]) if histogram else 0,
            }

    def compare(self, record, actual, context, required=True):
        for key, value in declared(record).items():
            if not required and value is None:
                continue
            self.require(value == actual[key], "metadata", f"{context}: {key} declared={value!r}, actual={actual[key]!r}")
        for key in ("fully_transparent_pixels", "fully_opaque_pixels",
                    "alpha_1_to_127_pixels", "low_alpha_1_to_15_pixels"):
            if key in record:
                self.require(record[key] == actual[key], "alpha_statistics",
                             f"{context}: {key} mismatch")
        if "has_alpha_channel" in record:
            self.require(record["has_alpha_channel"] == actual["has_alpha_channel"],
                         "alpha_channel", context)

    def validate_assets(self):
        global_path = self.root / "ASSET_MANIFEST_V24.json"
        manifest = self.read_json(global_path)
        self.global_manifest = manifest
        self.flags(manifest, "global")
        assets = manifest["assets"]
        self.require(len(assets) == 23, "global_count", f"Found {len(assets)} records; expected23.")
        self.require(manifest.get("base_commit") == self.baseline, "base_commit", "Global baseline differs.")
        source_assets, source_digests, subreports = {}, {}, []
        for domain, relative in MANIFESTS.items():
            source_path = self.root / relative
            source = self.read_json(source_path)
            self.flags(source, relative)
            source_digests[relative] = sha256(source_path)
            records = source["assets"]
            self.require(len(records) == EXPECTED[domain]["png"], "source_count", relative)
            for record in records:
                aid = record["asset_id"]
                self.require(aid not in source_assets, "duplicate_source_id", aid)
                source_assets[aid] = (domain, relative, record, self.within(record["path"], source_path.parent))
            subreports.append({"path": relative, "sha256": source_digests[relative], "records": len(records)})
        counts = {d: {"png": 0, "candidates": 0, "superseded_trials": 0} for d in MANIFESTS}
        records_report = []
        for asset in assets:
            aid, relative, domain = asset["asset_id"], asset["path"], asset["domain"]
            self.require(aid not in self.by_id, "duplicate_global_id", aid)
            self.by_id[aid] = asset
            path = self.within(relative)
            self.require(relative not in self.global_paths, "duplicate_global_path", relative)
            self.global_paths.add(relative)
            if not self.require(path.is_file(), "missing_png", relative):
                continue
            actual = self.image_metadata(path)
            self.actual[relative] = actual
            self.require(actual["format"] == "PNG", "png_format", relative)
            expected_mode = "RGB" if domain == "stages" else "RGBA"
            self.require(actual["mode"] == expected_mode, "domain_mode", relative)
            if expected_mode == "RGBA":
                self.require(actual["alpha_range"][0] == 0 and actual["alpha_range"][1] > 0,
                             "real_transparency", relative)
            self.compare(asset, actual, "global/" + aid)
            for flag in ("engine_admitted", "animation_complete",
                         "canonical_fidelity_1_1_certified", "post_generation_pixel_edits"):
                self.require(asset.get(flag) is False, "required_false_flag", aid + "." + flag)
            if domain == "stages":
                self.require(asset.get("parallax_complete") is False, "stage_parallax_flag", aid)
            self.require(type(asset.get("candidate")) is bool, "candidate_boolean", aid)
            candidate = asset.get("candidate") is True
            self.require(candidate == (asset["status"] != "superseded_trial"), "candidate_status", aid)
            counts[domain]["png"] += 1
            counts[domain]["candidates" if candidate else "superseded_trials"] += 1
            if self.require(aid in source_assets, "missing_source_record", aid):
                source_domain, source_name, source, source_file = source_assets[aid]
                self.require(source_domain == domain and source_file == path, "source_path", aid)
                self.require(asset["status"] == source["status"], "source_status", aid)
                self.require(asset["source_manifest"] == source_name, "source_manifest", aid)
                self.require(asset["source_manifest_sha256"] == source_digests[source_name],
                             "source_manifest_digest", aid)
                self.compare(source, actual, source_name + "/" + aid)
                for flag in ("engine_admitted", "canonical_fidelity_1_1_certified"):
                    self.require(source.get(flag) is False, "source_required_false_flag", aid + "." + flag)
                if domain != "stages":
                    self.require(source.get("animation_complete") is False, "source_animation_flag", aid)
            records_report.append({"asset_id": aid, "path": relative, "candidate": candidate, **actual})
        self.require(set(source_assets) == set(self.by_id), "source_global_orphans", "Global/source IDs differ.")
        disk = {str(p.relative_to(self.root)) for p in self.root.rglob("*") if p.suffix.lower() == ".png"}
        self.require(disk == self.global_paths, "png_orphans",
                     {"unmanifested": sorted(disk - self.global_paths), "missing": sorted(self.global_paths - disk)})
        summary = manifest["summary"]
        for domain in EXPECTED:
            self.require(counts[domain] == EXPECTED[domain], "domain_counts", {domain: counts[domain]})
        for key, expected in (("png", 23), ("candidates", 20), ("superseded_trials", 3)):
            self.require(summary.get(key) == expected, "summary_counts", key)
        self.require(summary.get("by_domain") == counts, "summary_by_domain", counts)
        total_bytes = sum(r["file_bytes"] for r in self.actual.values())
        self.require(summary.get("total_png_bytes") == total_bytes, "summary_bytes", total_bytes)
        for row in manifest.get("submanifests", []):
            self.require(row["sha256"] == source_digests.get(row["path"]), "submanifest_index", row["path"])
        self.results["assets"] = {"records": records_report, "by_domain": counts,
                                  "modes": dict(Counter(r["mode"] for r in self.actual.values())),
                                  "total_png_bytes": total_bytes,
                                  "png_count": len(disk), "global_manifest_sha256": sha256(global_path)}
        self.results["source_manifests"] = subreports

    def validate_receipts(self):
        seen_ids, seen_paths, result = set(), set(), []
        for domain in MANIFESTS:
            file = self.root / domain / "GIT_BLOBS_V24.json"
            doc = self.read_json(file)
            records = doc.get("blobs", doc.get("assets", []))
            for row in records:
                aid = row["asset_id"]
                p = row["path"]
                if p.startswith(PREFIX):
                    p = p[len(PREFIX):]
                else:
                    p = str(self.within(p, file.parent).relative_to(self.root))
                self.require(aid not in seen_ids, "duplicate_receipt_id", aid)
                self.require(p not in seen_paths, "duplicate_receipt_path", p)
                seen_ids.add(aid)
                seen_paths.add(p)
                if self.require(aid in self.by_id and p in self.actual, "receipt_orphan", aid):
                    self.require(self.by_id[aid]["path"] == p, "receipt_asset_path", aid)
                    self.require(row["sha"] == self.actual[p]["git_blob_sha"], "receipt_git_sha", aid)
                    self.require(row["bytes"] == self.actual[p]["file_bytes"], "receipt_bytes", aid)
                    if "sha256" in row:
                        self.require(row["sha256"] == self.actual[p]["sha256"], "receipt_sha256", aid)
                result.append({"asset_id": aid, "path": p, "sha": row["sha"], "bytes": row["bytes"]})
        self.require(len(result) == 23 and seen_ids == set(self.by_id) and seen_paths == self.global_paths,
                     "receipt_coverage", "Exactly one matching receipt is required per PNG.")
        self.results["git_blob_receipts"] = {"count": len(result), "records": result,
                                            "remote_fetch_performed": False,
                                            "scope": "Local receipts compared with actual PNG Git hashes; no network recheck."}

    def review_path(self, value, report_path):
        if value.startswith(PREFIX):
            return value[len(PREFIX):]
        if value.startswith(tuple(d + "/" for d in MANIFESTS)):
            return value
        return str(self.within(value, report_path.parent).relative_to(self.root))

    def validate_reviews(self):
        coverage, reports, report_coverage = set(), [], {}
        review_files = self.global_manifest["independent_review_reports"]
        self.require(len(review_files) == 5, "review_report_count", str(review_files))
        for value in review_files:
            path = self.within(value)
            doc = self.read_json(path)
            self.flags(doc, value)
            rows = doc.get("assets", [doc] if "asset_id" in doc else [])
            report_covered = []
            for row in rows:
                relative = self.review_path(row["path"], path)
                if not self.require(relative in self.actual, "review_orphan", relative):
                    continue
                if row.get("asset_id"):
                    self.require(self.by_id.get(row["asset_id"], {}).get("path") == relative,
                                 "review_asset_id", relative)
                self.compare(row, self.actual[relative], value + "/" + relative, required=False)
                if isinstance(row.get("technical_measurements"), dict):
                    self.compare(row["technical_measurements"], self.actual[relative],
                                 value + "/technical/" + relative, required=False)
                self.require(row.get("sha256") == self.actual[relative]["sha256"], "review_digest", relative)
                coverage.add(relative)
                report_covered.append(relative)
            if "first_pass_sha256" in doc:
                first = self.within(doc["first_pass_report"], path.parent)
                self.require(first.is_file() and sha256(first) == doc["first_pass_sha256"],
                             "first_pass_review_digest", value)
            if value.endswith("INDEPENDENT_CREATURES_V24.json"):
                self.require(len(rows) == 7, "creature_first_pass_count", value)
            if value.endswith("INDEPENDENT_CREATURES_CORRECTION_V24.json"):
                self.require(len(rows) == 1, "creature_correction_count", value)
            if "author_manifest_sha256" in doc:
                domain = "characters" if "CHARACTERS" in value else "stages"
                self.require(doc["author_manifest_sha256"] == sha256(self.root / MANIFESTS[domain]),
                             "review_author_manifest_digest", value)
            report_coverage[value] = set(report_covered)
            reports.append({"path": value, "sha256": sha256(path), "covered_pngs": report_covered})
        self.require(coverage == self.global_paths, "review_coverage",
                     {"missing": sorted(self.global_paths - coverage)})
        for asset in self.by_id.values():
            for value in asset.get("review_reports", []):
                self.require(value in review_files, "asset_review_reference", asset["asset_id"] + ":" + value)
            self.require(any(asset["path"] in report_coverage.get(value, set())
                             for value in asset.get("review_reports", [])),
                         "asset_review_coverage", asset["asset_id"])
        for field in ("ci_baseline_report", "progress", "work_queue", "release_validation"):
            target = self.within(self.global_manifest[field])
            self.require(target == self.report or target.is_file(), "global_document_reference", field)
        self.results["independent_reviews"] = {"reports": reports, "covered_png_count": len(coverage),
                                                "visual_review_reperformed_by_validator": False}
        self.results["ci_baseline"] = {"path": self.global_manifest["ci_baseline_report"],
                                       "scope": "Report presence checked; no CI run performed or success inferred."}

    def read_document(self, path):
        if path.exists():
            return path.read_text(encoding="utf-8")
        relative = str(path.relative_to(self.repo))
        return self.git("show", "HEAD:" + relative)

    def anchors(self, path):
        if path not in self.page_cache:
            text = self.read_document(path)
            if path.suffix.lower() == ".md":
                self.page_cache[path] = md_ids(text)
            else:
                page = Page()
                page.feed(text)
                self.page_cache[path] = set(page.ids)
        return self.page_cache[path]

    def validate_links(self):
        records, external, pages = [], 0, []
        for path in sorted(self.root.rglob("*")):
            if path.suffix.lower() not in (".html", ".md"):
                continue
            text = path.read_text(encoding="utf-8")
            if path.suffix.lower() == ".html":
                page = Page()
                page.feed(text)
                duplicate_ids = [x for x, n in Counter(page.ids).items() if n > 1]
                self.require(not duplicate_ids, "duplicate_html_ids", {str(path): duplicate_ids})
                self.require(all(x for x in page.ids), "empty_html_ids", str(path))
                for img in page.images:
                    self.require(isinstance(img["alt"], str) and bool(img["alt"].strip()),
                                 "image_alt", {"file": str(path.relative_to(self.root)), "src": img["src"]})
                alt_sources = {}
                for img in page.images:
                    alt_sources.setdefault(img["alt"], set()).add(img["src"])
                self.require(all(len(v) == 1 for v in alt_sources.values()), "distinct_image_alt",
                             str(path.relative_to(self.root)) + ": same alt used for different images")
                pages.append({"path": str(path.relative_to(self.root)), "ids": len(page.ids),
                              "images": len(page.images), "duplicate_ids": duplicate_ids})
                links = page.links
            else:
                links = md_links(text)
            for raw, origin in links:
                parsed = urlsplit(unescape(raw))
                if parsed.scheme in ("http", "https", "mailto", "tel", "data") or parsed.netloc:
                    external += 1
                    continue
                if parsed.scheme:
                    self.require(False, "unsupported_local_link_scheme", {"file": str(path), "url": raw})
                    continue
                name = unquote(parsed.path)
                target = (self.repo / name.lstrip("/")) if name.startswith("/") else (path.parent / name)
                if not name:
                    target = path
                target = target.resolve()
                if not self.require(target.is_relative_to(self.repo), "link_outside_repo",
                                    {"file": str(path.relative_to(self.root)), "url": raw,
                                     "resolved": str(target)}):
                    continue
                relative = str(target.relative_to(self.repo))
                via = None
                if target == self.report:
                    via = "this_validation_report"
                elif target.is_relative_to(self.root) and target.exists():
                    via = "filesystem"
                elif relative in self.tracked:
                    via = "filesystem" if target.exists() else "git_ls_tree_HEAD"
                elif any(x.startswith(relative.rstrip("/") + "/") for x in self.tracked):
                    via = "git_directory"
                if not self.require(via is not None, "broken_local_link",
                                    {"file": str(path.relative_to(self.root)), "url": raw, "resolved": relative}):
                    continue
                fragment = unquote(parsed.fragment)
                if fragment and target.suffix.lower() in (".html", ".md"):
                    self.require(fragment in self.anchors(target), "missing_fragment",
                                 {"file": str(path.relative_to(self.root)), "url": raw})
                records.append({"from": str(path.relative_to(self.root)), "target": relative,
                                "fragment": fragment or None, "via": via, "origin": origin})
        self.results["local_links"] = {"checked": len(records), "external_links_not_fetched": external,
                                       "records": records, "html_pages": pages,
                                       "browser_rendering_performed": False}

    def validate_syntax_and_scope(self):
        json_documents = []
        for path in sorted(self.root.rglob("*.json")):
            if path.resolve() == self.report:
                continue
            try:
                self.read_json(path)
                json_documents.append({"path": str(path.relative_to(self.root)), "status": "PASS"})
            except (json.JSONDecodeError, UnicodeError) as exc:
                self.require(False, "json_syntax", str(path) + ": " + str(exc))
                json_documents.append({"path": str(path.relative_to(self.root)), "status": "FAIL"})
        self.results["json_syntax"] = {"documents": json_documents}
        syntax = []
        for path in sorted(self.root.rglob("*.py")):
            try:
                ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
                syntax.append({"path": str(path.relative_to(self.root)), "status": "PASS"})
            except SyntaxError as exc:
                self.require(False, "python_syntax", str(exc))
                syntax.append({"path": str(path.relative_to(self.root)), "status": "FAIL"})
        self.results["python_syntax"] = {"method": "ast.parse only; no project file executed", "files": syntax}
        changed = set(self.git("diff", "--no-ext-diff", "--name-only", "-z", "--no-renames", self.baseline, "--").split("\0")) - {""}
        untracked = set(self.git("ls-files", "--others", "--exclude-standard", "-z").split("\0")) - {""}
        outside = sorted(x for x in changed | untracked if not x.startswith(PREFIX))
        self.require(not outside, "changes_outside_v24", outside)
        self.results["scope"] = {"baseline": self.baseline, "head": self.git("rev-parse", "HEAD").strip(),
                                 "tracked_changed_paths": sorted(changed), "untracked_paths": sorted(untracked),
                                 "paths_outside_v24": outside, "index_or_ref_writes_performed": False}

    def run(self):
        before = self.snapshot()
        steps = [
            ("assets", self.validate_assets),
            ("git_blob_receipts", self.validate_receipts),
            ("independent_reviews", self.validate_reviews),
            ("local_links", self.validate_links),
            ("syntax_and_scope", self.validate_syntax_and_scope),
        ]
        for name, action in steps:
            try:
                action()
            except Exception as exc:
                self.errors.append({"check": name + "_exception", "detail": repr(exc)})
        after = self.snapshot()
        changed_inputs = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
        self.require(not changed_inputs, "inputs_changed_during_validation", changed_inputs)
        report = {
            "schema": "rec-v24-release-qa-1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "validator": "validate_v24.py",
            "validator_sha256": sha256(Path(__file__)),
            "status": "PASS" if not self.errors else "FAIL",
            "scope": "V24 only; 23 PNGs, 20 candidates and 3 superseded trials",
            "expected_png_count": 23,
            "expected_candidate_count": 20,
            "expected_superseded_trial_count": 3,
            "checks": self.results,
            "errors": self.errors,
            "warnings": self.warnings,
            "inputs_unchanged_during_validation": not changed_inputs,
            "browser_qa_performed": False,
            "game_or_engine_tests_performed": False,
            "visual_fidelity_certified": False,
            "image_pixels_edited": False,
            "only_written_file": str(self.report.relative_to(self.repo)),
            "limits": [
                "Technical and document integrity only. Independent visual reviews are reconciled, not repeated.",
                "Receipt hashes are checked against local PNG bytes; remote blobs are not fetched again.",
                "External web links are not fetched. Sparse historical links are checked against HEAD via git ls-tree.",
                "No CI rerun, browser rendering, engine integration, animation or 1:1 fidelity certification.",
            ],
        }
        self.report.parent.mkdir(parents=True, exist_ok=True)
        self.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"status": report["status"], "png": len(self.actual), "errors": len(self.errors),
                          "report": str(self.report.relative_to(self.repo))}, ensure_ascii=False))
        if self.errors:
            print(json.dumps(self.errors, ensure_ascii=False, indent=2))
        return 0 if not self.errors else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", default=BASELINE)
    parser.add_argument("--report", default="reports/QA_RELEASE_V24.json",
                        help="Path relative to V24; must stay within V24.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    return Validator(root, root / args.report, args.baseline).run()


if __name__ == "__main__":
    sys.exit(main())

