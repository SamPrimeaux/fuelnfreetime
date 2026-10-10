export interface MiniAgentSam {
  select(resource: unknown, bounds: () => DOMRect | null): void;
  close(): void;
  destroy(): void;
}
export function createMiniAgentSam(host: {
  preferAbove?: boolean;
  resultStatus?: string;
  capabilities?: { list: () => unknown[] };
  send: (args: { prompt: string; signal: AbortSignal }) => Promise<{ reply: string }>;
  onResult?: (result: { reply: string }) => void;
  onClose?: () => void;
}): MiniAgentSam;
