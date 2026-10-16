# PDP supplier QA — preservation record

The original local branch is `fix/pdp-supplier-options-20261015`, with commit
`f595bad9911855965042b610c3a863589dcdccb1` containing **all 15 original QA files**.

This GitHub archive branch contains the three executable review scripts and
the original five-product JSON fixture, with Git blob hashes checked against
the local commit.

**The 11 PNG screenshots are NOT fully backed up to GitHub.** Do not interpret
this branch alone as a complete copy of the worktree.

The complete original files and a binary-capable commit patch were additionally
backed up and verified on the external drive:

`/Volumes/Expansion/InnerAnimalMedia/agent-worktree-backups/2026-10-16/`

Files:
- `pdp-preview.tar.gz`: exact snapshot of all 15 QA files
- `pdp-committed-change.patch`: binary-capable Git patch for local commit
- `pdp-commit-identities.txt`: source commit and parent
- `SHA256SUMS`: SHA-256 checksums for backup files

The separate, verified local archive snapshot had SHA-256:

`e02a7d7f7ac5d5a1a2d45e37ef88b38823caeb8f2144db7df86cd5c2f2e96d50`

To inspect a restored snapshot without touching a worktree:

```bash
mkdir -p /tmp/fnf-pdp-preview-restored
tar -xzf '/Volumes/Expansion/InnerAnimalMedia/agent-worktree-backups/2026-10-16/pdp-preview.tar.gz' -C /tmp/fnf-pdp-preview-restored
(cd '/Volumes/Expansion/InnerAnimalMedia/agent-worktree-backups/2026-10-16' && shasum -a 256 -c SHA256SUMS)
```

The source worktree was left untouched and clean; no cleanup, merge or deploy is
authorized by this preservation record.
