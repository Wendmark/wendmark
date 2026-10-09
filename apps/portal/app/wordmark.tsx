/**
 * The logo, as a link home or as a plain mark.
 *
 * An `<img>` rather than inline SVG: the file in public/brand is the one
 * source of the lockup, and inlining it here would be a second copy to keep
 * in step. The wordmark is outlines, so nothing is fetched to render it.
 */
export function Wordmark({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/brand/wendmark-horizontal.svg"
      alt="Wendmark"
      height={height}
      // The lockup's own proportions, from its viewBox. Given so the row
      // does not reflow when the file arrives.
      width={Math.round((height * 347.63) / 69)}
      className="wordmark"
    />
  )
}
