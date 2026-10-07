const encoder = new TextEncoder();

function event(name, data) {
  return encoder.encode("event: " + name + "\ndata: " + JSON.stringify(data) + "\n\n");
}

export function generateBlockStream(request, upstream) {
  const signal = request.signal;
  const upstreamAbort = new AbortController();
  const stopUpstream = () => upstreamAbort.abort();
  if (signal) {
    if (signal.aborted) stopUpstream();
    else signal.addEventListener("abort", stopUpstream, { once: true });
  }
  if (typeof upstream === "function") upstream(upstreamAbort.signal);
  const stream = new ReadableStream({
    start(controller) {
      const send = (name, data) => controller.enqueue(event(name, data));
      send("phase", { label: "Writing markup" });
      if (signal && signal.aborted) {
        send("abort", { ok: false });
        controller.close();
        return;
      }
      const onAbort = () => {
        try { send("abort", { ok: false }); controller.close(); } catch (error) {}
      };
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      send("ready", { ok: true });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
}
