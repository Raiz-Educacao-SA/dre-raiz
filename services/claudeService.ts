type ClaudeJSON = Record<string, any>;

export async function callClaudeJSON<T extends ClaudeJSON>(args: {
  system: string;
  user: string;
  jsonSchema: any;
  maxTokens?: number;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurado");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

  // Usa tool_use para forçar resposta em JSON estruturado
  const tool = {
    name: "analysis_pack",
    description: "Retorna o AnalysisPack estruturado com sumário executivo, ações, charts e slides.",
    input_schema: args.jsonSchema,
  };

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
      tools: [tool],
      tool_choice: { type: "tool", name: "analysis_pack" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API erro ${res.status}: ${t}`);
  }

  const data = await res.json();

  // tool_use retorna o JSON diretamente em content[].input
  const toolBlock = data?.content?.find((b: any) => b.type === "tool_use");
  if (toolBlock?.input) {
    return toolBlock.input as T;
  }

  // Fallback: text block com JSON
  const text = data?.content?.find((b: any) => b.type === "text")?.text;
  if (!text) throw new Error("Resposta vazia do Claude");
  return JSON.parse(text) as T;
}
