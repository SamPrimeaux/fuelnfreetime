/**
 * Per-page live CMS editing room — WebSocket broadcast + coordinated saves.
 * One DO instance per page slug (idFromName(slug)).
 */
import { DurableObject } from "cloudflare:workers";
import { updateSection, publishPage } from "../cms/api.js";

export class CmsEditorRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json({ error: "Expected WebSocket" }, { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const slug = url.searchParams.get("slug") || "home";
    server.serializeAttachment({ slug, joinedAt: Date.now() });

    server.send(
      JSON.stringify({
        type: "connected",
        slug,
        message: "Live editor connected — changes sync to preview in real time.",
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
      return;
    }

    const attachment = ws.deserializeAttachment() || {};
    const slug = data.slug || attachment.slug;
    if (!slug) {
      ws.send(JSON.stringify({ type: "error", error: "slug required" }));
      return;
    }

    try {
      if (data.type === "section:patch") {
        const result = await updateSection(this.env, slug, data.sectionKey, {
          content: data.content,
        });
        if (result.error) {
          ws.send(JSON.stringify({ type: "error", error: result.error }));
          return;
        }

        const outbound = {
          type: "section:updated",
          slug,
          sectionKey: data.sectionKey,
          content: data.content,
          version: result.version,
          updated_at: result.updated_at,
        };
        this.broadcast(outbound, ws);
        ws.send(JSON.stringify({ ...outbound, type: "section:saved" }));
        return;
      }

      if (data.type === "publish") {
        const result = await publishPage(this.env, slug);
        if (result.error) {
          ws.send(JSON.stringify({ type: "error", error: result.error }));
          return;
        }
        const outbound = { type: "published", slug, published_at: result.published_at };
        this.broadcast(outbound);
        ws.send(JSON.stringify(outbound));
        return;
      }

      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      ws.send(JSON.stringify({ type: "error", error: "Unknown message type" }));
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", error: err?.message || String(err) }));
    }
  }

  async webSocketClose(ws) {
    ws.close();
  }

  broadcast(payload, except) {
    const msg = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (except && socket === except) continue;
      try {
        socket.send(msg);
      } catch {
        /* closed */
      }
    }
  }
}
