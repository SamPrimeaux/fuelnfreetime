/** Live CMS editor WebSocket client (Theme editor + Page editor) */

window.connectCmsLive = function connectCmsLive(slug, hooks = {}) {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/api/admin/cms/live/${encodeURIComponent(slug)}`;
  let ws;
  let closed = false;
  let reconnectTimer;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      hooks.onConnect?.();
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type === "connected") hooks.onConnected?.(data);
      if (data.type === "section:updated" || data.type === "section:saved") {
        hooks.onSectionUpdated?.(data);
      }
      if (data.type === "published") hooks.onPublished?.(data);
      if (data.type === "error") hooks.onError?.(data.error);
    };

    ws.onclose = () => {
      if (closed) return;
      hooks.onDisconnect?.();
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      hooks.onError?.("WebSocket error");
    };
  }

  connect();

  return {
    patchSection(sectionKey, content) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "section:patch", slug, sectionKey, content }));
      }
    },
    publish() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "publish", slug }));
      }
    },
    close() {
      closed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
};
