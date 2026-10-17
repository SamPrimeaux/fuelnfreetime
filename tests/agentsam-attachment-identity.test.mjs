import test from "node:test";
import assert from "node:assert/strict";
import { __setApplicationAccountId } from "../apps/ecommerce-cms-agentsam/backend/lib/account-context.js";
import { normalizeAttachments, resolvePrimaryImageBase64 } from "../apps/ecommerce-cms-agentsam/backend/agentsam/attachments.js";
import { hydrateAttachmentsForChat } from "../apps/ecommerce-cms-agentsam/backend/agentsam/files.js";

const testAccount = "acct_attachment_p0";
const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("R2 attachment IDs survive normalization and the image is supplied as actual bytes", async () => {
  const record = { attachment_id: "att_valid", name: "screen.png", mime_type: "image/png", kind: "image",
    image_base64: "iVBORw0KGgo=", size_bytes: bytes.length, url: "/media/test/screen.png" };
  const list = normalizeAttachments([record]);
  assert.equal(list.length, 1);
  assert.equal(list[0].attachment_id, "att_valid");
  assert.equal(list[0].image_base64, record.image_base64);
  const result = await resolvePrimaryImageBase64({}, list, "https://example.com/admin");
  assert.equal(result.image_base64, record.image_base64);
  assert.equal(result.attachment.name, "screen.png");
});

test("chat hydration loads the account-owned R2 object and rejects missing IDs", async () => {
  __setApplicationAccountId(testAccount);
  const queries = [];
  const env = {
    DB: {
      prepare(sql) {
        return { bind(...values) {
          queries.push({ sql, values });
          return { async first() {
            if (values[0] !== "att_valid" || values[1] !== testAccount) return null;
            return { id: "att_valid", account_id: testAccount, file_name: "screen.png",
              mime_type: "image/png", file_size_bytes: bytes.length,
              r2_key: "agentsam/attachments/test/screen.png",
              preview_url: "/media/agentsam/attachments/test/screen.png" };
          } };
        } };
      },
    },
    WEBSITE_ASSETS: {
      async get(key) {
        assert.equal(key, "agentsam/attachments/test/screen.png");
        return { async arrayBuffer() { return bytes.buffer.slice(0); } };
      },
    },
  };
  try {
    const { attachments, context } = await hydrateAttachmentsForChat(env,
      [{ attachment_id: "att_valid" }], "https://example.com/admin/agentsam");
    assert.equal(queries.length > 0, true);
    assert.deepEqual(queries[0].values, ["att_valid", testAccount]);
    assert.equal(attachments[0].attachment_id, "att_valid");
    assert.equal(attachments[0].image_base64, "iVBORw0KGgo=");
    assert.equal(context.has_image, true);
    assert.equal(context.image_mime_type, "image/png");
    await assert.rejects(
      hydrateAttachmentsForChat(env, [{ attachment_id: "att_other_account" }],
        "https://example.com/admin/agentsam"),
      /not authorized/
    );
    await assert.rejects(
      hydrateAttachmentsForChat(env, Array.from({ length: 7 }, () => ({ attachment_id: "att_valid" })),
        "https://example.com/admin/agentsam"),
      /Up to 6/
    );
  } finally {
    __setApplicationAccountId(null);
  }
});
