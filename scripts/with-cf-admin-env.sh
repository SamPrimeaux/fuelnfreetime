#!/usr/bin/env zsh
# Load Cloudflare credentials (break-glass preferred) and run a command.
#
# Sources, in order:
#   1. ~/inneranimalmedia/.env.cloudflare  (CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN)
#   2. Already-exported env vars in the parent shell
#
# Usage:
#   ./scripts/with-cf-admin-env.sh npx wrangler deploy
#   ./scripts/with-cf-admin-env.sh node scripts/cf-status.mjs

emulate -R zsh
set -e

IAM_ENV="${HOME}/inneranimalmedia/.env.cloudflare"
if [[ -f "$IAM_ENV" ]]; then
  set -a
  source "$IAM_ENV"
  set +a
fi

if [[ -n "${CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN}"
elif [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  print -u2 "No Cloudflare token found."
  print -u2 "  Set CLOUDFLARE_BREAK_GLASS_ADMIN_TOKEN in ~/inneranimalmedia/.env.cloudflare"
  exit 1
fi

export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID_INNERANIMALS:-${CLOUDFLARE_ACCOUNT_ID:-ede6590ac0d2fb7daf155b35653457b2}}"

exec "$@"
