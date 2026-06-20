/**
 * Fuel & Free Time GitHub client — repo-scoped, reliable path for AgentSam.
 * Uses FNF_GITHUB_TOKEN (fine-grained PAT or classic token) when set,
 * else per-admin OAuth token from admin_github_tokens.
 */

import { FNF_GITHUB_REPO } from "./constants.js";

const ALLOWED_REPOS = new Set([FNF_GITHUB_REPO.toLowerCase()]);

function trim(v) {
  return v == null ? "" : String(v).trim();
}

export function githubTokenConfigured(env) {
  return Boolean(trim(env.FNF_GITHUB_TOKEN));
}

export function normalizeRepo(raw) {
  let s = trim(raw);
  if (!s) return FNF_GITHUB_REPO;
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  s = s.replace(/\.git$/i, "").replace(/\/+$/, "");
  return s;
}

export function assertRepoAllowed(repo) {
  const slug = normalizeRepo(repo).toLowerCase();
  if (!ALLOWED_REPOS.has(slug)) {
    throw new Error(`Repo ${repo} is not allowed — AgentSam is scoped to ${FNF_GITHUB_REPO} only.`);
  }
  return slug === FNF_GITHUB_REPO ? FNF_GITHUB_REPO : repo;
}

async function resolveToken(env, userId = null) {
  const service = trim(env.FNF_GITHUB_TOKEN);
  if (service) return { token: service, source: "service" };

  if (userId && env.DB) {
    try {
      const row = await env.DB.prepare(
        `SELECT access_token, account_login, expires_at
         FROM admin_github_tokens
         WHERE user_id = ? AND provider = 'github'
         LIMIT 1`
      )
        .bind(userId)
        .first();
      if (row?.access_token) {
        const exp = row.expires_at ? Date.parse(row.expires_at) : 0;
        if (!exp || exp > Date.now()) {
          return { token: row.access_token, source: "oauth", login: row.account_login };
        }
      }
    } catch {
      /* table may not exist yet */
    }
  }

  return null;
}

async function ghFetch(token, path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "FuelNFreetime-AgentSam/1.0",
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || res.statusText || "github_error";
    throw new Error(msg);
  }
  return data;
}

export async function githubStatus(env, userId = null) {
  const auth = await resolveToken(env, userId);
  if (!auth) {
    return {
      connected: false,
      scoped_repo: FNF_GITHUB_REPO,
      source: null,
      needs: githubTokenConfigured(env) ? null : "oauth_or_service_token",
    };
  }

  try {
    const repo = assertRepoAllowed(FNF_GITHUB_REPO);
    const [owner, name] = repo.split("/");
    const meta = await ghFetch(auth.token, `/repos/${owner}/${name}`);
    return {
      connected: true,
      scoped_repo: repo,
      source: auth.source,
      login: auth.login || meta?.owner?.login || null,
      default_branch: meta?.default_branch || "main",
      private: !!meta?.private,
    };
  } catch (err) {
    return {
      connected: false,
      scoped_repo: FNF_GITHUB_REPO,
      source: auth.source,
      error: err?.message || String(err),
    };
  }
}

export async function fetchGithubContextForAgent(env, message, userId = null) {
  const auth = await resolveToken(env, userId);
  if (!auth) return null;

  const repo = assertRepoAllowed(FNF_GITHUB_REPO);
  const [owner, name] = repo.split("/");
  const hay = message.toLowerCase();

  try {
    if (/github|repo|commit|branch|pr|pull request|code|deploy|worker|migration|diff|status/.test(hay)) {
      const meta = await ghFetch(auth.token, `/repos/${owner}/${name}`);
      const branch = meta.default_branch || "main";
      const commits = await ghFetch(
        auth.token,
        `/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=5`
      );
      const lines = (Array.isArray(commits) ? commits : [])
        .map((c) => `- ${c.sha?.slice(0, 7)} ${c.commit?.message?.split("\n")[0] || ""}`)
        .join("\n");

      return `GITHUB (${repo}, branch ${branch}, source: ${auth.source}):
Recent commits:
${lines || "(none)"}`;
    }
  } catch (err) {
    return `GITHUB: ${err?.message || String(err)} — reconnect GitHub in AgentSam settings.`;
  }

  return null;
}

export async function listRepoBranches(env, userId = null) {
  const auth = await resolveToken(env, userId);
  if (!auth) return null;
  const repo = assertRepoAllowed(FNF_GITHUB_REPO);
  const [owner, name] = repo.split("/");
  const data = await ghFetch(auth.token, `/repos/${owner}/${name}/branches?per_page=20`);
  return Array.isArray(data) ? data.map((b) => b.name) : [];
}
