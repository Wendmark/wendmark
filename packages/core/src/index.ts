/**
 * @wendmark/core — shared types and zod schemas.
 * No DOM, no network, no Node APIs. Depends on nothing else in the repo.
 */
export {
  SCHEMA_VERSION,
  TargetSchema,
  ActionStepSchema,
  InputStepSchema,
  InstructionStepSchema,
  StepSchema,
  FlowSchema,
} from './schemas'
export type {
  Target,
  ActionStep,
  InputStep,
  InstructionStep,
  Step,
  StepType,
  Flow,
} from './schemas'
export { looksLikeFlow, checkFlow } from './guard'
export type { FlowVerdict } from './guard'
export { ReportSchema, REPORT_VERSION } from './report'
export type { Report } from './report'
export {
  redactStep,
  redactSteps,
  maskPath,
  readLabelPolicy,
  LABEL_POLICIES,
  DEFAULT_LABEL_POLICY,
} from './redact'
export type { LabelPolicy } from './redact'
