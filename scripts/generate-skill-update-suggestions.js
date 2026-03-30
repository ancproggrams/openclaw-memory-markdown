#!/usr/bin/env node
import { resolveConfig } from '../src/core.js';
import { generateSkillUpdateSuggestions, listSkillUpdateSuggestions } from '../src/skill-update-suggestions.js';

const minimumOccurrenceCount = Number(process.argv[2] || 3);
const cfg = resolveConfig({ workspaceRoot: process.cwd() });

const generated = await generateSkillUpdateSuggestions(cfg, { minimumOccurrenceCount });
const pendingReview = await listSkillUpdateSuggestions(cfg, { status: 'pending-review' });

console.log(JSON.stringify({ ...generated, pendingReview }, null, 2));
