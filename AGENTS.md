# Visit Beloretsk: development and publishing

The owner has chosen one continuing public map:
https://poletavkinvladislav2025-dot.github.io/mratkino-3d-map/preview/unified/?place=all

Update this existing path for all future changes. Do not create another map copy, preview path or replacement URL unless explicitly requested. Use the existing `unified.yml` workflow. Existing Tilda iframe and loader URLs must keep working. Other published paths are archived compatibility versions; preserve them, do not present them as the current map.

Keep owner-supplied coordinates and source provenance. Do not fabricate walking paths between endpoints. Big Kraka's new A/B and the older southern passport point are distinct; the supplied BUT track ends near the southern point, not at the new B.

Validate changes with the relevant unit checks, production build and focused browser tests for changed map behavior. Network-backed browser tests use the existing tile relay and real provider data.

The owner authorized automatic publication after changes and successful relevant checks on 2026-11-09. Publish using the existing workflow and permanent map URL without asking for confirmation again. This supersedes earlier task-specific holds on publication.

Use a unique main dispatch commit for each Pages release. Update `publication/unified.json` on main (in an isolated worktree, preserving all other files) to record the tested previewRef before dispatching `unified.yml` from main. Reusing the same main SHA on 2026-11-09 reported success while still serving the previous artifact; a fresh metadata-only main commit fixed publication. Keep the application changes on the continuing map branch; do not merge unrelated application files into main merely to obtain a new release SHA, and do not broaden the github-pages environment branch policy.
