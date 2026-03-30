import { Type } from '@sinclair/typebox';
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { appendDailyMemory, resolveConfig, searchMemory } from './core.js';
import { promoteDailyMemory } from './promotion.js';
import { procedureRecall } from './procedure-recall.js';
import { sceneRecall } from './scene-recall.js';
import { listSkillUpdateSuggestions, generateSkillUpdateSuggestions } from './skill-update-suggestions.js';
import { checkTaskMemory, TASK_STATUSES, writeTaskRecord } from './task-memory.js';

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
              operationalMemory: {
                taskStore: `${cfg.memoryDir}/operations/tasks.jsonl`,
                workflowStore: `${cfg.memoryDir}/operations/workflows.jsonl`,
                procedureCandidateStore: `${cfg.memoryDir}/operations/procedure-candidates.jsonl`,
                curatedProcedureDir: `${cfg.memoryDir}/procedures/`,
                markdownSourceOfTruth: true,
              },
              promotionSidecars: {
                registry: `${cfg.memoryDir}/registry.jsonl`,
                promotions: `${cfg.memoryDir}/promotions.jsonl`,
                conflicts: `${cfg.memoryDir}/conflicts.jsonl`,
              },
              maintenanceSidecars: {
                skillUpdateSuggestions: `${cfg.memoryDir}/skill-update-suggestions.jsonl`,
              },
            }, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_task_check',
      description: 'Check whether a similar task was already completed in operational task memory.',
      parameters: Type.Object({
        taskDescription: Type.String(),
        scene: Type.Optional(Type.String()),
        project: Type.Optional(Type.String()),
        maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
      }),
      async execute(_id, params) {
        const result = await checkTaskMemory(cfg, params);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_task_write',
      description: 'Append a task outcome to the operational task sidecar store without replacing markdown durable memory.',
      parameters: Type.Object({
        taskDescription: Type.String(),
        scene: Type.Optional(Type.String()),
        project: Type.Optional(Type.String()),
        taskType: Type.Optional(Type.String()),
        status: Type.Union(TASK_STATUSES.map((status) => Type.Literal(status))),
        summary: Type.String(),
        startedAt: Type.Optional(Type.String()),
        finishedAt: Type.Optional(Type.String()),
        workspace: Type.Optional(Type.String()),
        artifacts: Type.Optional(Type.Array(Type.String())),
        verification: Type.Optional(Type.Any()),
        reusable: Type.Optional(Type.Boolean()),
        sourceSession: Type.Optional(Type.String()),
      }),
      async execute(_id, params) {
        const result = await writeTaskRecord(cfg, params);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ ok: true, ...result }, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_memory_promote',
      description: 'Promote typed daily memory entries into curated durable memory with duplicate and conflict tracking.',
      parameters: Type.Object({
        day: Type.String(),
        mode: Type.Optional(Type.String()),
      }),
      async execute(_id, params) {
        const result = await promoteDailyMemory(cfg, { day: params.day, mode: params.mode || 'smart' });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_procedure_recall',
      description: 'Recall task-like memory with stronger preference for curated procedures and recovery playbooks when relevant.',
      parameters: Type.Object({
        query: Type.String(),
        scene: Type.Optional(Type.String()),
        project: Type.Optional(Type.String()),
        taskLike: Type.Optional(Type.Boolean()),
        maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
      }),
      async execute(_id, params) {
        const result = await procedureRecall(cfg, params);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_scene_recall',
      description: 'Recall memory with scene-aware and project-aware ranking layered on top of local markdown search.',
      parameters: Type.Object({
        query: Type.String(),
        scene: Type.Optional(Type.String()),
        project: Type.Optional(Type.String()),
        taskLike: Type.Optional(Type.Boolean()),
        maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
      }),
      async execute(_id, params) {
        const result = await sceneRecall(cfg, params);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    });

    api.registerTool({
      name: 'marq_skill_update_suggestions',
      description: 'Generate and review additive skill update suggestions derived from stable procedural memory.',
      parameters: Type.Object({
        minimumOccurrenceCount: Type.Optional(Type.Number({ minimum: 2, maximum: 20 })),
        requirePromoted: Type.Optional(Type.Boolean()),
        maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
      }),
      async execute(_id, params) {
        const generation = await generateSkillUpdateSuggestions(cfg, params);
        const listing = await listSkillUpdateSuggestions(cfg, {
          status: 'pending-review',
          maxResults: params.maxResults || 10,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ ...generation, pendingReview: listing }, null, 2),
          }],
        };
      },
    });
  },
});
