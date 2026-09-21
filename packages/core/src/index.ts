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
export { looksLikeFlow } from './guard'
