import { orders } from '../data'

export function OrdersPage() {
  return (
    <section aria-labelledby="orders-heading">
      <h1 id="orders-heading">Orders</h1>
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Date</th>
            <th scope="col">Items</th>
            <th scope="col">Total</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.date}</td>
              <td>{order.items.join(', ')}</td>
              <td>{order.totalSek} kr</td>
              <td>
                <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
