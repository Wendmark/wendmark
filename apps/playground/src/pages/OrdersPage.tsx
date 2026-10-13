import { Fragment, useState } from 'react'
import { orders } from '../data'

export function OrdersPage() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section aria-labelledby="orders-heading">
      <h1 id="orders-heading">Orders</h1>
      <p className="lead">Everything you've ordered, newest first.</p>
      <div className="panel panel-flush">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date</th>
              <th scope="col">Items</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...orders].reverse().map((order) => (
              <Fragment key={order.id}>
                <tr>
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>{order.date}</td>
                  <td>{order.items.join(', ')}</td>
                  <td>{order.totalSek} kr</td>
                  <td>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      aria-expanded={open === order.id}
                      onClick={() => setOpen(open === order.id ? null : order.id)}
                    >
                      {open === order.id ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {open === order.id && (
                  <tr className="details-row">
                    <td colSpan={6}>
                      <div className="details">
                        <div>
                          <p className="eyebrow">Delivery</p>
                          <p>Storgatan 12, 111 22 Stockholm</p>
                        </div>
                        <div>
                          <p className="eyebrow">Tracking</p>
                          <p>
                            {order.status === 'Processing'
                              ? 'Not shipped yet'
                              : `PostNord ${order.id.replace('FK-', '00370')}`}
                          </p>
                        </div>
                        <div className="details-actions">
                          <button type="button" className="button button-small">
                            Order again
                          </button>
                          <button type="button" className="button button-small button-ghost">
                            Report a problem
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
