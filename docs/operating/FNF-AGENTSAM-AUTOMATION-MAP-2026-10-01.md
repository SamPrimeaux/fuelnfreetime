---
project: fuelnfreetime
kind: agentsam-automation-map
status: working
date: 2026-10-01
observed_cli_version: 2.6.7
---

# AgentSam automation map for brand/site operations

## Purpose

Fuel & Free Time should first establish a clean, truthful brand/site/admin operating model.

After that, AgentSam CLI/machine capabilities can automate parts of the workflow.

Do not design future CLI commands by pretending capabilities already exist.

## 1. Observed current CLI capabilities

Local binary:
Users/samprimeaux/.nvm/versions/node/v22.22.2/bin/agentsam

Version:
2.6.7

### agentsam context

Observed:
- identifies SamPrimeaux/fuelnfreetime
- root path
- branch/revision/dirty state
- core endpoint
- bridge status

Useful for attaching receipts to a specific repo/revision and refusing to treat stale output as current.

### agentsam machine

Observed help:
- machine inspect path
- machine doctor

Current contract:
- deterministic,
- read-only by default,
- network-free for inspect,
- large detail externalized under .agentsam/machine/runs,
- remote fetch/probe, optimization, storage, and reference rewriting are separate explicit actions.

Observed F&FT run:
- 877 files
- 16,952,913 bytes
- externalized receipt under .agentsam/machine/runs/run_97ad9032154dd6d9

This is useful raw perception, not a brand/site audit by itself.

### agentsam repo

Observed:
- snapshot
- history
- compare
- JSON receipt

Observed F&FT summary:
- 872 files
- 836 source
- about 212k lines
- highest change pressure in apps/ecommerce-cms-agentsam

Useful for architecture/churn context and release baselines.

### agentsam index

Observed:
- plan
- run
- status
- history
- show
- setup-store
- optional embedding path

Observed stored F&FT generation:
- created 2026-09-30
- commit 78c681ec
- 718 files
- 3,760 chunks
- 11,827 symbols
- 19,598 edges

The current audit baseline is 96fdacdf, so that generation is stale for exact current-source questions.

Rule:
refresh/rebuild or label index findings with generation/revision.

### Other current catalog capabilities observed

Top-level CLI advertises inspect, setup, skills, status, models, credentials, deploy, codebaseindex, security, account/API-key helpers, and cloud helpers.

Treat exact behavior as current only after the relevant command help/receipt is inspected.

## 2. What AgentSam can already help with

Repository evidence:
- inventory files,
- identify generated/source material,
- repo snapshots,
- compare state over time,
- deterministic receipts.

Codebase evidence:
- index source,
- retrieve structure/symbols,
- support blast-radius analysis,
- identify likely source owners.

Asset evidence:
machine inspection can be the deterministic base for asset inventory, dimensions/types, duplicates, generated/cache classification, and later optimization planning.

Optimization itself should remain an explicit operation with receipts.

Skills:
portable skills can encode repeatable audit procedures without hardcoding F&FT into the CLI.

Potential future skills:
- brand-site-audit
- storefront-release-check
- cms-page-contract
- media-library-closeout
- commerce-launch-proof

A skill is guidance/workflow. It must not pretend a missing machine/API capability exists.

## 3. Proposed brand/site command family

These names are PROPOSED, not current commands.

### agentsam brand inspect

Inputs:
- repo,
- brand dossier,
- optional live URL,
- asset roots.

Outputs:
- brand-source map,
- confirmed/proposed/TBD extraction,
- asset inventory,
- contradictions,
- missing production masters,
- receipt.

### agentsam site audit

Outputs:
- route matrix,
- dead/legacy routes,
- placeholder/demo findings,
- metadata state,
- accessibility/performance checks where tools exist,
- audit-ledger candidates.

### agentsam page plan slug

Outputs:
- page job,
- audience,
- CTA,
- required proof,
- section contract,
- CMS controls,
- SEO package,
- acceptance tests,
- text wireframe.

### agentsam site launch-check

Composes build, routes, conversion tests, metadata, placeholders, policies, admin operability, and release blockers.

Must distinguish verified, unavailable, and manual verification required.

### agentsam media plan

Read-only first:
- existing media,
- duplicates,
- oversized files,
- missing derivatives,
- missing alt/SEO metadata,
- usage references.

Keep optimization/write as a separate explicit step.

## 4. Contract-first storage model

Do not make Markdown prose the only machine-readable truth.

Future portable schemas may include:
- brand-project-v1.json
- page-contract-v1.json
- audit-item-v1.json
- launch-gate-v1.json
- visual-reference-v1.json
- media-plan-v1.json

Markdown can be generated for humans from those contracts.

Fuel & Free Time is the proving instance, not the schema itself.

## 5. Deterministic-first workflow

1. agentsam context
2. machine/repo perception
3. source-authority discovery
4. current index refresh when needed
5. deterministic route/file/asset checks
6. structured findings
7. model-assisted synthesis/design recommendations
8. human approval
9. explicit write/build operations
10. verification receipt

Do not use an LLM to guess information the machine can measure.

Do not use a machine receipt to claim brand strategy that only a human/client can approve.

## 6. Immediate AgentSam alignment work after F&FT docs settle

A. Refresh the current code index.

B. Compare agentsam inspect vs agentsam machine inspect and remove split-brain authority language. Clearly define repository authority inspection, native machine perception, semantic/code index, and asset-specific operations.

C. Make machine binary resolution portable. AGENTSAM_MACHINE_BIN should remain an override, not something random users must understand for normal installation.

D. Reuse packaged AgentSam error contracts. Brand/site/machine workflows should not invent GOAP-, media-, or audit-specific error systems.

E. Treat GOAP as optional planning machinery. Audit/page/brand contracts must remain usable without GOAP-specific persistence.

F. Make receipts composable. A launch check should be able to cite repo snapshot, machine inspection, index generation, route tests, browser tests, commerce tests, and artifact hashes.

## 7. Boundary

The goal is not an AI website builder that blindly generates pages.

The goal is a portable operator system that can inspect what exists, understand declared brand truth, propose an outcome, produce mockups/plans, execute approved work, verify real behavior, preserve receipts, and package proven patterns for reuse.
