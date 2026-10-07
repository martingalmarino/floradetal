import { z } from 'astro/zod';

export const CATEGORIES = ['huerta', 'aromatica', 'flores', 'interior'] as const;
export const ENVIRONMENTS = ['exterior', 'interior'] as const;
export const LIGHT_PROFILES = [
  'full_sun',
  'sun_or_partial',
  'bright_shade',
  'indoor_bright',
  'indoor_bright_medium',
  'indoor_tolerates_low',
] as const;
export const WATER_PROFILES = ['even_moisture', 'partial_dry', 'substantial_dry'] as const;
export const FROST_PROFILES = ['sensitive', 'some_tolerance', 'unspecified'] as const;
export const MAINTENANCE_LEVELS = ['low', 'medium'] as const;
export const SPACE_CLASSES = ['small', 'medium', 'large', 'varies'] as const;
export const ACTION_TYPES = ['iniciar_almacigo', 'sembrar', 'plantar_dientes', 'trasplantar'] as const;
export const SOWING_METHODS = ['almacigo_protegido', 'exterior', 'directa', 'directa_o_almacigo'] as const;
export const COVERAGE_LEVELS = ['reference_temperate', 'general_only'] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha ISO AAAA-MM-DD');
const optionalPositive = z.number().positive().nullable().default(null);

export const imageSchema = z.object({
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.url(),
  sourceUrl: z.url(),
  isIllustration: z.boolean(),
});

export const toxicityEvidenceSchema = z.object({
  summary: z.string().min(1),
  sourceId: z.string().min(1),
});

export const affiliateLinkSchema = z.object({
  url: z.url(),
  label: z.string().min(1),
  enabled: z.boolean(),
});

export const plantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  commonName: z.string().min(1),
  scientificName: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  identityNotes: z.array(z.string().min(1)).default([]),
  category: z.enum(CATEGORIES),
  environments: z.array(z.enum(ENVIRONMENTS)).min(1),
  lightProfile: z.enum(LIGHT_PROFILES),
  waterProfile: z.enum(WATER_PROFILES),
  frostProfile: z.enum(FROST_PROFILES),
  maintenance: z.enum(MAINTENANCE_LEVELS),
  spaceClass: z.enum(SPACE_CLASSES),
  tallOrTrained: z.boolean(),
  practicalNote: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  careSourceIds: z.array(z.string().min(1)),
  calendarRuleIds: z.array(z.string().min(1)),
  editorialStatus: z.enum(['starter_reference', 'reviewed']),
  editorialReviewedAt: isoDate.nullable(),
  compiledAt: isoDate,
  nativeRangeStatus: z.enum(['not_evaluated', 'confirmed_native', 'confirmed_non_native']),
  petSafetyStatus: z.enum(['not_evaluated', 'toxicity_documented']),
  image: imageSchema.nullable(),
  adultHeightCm: optionalPositive,
  spreadCm: optionalPositive,
  recommendedContainerLiters: optionalPositive,
  plantingDepthCm: optionalPositive,
  spacingCm: optionalPositive,
  harvestDays: optionalPositive,
  propagationNotes: z.string().min(1).nullable().default(null),
  localNativeRegions: z.array(z.string().min(1)).default([]),
  specificToxicityEvidence: toxicityEvidenceSchema.nullable().default(null),
  affiliateLink: affiliateLinkSchema.nullable().default(null),
});

export const sourceSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/),
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.url(),
  kind: z.enum(['argentina', 'foreign_reference', 'implementation']),
  public: z.boolean(),
  reviewedAt: isoDate,
  scopeNote: z.string().nullable(),
});

export const localitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  coverage: z.enum(COVERAGE_LEVELS),
  note: z.string().nullable(),
});

const month = z.number().int().min(1).max(12);

export const calendarRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  plantId: z.string().min(1),
  actionType: z.enum(ACTION_TYPES),
  months: z.array(month).min(1),
  method: z.enum(SOWING_METHODS),
  coverageId: z.string().min(1),
  confidence: z.literal('reference_only'),
  sourceId: z.string().min(1),
  condition: z.string().min(1),
  displayLabel: z.string().min(1),
});

export const generalNoteSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  text: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
});

/** Future: genuinely local calendar windows. Must stay disabled until sourced content exists. */
export const localOverrideSchema = z.object({
  id: z.string().min(1),
  plantId: z.string().min(1),
  actionType: z.enum(ACTION_TYPES),
  months: z.array(month).min(1),
  method: z.enum(SOWING_METHODS),
  geographicScope: z.object({
    localityIds: z.array(z.string().min(1)).min(1),
    description: z.string().min(1),
  }),
  growingContext: z.enum(['protected', 'open_air']),
  sourceId: z.string().min(1),
  reviewedAt: isoDate,
  condition: z.string().min(1),
  enabled: z.boolean(),
});

export const coverageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  confidence: z.literal('reference_only'),
  description: z.string().min(1),
});

export const calendarSchema = z.object({
  coverages: z.array(coverageSchema).min(1),
  rules: z.array(calendarRuleSchema),
  generalNotes: z.array(generalNoteSchema),
  localOverrides: z.array(localOverrideSchema),
});

export const careRuleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  text: z.string().min(1),
  appliesTo: z
    .object({
      waterProfile: z.enum(WATER_PROFILES).optional(),
      category: z.enum(CATEGORIES).optional(),
      hasTransplantRule: z.literal(true).optional(),
      inContainer: z.literal(true).optional(),
    })
    .refine((v) => Object.keys(v).length === 1, 'Cada regla aplica a una sola condición'),
  sourceMode: z.enum(['plant', 'fixed']),
  sourceIds: z.array(z.string().min(1)),
});

export type Plant = z.infer<typeof plantSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Locality = z.infer<typeof localitySchema>;
export type CalendarRule = z.infer<typeof calendarRuleSchema>;
export type GeneralNote = z.infer<typeof generalNoteSchema>;
export type LocalOverride = z.infer<typeof localOverrideSchema>;
export type CalendarData = z.infer<typeof calendarSchema>;
export type CareRule = z.infer<typeof careRuleSchema>;
export type Category = (typeof CATEGORIES)[number];
export type LightProfile = (typeof LIGHT_PROFILES)[number];
export type WaterProfile = (typeof WATER_PROFILES)[number];
export type FrostProfile = (typeof FROST_PROFILES)[number];
export type Maintenance = (typeof MAINTENANCE_LEVELS)[number];
export type SpaceClass = (typeof SPACE_CLASSES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type SowingMethod = (typeof SOWING_METHODS)[number];
export type CoverageLevel = (typeof COVERAGE_LEVELS)[number];
