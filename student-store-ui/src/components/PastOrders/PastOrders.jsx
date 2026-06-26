import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { formatPrice } from "../../utils/format"
import "./PastOrders.css"

export default function PastOrders({ apiBaseUrl }) {
  const [orders, setOrders] = useState([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrders = async () => {
      setIsFetching(true)
      setError(null)

      try {
        const response = await axios.get(`${apiBaseUrl}/orders`)
        setOrders(response.data.orders || [])
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load orders.")
      } finally {
        setIsFetching(false)
      }
    }

    fetchOrders()
  }, [apiBaseUrl])

  return (
    <section className="PastOrders">
      <div className="content">
        <h2>Past Orders</h2>

        {isFetching ? <p>Loading orders...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!isFetching && !error && !orders.length ? <p>No past orders yet.</p> : null}

        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`}>
                <span>Order #{order.id}</span>
                <span>{order.status}</span>
                <span>{formatPrice(order.total_price || 0)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
