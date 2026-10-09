import { getRole } from './role'
import { parentAcrossShadow } from './shadow'

/**
 * Whether an element sits in a list of things rather than in fixed UI.
 *
 * A click on "Kiambu AA" or on order "FK-10421" is a click on *the user's
 * own data*: the author's account has those rows, nobody else's does. A step
 * recorded that way and left alone searches for an element that will never
 * exist for anyone else, and the player sits there saying "still looking".
 *
 * Getting this wrong is silent, which is why it is worth guessing at. An
 * author can always disagree — the guess sets a default, not a fact.
 */

/** Containers whose children are, by definition, a list of things. */
const LIST_ROLES = new Set(['list', 'table', 'grid', 'listbox', 'menu', 'tablist', 'treegrid'])

/** The children of those containers. */
const ITEM_ROLES = new Set(['listitem', 'row', 'option', 'menuitem', 'treeitem'])

/** How far up to look for a repeated structure before giving up. */
const MAX_CLIMB = 6

/**
 * Containers whose contents are the same for everybody.
 *
 * A settings form's fields repeat in shape — four `div.field` in a row —
 * but each one means something different and every account has all four.
 * The same goes for a navigation's links. Shape alone cannot tell those
 * from a grid of somebody's coffees, so inside these it is not consulted.
 *
 * An explicitly marked-up list still counts, even here: a form containing
 * a `<ul>` of the user's saved addresses is a list of their own things.
 */
const FIXED_CHROME = new Set(['form', 'nav', 'menu'])
const FIXED_CHROME_ROLES = new Set(['form', 'navigation', 'search', 'toolbar', 'tablist'])

/**
 * How many siblings of the same shape make a list.
 *
 * Two is a coincidence — a Cancel beside a Save, a pair of tabs. Three of
 * the same thing in a row is a collection.
 */
const ENOUGH_SIBLINGS = 3

/** Whether anything within reach above this element is fixed UI. */
function insideFixedChrome(element: Element): boolean {
  let current: Element | null = parentAcrossShadow(element)

  for (let climbed = 0; current && climbed < MAX_CLIMB; climbed += 1) {
    if (FIXED_CHROME.has(current.localName)) return true
    const role = getRole(current)
    if (role && FIXED_CHROME_ROLES.has(role)) return true
    current = parentAcrossShadow(current)
  }
  return false
}

/** What an element looks like, for comparing it with its siblings. */
function shapeOf(element: Element): string {
  const role = getRole(element) ?? ''
  // The class list distinguishes a row of cards from a row of mixed
  // controls, without caring what the classes are called.
  const classes = [...element.classList].sort().join(' ')
  return `${element.localName}|${role}|${classes}`
}

/** Whether an element is one of several things of the same shape. */
function hasTwins(element: Element): boolean {
  const parent = element.parentElement
  if (!parent) return false

  const shape = shapeOf(element)
  let alike = 0
  for (const sibling of parent.children) {
    if (shapeOf(sibling) === shape) alike += 1
    if (alike >= ENOUGH_SIBLINGS) return true
  }
  return false
}

/**
 * Whether a target is part of the user's own data.
 *
 * Three signals, in order of how much they are worth:
 *
 * 1. The element, or something it sits in, declares itself an item of a
 *    list — a `listitem`, a table `row`, an `option`. The page has said so.
 * 2. It sits directly inside a container that declares itself a list.
 * 3. It is one of three or more siblings of the same shape — a grid of
 *    cards, which usually says nothing about itself.
 */
export function isInRepeatedStructure(element: Element): boolean {
  // Worked out once, because the form may sit above where the twins are.
  const guessFromShape = !insideFixedChrome(element)
  let current: Element | null = element

  for (let climbed = 0; current && climbed < MAX_CLIMB; climbed += 1) {
    const role = getRole(current)

    // 1. This is an item of something.
    if (role && ITEM_ROLES.has(role)) return true

    const parent: Element | null = parentAcrossShadow(current)

    // 2. Its parent is a list of things.
    if (parent) {
      const parentRole = getRole(parent)
      if (parentRole && LIST_ROLES.has(parentRole)) return true
    }

    // 3. It is one of many that look alike. Only counted above the element
    //    itself: a button with two sibling buttons is a toolbar, while a
    //    card with two sibling cards is a collection.
    if (guessFromShape && climbed > 0 && hasTwins(current)) return true

    current = parent
  }

  return false
}
