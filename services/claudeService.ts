type ClaudeJSON = Record<string, any>;

export async function callClaudeJSON<T extends ClaudeJSON>(args: {
  system: string;
  user: string;
  jsonSchema: any; // JSON Schema (simplificado)
  maxTokens?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurado");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: args.maxTokens ?? 4096,
      system: args.system,
      messages: [{ role: "user", content: args.user }],
      output_config: {
        format: { type: "json_schema", schema: args.jsonSchema },
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API erro ${res.status}: ${t}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Resposta vazia do Claude");

  // Claude retorna JSON como string em content[0].text
  return JSON.parse(text) as T;
}
