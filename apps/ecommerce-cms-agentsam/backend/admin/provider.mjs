export function resolveProvider(manifest) {
  const providers = (manifest && manifest.providers) || [];
  const match = providers.find((provider) => (provider.capabilities || []).includes("structured.generate"));
  if (!match) throw new Error("no provider for structured.generate");
  return { provider: match.name || "", model: match.model || "", endpoint: match.endpoint || "" };
}

export async function generateWithProvider(manifest, request, signal) {
  const selected = resolveProvider(manifest);
  const response = await fetch(selected.endpoint, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ capability: "structured.generate", provider: selected.provider, model: selected.model, input: request }),
  });
  return { selected, response };
}
