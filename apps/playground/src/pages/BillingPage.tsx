/**
 * Billing, handled by an embedded provider: the Ledgerly panel in an iframe.
 *
 * Also a test fixture. The panel is loaded from the *other* local host name
 * than the one this page is on (localhost ↔ 127.0.0.1), so it is a
 * cross-origin frame, the case the browser extension has to record and play
 * across (docs/decisions/browser-extension.md, issue #89). A process here
 * starts in Fika and finishes inside the frame: Billing, then Invoices, then
 * Download.
 */

/** The panel's address: same server, other host name, so another origin. */
function panelUrl(): string {
  const { protocol, hostname, port } = window.location
  const other = hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1'
  return `${protocol}//${other}${port ? `:${port}` : ''}/billing/panel.html`
}

export function BillingPage() {
  return (
    <section aria-labelledby="billing-heading">
      <h1 id="billing-heading">Billing</h1>
      <p className="lead">Payments and invoices are handled by Ledgerly, our billing provider.</p>
      <div className="panel panel-flush billing-frame">
        <iframe title="Ledgerly billing" src={panelUrl()} />
      </div>
    </section>
  )
}
