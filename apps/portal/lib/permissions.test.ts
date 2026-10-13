import { describe, expect, it } from 'vitest'
import { NotAllowedError, can, require as requirePermission } from './permissions'

describe('can', () => {
  it('lets an admin do everything, including dangerous things', () => {
    expect(can('admin', 'app:delete')).toBe(true)
    expect(can('admin', 'member:manage')).toBe(true)
  })

  it('lets an editor run the product but not delete an app', () => {
    expect(can('editor', 'flow:publish')).toBe(true)
    expect(can('editor', 'app:update')).toBe(true)
    expect(can('editor', 'app:delete')).toBe(false)
    expect(can('editor', 'member:manage')).toBe(false)
  })

  it('lets a viewer look and nothing else', () => {
    expect(can('viewer', 'app:read')).toBe(true)
    expect(can('viewer', 'flow:read')).toBe(true)
    expect(can('viewer', 'flow:update')).toBe(false)
    expect(can('viewer', 'app:create')).toBe(false)
  })

  it('lets admins and editors read and delete problem reports, and not viewers', () => {
    expect(can('admin', 'report:read')).toBe(true)
    expect(can('editor', 'report:read')).toBe(true)
    expect(can('editor', 'report:delete')).toBe(true)
    expect(can('viewer', 'report:read')).toBe(false)
    expect(can('viewer', 'report:delete')).toBe(false)
  })

  it('leaves erasing everything one person sent to an admin', () => {
    expect(can('admin', 'report:erase-person')).toBe(true)
    expect(can('editor', 'report:erase-person')).toBe(false)
  })

  it('refuses anyone without a role', () => {
    expect(can(null, 'app:read')).toBe(false)
    expect(can(undefined, 'app:read')).toBe(false)
    expect(can('owner', 'app:read')).toBe(false)
  })
})

describe('require', () => {
  it('passes quietly when the role allows it', () => {
    expect(() => requirePermission('admin', 'app:delete')).not.toThrow()
  })

  it('throws something recognisable when it does not', () => {
    expect(() => requirePermission('viewer', 'app:delete')).toThrow(NotAllowedError)
    expect(() => requirePermission('viewer', 'app:delete')).toThrow(/app:delete/)
  })
})
