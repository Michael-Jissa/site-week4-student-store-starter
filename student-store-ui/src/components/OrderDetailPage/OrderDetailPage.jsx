import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { formatPrice } from "../../utils/format"
import "./OrderDetailPage.css"

export default function OrderDetailPage({ apiBaseUrl }) {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      setIsFetching(true)
      setError(null)

      try {
        const response = await axios.get(`${apiBaseUrl}/orders/${orderId}`)
        setOrder(response.data.order)
      } catch (err) {
        setError(err?.response?.data?.error || "Failed to load order.")
      } finally {
        setIsFetching(false)
      }
    }

    fetchOrder()
  }, [apiBaseUrl, orderId])

  if (isFetching) return <section className="OrderDetailPage">Loading order...</section>
  if (error) return <section className="OrderDetailPage error">{error}</section>
  if (!order) return null

  return (
    <section className="OrderDetailPage">
      <div className="content">
        <Link to="/orders">Back to Past Orders</Link>
        <h2>Order #{order.id}</h2>
        <p>Status: {order.status}</p>
        <p>Total: {formatPrice(order.total_price || 0)}</p>
        <p>Customer ID: {order.customer}</p>

        <h3>Items</h3>
        <ul>
          {(order.items || []).map((item) => (
            <li key={item.id}>
              Product #{item.product_id} | Qty {item.quantity} | Unit Price {formatPrice(item.price)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
