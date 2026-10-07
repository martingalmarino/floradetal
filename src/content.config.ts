import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { plantSchema } from './lib/schemas';

const plants = defineCollection({
  loader: file('src/data/plants.json'),
  schema: plantSchema,
});

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    seoTitle: z.string().min(1),
    description: z.string().min(1).max(170),
    order: z.number().int(),
    sourceIds: z.array(z.string().min(1)).min(1),
    relatedPlantIds: z.array(z.string().min(1)).default([]),
  }),
});

export const collections = { plants, guides };
