import { z } from 'zod';
import type { ProjectDoc } from './types';

const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: z.enum(['image', 'audio']),
  dataUrl: z.string().optional(),
  path: z.string().optional(),
});

const costumeSchema = z.object({ name: z.string(), assetId: z.string() });
const soundSchema = z.object({ id: z.string(), name: z.string(), assetId: z.string() });

export const spriteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  size: z.number(),
  visible: z.boolean(),
  zIndex: z.number(),
  rotationStyle: z.enum(['all-around', 'left-right', 'none']),
  costumes: z.array(costumeSchema),
  sounds: z.array(soundSchema),
});

const inputSchema = z.object({
  bindings: z.array(
    z.object({ id: z.string().min(1), name: z.string(), keys: z.array(z.string()) }),
  ),
  joystick: z.boolean(),
  joystickSize: z.enum(['sm', 'md', 'lg']).optional(),
  buttonSize: z.enum(['sm', 'md', 'lg']).optional(),
  touchMode: z.enum(['pad', 'direct']).optional(),
  buttons: z.array(z.object({ id: z.string().min(1), bindingId: z.string(), label: z.string() })),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({ id: z.string(), name: z.string(), updatedAt: z.string() }),
  stage: z.object({ width: z.number().positive(), height: z.number().positive(), background: z.string() }),
  assets: z.array(assetSchema),
  variables: z.array(z.object({ id: z.string(), name: z.string(), value: z.union([z.number(), z.string()]) })),
  sprites: z.array(spriteSchema),
  input: inputSchema.optional(),
  scripts: z.record(z.string(), z.unknown()),
});

export type ProjectParseResult =
  | { ok: true; project: ProjectDoc }
  | { ok: false; error: string };

export function parseProject(input: unknown): ProjectParseResult {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  return { ok: true, project: parsed.data as ProjectDoc };
}
