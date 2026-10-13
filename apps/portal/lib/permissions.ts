/**
 * What each role may do.
 *
 * Problem reports: any editor may read and delete one, as the decision
 * record says. Erasing everything one person sent is an administrator's
 * call, because it answers a data request and the app operator is the data
 * controller. See docs/decisions/problem-reports.md.
 *
 * Checked in the service layer, not only hidden in the interface: a missing
 * button is a courtesy, a refused mutation is the actual rule.
 */
export type Role = 'admin' | 'editor' | 'viewer'

export type Action =
  | 'app:read'
  | 'app:create'
  | 'app:update'
  | 'app:rotate-key'
  | 'app:delete'
  | 'flow:read'
  | 'flow:create'
  | 'flow:update'
  | 'flow:publish'
  | 'flow:delete'
  | 'report:read'
  | 'report:delete'
  | 'report:erase-person'
  | 'member:manage'

const PERMISSIONS: Record<Role, Action[]> = {
  admin: [
    'app:read',
    'app:create',
    'app:update',
    'app:rotate-key',
    'app:delete',
    'flow:read',
    'flow:create',
    'flow:update',
    'flow:publish',
    'flow:delete',
    'report:read',
    'report:delete',
    'report:erase-person',
    'member:manage',
  ],
  editor: [
    'app:read',
    'app:create',
    'app:update',
    'app:rotate-key',
    'flow:read',
    'flow:create',
    'flow:update',
    'flow:publish',
    'flow:delete',
    'report:read',
    'report:delete',
  ],
  // Not reports: they hold an app's own customers' words, and a viewer is
  // someone the team only meant to show its processes to.
  viewer: ['app:read', 'flow:read'],
}

/** Whether a role may do something. An unknown role may do nothing. */
export function can(role: string | null | undefined, action: Action): boolean {
  if (role !== 'admin' && role !== 'editor' && role !== 'viewer') return false
  return PERMISSIONS[role].includes(action)
}

/** Thrown when someone tries something their role does not allow. */
export class NotAllowedError extends Error {
  constructor(action: Action) {
    super(`Your role does not allow: ${action}`)
    this.name = 'NotAllowedError'
  }
}

/** Guard for service functions: throws rather than returning a value. */
export function require(role: string | null | undefined, action: Action): void {
  if (!can(role, action)) throw new NotAllowedError(action)
}
