const DEFAULT_MAILBOXES = [
  {
    id: "mb_sam",
    address: "sam@fuelnfreetime.com",
    label: "Sam",
    kind: "personal",
    owner_name: "Sam Primeaux",
    owner_auth_email: "info@inneranimals.com",
    resend_from_name: "Sam Primeaux",
    sort_order: 10,
  },
  {
    id: "mb_connor",
    address: "connor@fuelnfreetime.com",
    label: "Connor",
    kind: "personal",
    owner_name: "Connor McNeely",
    owner_auth_email: "connordmcneely@leadershiplegacydigital.com",
    resend_from_name: "Connor McNeely",
    sort_order: 20,
  },
  {
    id: "mb_payments",
    address: "payments@fuelnfreetime.com",
    label: "Payments",
    kind: "payments",
    owner_name: "Fuel & Free Time",
    owner_auth_email: null,
    resend_from_name: "Fuel & Free Time Payments",
    sort_order: 30,
  },
];

export async function listMailboxes(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, address, label, kind, owner_name, owner_auth_email, resend_from_name,
              is_default_send, sort_order
       FROM mail_mailboxes
       ORDER BY sort_order ASC, address ASC`
    ).all();
    if (results?.length) return results;
  } catch {
    /* table may not exist */
  }
  return DEFAULT_MAILBOXES;
}

export async function getMailboxBySlug(env, slug) {
  if (!slug || slug === "all") return null;
  const boxes = await listMailboxes(env);
  const normalized = String(slug).toLowerCase();
  return (
    boxes.find((b) => b.id === slug) ||
    boxes.find((b) => b.address.split("@")[0].toLowerCase() === normalized) ||
    boxes.find((b) => b.id === `mb_${normalized}`) ||
    null
  );
}

/** Match inbound/outbound row to a mailbox address (local-part or full address). */
export function matchMailboxForMessage(row, mailboxes) {
  const hay = `${row.to_email || ""} ${row.from_email || ""}`.toLowerCase();
  for (const box of mailboxes) {
    const addr = box.address.toLowerCase();
    const local = addr.split("@")[0];
    if (hay.includes(addr) || hay.includes(`${local}@`)) return box;
  }
  return null;
}

export function mailboxFilterSql(mailbox, direction = "inbound") {
  const addr = mailbox.address.toLowerCase();
  const local = addr.split("@")[0];
  if (direction === "outbound") {
    return {
      clause: `(LOWER(from_email) = ? OR LOWER(from_email) LIKE ?)`,
      binds: [addr, `%${local}@%`],
    };
  }
  return {
    clause: `(LOWER(to_email) LIKE ? OR LOWER(to_email) = ?)`,
    binds: [`%${addr}%`, addr],
  };
}
