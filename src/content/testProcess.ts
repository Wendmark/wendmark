import type { Process } from '../types'

/**
 * Part 1 test process. Run it on https://en.wikipedia.org/wiki/Main_Page.
 * Step 2 navigates (logo reloads the Main Page), which exercises
 * resume-across-navigation.
 */
export const TEST_PROCESS: Process = {
  id: 'test-wikipedia',
  name: 'Tour the Wikipedia Main Page',
  steps: [
    {
      selector: '#searchInput',
      text: 'Search Wikipedia',
      role: 'searchbox',
      instruction: 'Click the search box at the top of the page',
    },
    {
      selector: 'a.mw-logo',
      text: 'Wikipedia The Free Encyclopedia',
      role: 'link',
      instruction: 'Click the Wikipedia logo to go to the Main Page',
    },
    {
      selector: '#mp-tfa-h2',
      text: "From today's featured article",
      role: 'heading',
      instruction: 'Click the “From today’s featured article” heading to finish',
    },
  ],
}
