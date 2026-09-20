/**
 * The snippet is loaded with a <script> tag, exactly as a customer would
 * embed it, so it arrives as a global rather than an import. The playground
 * deliberately has no dependency on any @wendmark/* package.
 */
export {}

declare global {
  interface Window {
    Wendmark?: {
      start: (flow: unknown) => void
      stop: () => void
    }
  }
}
