#!/usr/bin/env zsh
# Load Cloudflare credentials for the fuelnfreetime repo and run a command.
#
# Sources, in order:
#   1. ./.env.cloudflare in this repo (preferred — customer-scoped)
#   2. ~/inneranimalmedia/.env.cloudflare (platform fallback)
#   3. Already-exported env vars in the parent shell
#
# Usage:
#   ./scripts/with-cf-admin-env.sh npx wrangler deploy
#   ./scripts/with-cf-admin-env.sh node scripts/setup-resend-dns.mjs

emulate -R zsh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ENV="${ROOT}/.env.cloudflare"
IAM_ENV="${HOME}/inneranimalmedia/.env.cloudflare"

if [[ -f "$REPO_ENV" ]]; then
  set -a
  source "$REPO_ENV"
  set +a
elif [[ -f "$IAM_ENV" ]]; then
  set -a
  source "$IAM_ENV"
  set +a
fi

_cf_token_valid() {
  local token="$1"
  [[ -n "$token" ]] || return 1
  curl -sf -H "Authorization: Bearer ${token}" \
    "https://api.cloudflare.com/client/v4/user/tokens/verify" \
    | grep -q '"success":true'
}

if [[ -n "${CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN:-}" ]] && _cf_token_valid "${CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN}"; then
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN}"
elif [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] && _cf_token_valid "${CLOUDFLARE_API_TOKEN}"; then
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
elif [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  print -u2 "No valid Cloudflare API token found."
  print -u2 "  Copy .env.cloudflare.example → .env.cloudflare in ${ROOT}"
  exit 1
else
  print -u2 "Cloudflare API token failed verify — check ${REPO_ENV} or ${IAM_ENV}"
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-ede6590ac0d2fb7daf155b35653457b2}"

exec "$@"
