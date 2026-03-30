import { Type } from '@sinclair/typebox';
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { appendDailyMemory, resolveConfig, searchMemory } from './core.js';

export default definePluginEntry({
  id: 'marq-memory',
  name: 'Marq Memory',
  description: 'Markdown-first memory plugin with layered storage and append-only daily notes.',
  register(api) {
    const cfg = resolveConfig(api.config ?? {});

    api.registerTool({
      name: 'marq_memory_search',
      description: 'Search markdown-based memory across core memory files, daily notes, facts, and optional docs.',
      parameters: Type.Object({
        query: Type.String(),
        maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
      }),
      async execute(_id, params) {
        const results = await searchMemory(cfg, params.query, params.maxResults || 5);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ query: params.query, results }, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_memory_append',
      description: 'Append a durable memory note to today\'s canonical daily memory file.',
      parameters: Type.Object({ text: Type.String() }),
      async execute(_id, params) {
        const result = await appendDailyMemory(cfg, params.text);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ ok: true, ...result }, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_memory_explain',
      description: 'Explain the layered memory architecture, intended for documentation and onboarding.',
      parameters: Type.Object({}),
      async execute() {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              core: cfg.coreFiles,
              dailyDir: cfg.memoryDir,
              factsGlobs: cfg.factsGlobs,
              docsIncluded: cfg.includeDocs,
              docsGlobs: cfg.includeDocs ? cfg.docsGlobs : [],
              dailyWriteMode: cfg.dailyWriteMode,
              autoRecall: cfg.autoRecall,
            }, null, 2),
          }],
        };
      },
    });
  },
});
