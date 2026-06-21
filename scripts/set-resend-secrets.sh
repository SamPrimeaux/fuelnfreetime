#!/usr/bin/env zsh
# Push Resend secrets to the fuelnfreetime Worker from ./.env.cloudflare
#
# Required in .env.cloudflare:
#   RESEND_API_KEY
#
# Optional (after creating webhooks in Resend):
#   RESEND_WEBHOOK_SECRET_OUTBOUND=whsec_...
#   RESEND_WEBHOOK_SECRET_INBOUND=whsec_...
#
# Usage:
#   ./scripts/set-resend-secrets.sh
#   ./scripts/set-resend-secrets.sh --api-only

emulate -R zsh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.cloudflare"
API_ONLY=false
[[ "${1:-}" == "--api-only" ]] && API_ONLY=true

if [[ ! -f "$ENV_FILE" ]]; then
  print -u2 "Missing ${ENV_FILE}"
  print -u2 "  cp .env.cloudflare.example .env.cloudflare"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ -z "${RESEND_API_KEY:-}" ]]; then
  print -u2 "RESEND_API_KEY not set in ${ENV_FILE}"
  exit 1
fi

cd "$ROOT"

print "Setting RESEND_API_KEY on worker fuelnfreetime…"
printf '%s' "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY

if [[ "$API_ONLY" == true ]]; then
  print "Done (API key only)."
  exit 0
fi

if [[ -n "${RESEND_WEBHOOK_SECRET_OUTBOUND:-}" ]]; then
  print "Setting RESEND_WEBHOOK_SECRET_OUTBOUND…"
  printf '%s' "$RESEND_WEBHOOK_SECRET_OUTBOUND" | npx wrangler secret put RESEND_WEBHOOK_SECRET_OUTBOUND
else
  print "Skip RESEND_WEBHOOK_SECRET_OUTBOUND — add to .env.cloudflare after Resend outbound webhook"
fi

if [[ -n "${RESEND_WEBHOOK_SECRET_INBOUND:-}" ]]; then
  print "Setting RESEND_WEBHOOK_SECRET_INBOUND…"
  printf '%s' "$RESEND_WEBHOOK_SECRET_INBOUND" | npx wrangler secret put RESEND_WEBHOOK_SECRET_INBOUND
else
  print "Skip RESEND_WEBHOOK_SECRET_INBOUND — add to .env.cloudflare after Resend inbound webhook"
fi

print "Done. Test: Admin → Mail → Test Resend"
