/**
 * Flows for the Fika demo, written by hand until the recorder exists.
 *
 * These are plain objects on purpose: the playground pretends to be a
 * customer's app, so it knows nothing about Wendmark's types. The snippet
 * checks their shape at runtime.
 */

export const changeGrindFlow = {
  schemaVersion: 1,
  id: 'change-grind',
  name: 'Change your grind to Espresso',
  description: 'Where to change how your coffee is ground.',
  steps: [
    {
      type: 'action',
      id: 'open-profile',
      text: 'Open your Profile',
      dynamic: false,
      target: {
        selectors: ['nav a[href="/profile"]'],
        role: 'link',
        name: 'Profile',
        text: 'Profile',
      },
    },
    {
      type: 'action',
      id: 'open-grind',
      text: 'Open the Grind dropdown',
      dynamic: false,
      target: {
        selectors: ['select[name="grind"]'],
        role: 'combobox',
        name: 'Grind',
        context: 'Profile',
        // A hint, not a gate: if the user is elsewhere, guidance says where
        // to go instead of just "can't find this step". Stored as a path, so
        // the same flow works on localhost, staging and production.
        url: '/profile',
      },
    },
    {
      type: 'instruction',
      id: 'pick-espresso',
      text: 'Choose Espresso from the list, then continue.',
    },
    {
      type: 'action',
      id: 'save',
      text: 'Click Save changes',
      dynamic: false,
      target: {
        selectors: ['form.form button[type="submit"]'],
        role: 'button',
        name: 'Save changes',
        text: 'Save changes',
        context: 'Profile',
        url: '/profile',
      },
    },
  ],
}
