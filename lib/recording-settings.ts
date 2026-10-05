import { z } from 'zod';
export const recordingFieldKeys = ['duration', 'distance', 'weight', 'reps', 'calories', 'speed', 'incline', 'inclineLevel', 'elevationGain', 'steps', 'floors', 'rpm', 'resistance', 'watts', 'strokeRate', 'split', 'rounds', 'heartRate'] as const;
export const recordingSettingsSchema = z.object({
  weightUnit: z.enum(['kg', 'lb']).default('kg'),
  weightBasis: z.enum(['machine', 'single', 'pair']).default('machine'),
  inclineUnit: z.enum(['percent', 'degree', 'level']).default('percent'),
  fieldOrder: z.array(z.enum(recordingFieldKeys)).max(18).default([]),
  hiddenFields: z.array(z.enum(recordingFieldKeys)).max(18).default([]),
  weightStep: z.number().finite().positive().max(100).default(2.5),
  defaults: z.object({
    speed: z.number().finite().min(0).max(200).optional(),
    incline: z.number().finite().min(-20).max(100).optional(),
    inclineLevel: z.number().finite().min(0).max(1000).optional(),
    resistance: z.number().finite().min(0).max(1000).optional()
  }).default({})
});
export type RecordingSettings = z.infer<typeof recordingSettingsSchema>;
export const defaultRecording = (dumbbell = false, step = 2.5): RecordingSettings => recordingSettingsSchema.parse({
  weightBasis: dumbbell ? 'single' : 'machine',
  weightStep: step
});
export const KG_PER_LB = 0.45359237;
export const roundMeasure = (n: number) => Math.round(n * 1e6) / 1e6;
export function toStoredWeight(value: number, settings: RecordingSettings): number {
  return roundMeasure(value * (settings.weightUnit === 'lb' ? KG_PER_LB : 1) / (settings.weightBasis === 'pair' ? 2 : 1));
}
export function displayedWeight(value: number, settings: RecordingSettings): number {
  return Math.round(value / (settings.weightUnit === 'lb' ? KG_PER_LB : 1) * (settings.weightBasis === 'pair' ? 2 : 1) * 100) / 100;
}
export function weightLabel(settings: RecordingSettings): string {
  return `${settings.weightBasis === 'single' ? '한쪽 ' : settings.weightBasis === 'pair' ? '양쪽 합계 ' : ''}${settings.weightUnit}`;
}
export function weightText(value: number, settings: RecordingSettings): string {
  return `${displayedWeight(value, settings)}${settings.weightUnit}${settings.weightBasis === 'single' ? ' (한쪽)' : settings.weightBasis === 'pair' ? ' (양쪽 합계)' : ''}`;
}
export const percentToDegrees = (n: number) => Math.atan(n / 100) * 180 / Math.PI;
export const degreesToPercent = (n: number) => roundMeasure(Math.tan(n * Math.PI / 180) * 100);
