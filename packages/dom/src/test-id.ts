/** A test id found on an element: which attribute held it, and its value. */
export interface TestId {
  attribute: string
  value: string
}

/** Attributes teams use for test ids, most common first. */
const TEST_ID_ATTRIBUTES = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-qa',
  'data-cy',
  'data-automation-id',
]

/** Longer than this and it is not a hand-written id. */
const MAX_LENGTH = 100

/**
 * The test id a developer put on an element, if any. Test ids exist to be
 * found by automation, so they are the most stable anchor available.
 */
export function getTestId(element: Element): TestId | null {
  for (const attribute of TEST_ID_ATTRIBUTES) {
    const value = element.getAttribute(attribute)?.trim()
    if (value && value.length <= MAX_LENGTH) return { attribute, value }
  }
  return null
}
