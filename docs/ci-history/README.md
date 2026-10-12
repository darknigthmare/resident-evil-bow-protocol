# Historical workflows

Release publishers v0.4, v0.5, v0.6 and v0.6.1 are archived here instead of `.github/workflows/` to prevent obsolete releases being triggered by current package changes. Existing tags and release assets are unchanged. The active publisher is `.github/workflows/release-v070.yml`, guarded by package version and complete QA.

The completed v0.7 public-reference inspection workflow is retained here for provenance. Its source collector remains in `scripts/inspect-catalog-sources.py`; it does not run automatically. Integration transfer payloads were removed after their checksums, generated content, tests and build all succeeded.
