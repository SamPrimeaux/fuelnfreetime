export function resolveProvider(manifest, capability = "code.generate") {
  const providers = (manifest && manifest.providers) || [];
  const match = providers.find((provider) => (provider.capabilities || []).includes(capability));
  if (!match) throw new Error("no provider for " + capability);
  return {
    provider: match.name || "",
    model: match.model || "",
    endpoint: match.endpoint || "",
    capability,
  };
}

export async function generateWithProvider(manifest, request, signal, options = {}) {
  const capability = options.capability || request?.capability || "code.generate";
  const selected = resolveProvider(manifest, capability);
  const response = await fetch(selected.endpoint, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      capability,
      provider: selected.provider,
      model: selected.model,
      input: request,
    }),
  });
  return { selected, response };
}
