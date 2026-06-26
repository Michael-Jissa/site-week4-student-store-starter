require("dotenv").config()

const express = require("express")
const cors = require("cors")
const Product = require("../models/product")
const Order = require("../models/order")
const prisma = require("./db/db")

const app = express()
const PORT = process.env.PORT || 3001
const ALLOWED_CATEGORIES = ["Apparel", "Books", "Supplies", "Accessories", "Snacks"]
const ALLOWED_SORT_FIELDS = ["price", "name"]

app.use(express.json())
app.use(cors())

app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Student Store API" })
})

const serializeProduct = (product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  image_url: product.imageUrl,
  category: product.category,
})

const serializeOrderItem = (item) => ({
  id: item.id,
  product_id: item.productId,
  quantity: item.quantity,
  price: item.price,
})

const serializeOrder = (order) => ({
  id: order.id,
  customer: order.customer,
  total_price: order.totalPrice,
  status: order.status,
  created_at: order.createdAt,
})

const serializeOrderWithItems = (order) => ({
  ...serializeOrder(order),
  items: Array.isArray(order.orderItems) ? order.orderItems.map(serializeOrderItem) : [],
})

const parseProductInput = (body) => {
  const payload = {
    name: body.name,
    description: body.description,
    price: Number(body.price),
    imageUrl: body.image_url,
    category: body.category,
  }

  if (
    !payload.name ||
    !payload.description ||
    Number.isNaN(payload.price) ||
    !payload.imageUrl ||
    !payload.category
  ) {
    return null
  }

  return payload
}

app.get("/products", async (req, res) => {
  try {
    const { category, sort } = req.query

    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category value" })
    }

    if (sort && !ALLOWED_SORT_FIELDS.includes(sort)) {
      return res.status(400).json({ error: "Invalid sort value" })
    }

    const products = await Product.list({
      category,
      name: req.query.name,
      sort,
    })

    return res.status(200).json({ products: products.map(serializeProduct) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to fetch products" })
  }
})

app.get("/products/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product id" })
    }
    const product = await Product.fetchById(productId)

    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    return res.status(200).json({ product: serializeProduct(product) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to fetch products" })
  }
})

app.post("/products", async (req, res) => {
  try {
    const payload = parseProductInput(req.body)
    if (!payload) {
      return res.status(400).json({ error: "Missing required product fields" })
    }

    const createdProduct = await Product.create(payload)
    return res.status(201).json({ product: serializeProduct(createdProduct) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to create product" })
  }
})

app.put("/products/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product id" })
    }
    const existingProduct = await Product.fetchById(productId)

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" })
    }

    const payload = parseProductInput(req.body)
    if (!payload) {
      return res.status(400).json({ error: "Missing required product fields" })
    }

    const updatedProduct = await Product.update(productId, payload)
    return res.status(200).json({ product: serializeProduct(updatedProduct) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to update product" })
  }
})

app.delete("/products/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product id" })
    }
    const existingProduct = await Product.fetchById(productId)

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" })
    }

    await Product.delete(productId)
    return res.status(200).json({ deleted: { id: productId } })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to delete product" })
  }
})

app.get("/orders", async (_req, res) => {
  try {
    const orders = await Order.list()
    return res.status(200).json({ orders: orders.map(serializeOrder) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to fetch orders" })
  }
})

app.get("/orders/:orderId", async (req, res) => {
  try {
    const orderId = Number(req.params.orderId)
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order id" })
    }

    const order = await Order.fetchByIdWithItems(orderId)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({ order: serializeOrderWithItems(order) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to fetch orders" })
  }
})

app.post("/orders", async (req, res) => {
  try {
    const customer = Number(req.body.customer)
    const status = req.body.status
    const items = Array.isArray(req.body.items) ? req.body.items : []

    if (Number.isNaN(customer) || !status || items.length === 0) {
      return res.status(400).json({
        error: "customer, status, and a non-empty items array are required",
      })
    }

    const hasInvalidItemShape = items.some(
      (item) =>
        Number.isNaN(Number(item.product_id)) ||
        Number.isNaN(Number(item.quantity)) ||
        Number(item.quantity) <= 0
    )

    if (hasInvalidItemShape) {
      return res.status(400).json({ error: "Invalid order items payload" })
    }

    const normalizedItems = items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
    }))

    const createdOrder = await Order.createTransactional({
      customer,
      status,
      items: normalizedItems,
    })

    return res.status(201).json({ order: serializeOrderWithItems(createdOrder) })
  } catch (err) {
    if (err.code === "PRODUCT_NOT_FOUND" && err.statusCode === 404) {
      return res.status(404).json({ error: err.message })
    }

    return res.status(500).json({ error: "Failed to create order" })
  }
})

app.put("/orders/:orderId", async (req, res) => {
  try {
    const orderId = Number(req.params.orderId)
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order id" })
    }

    const status = req.body.status
    if (!status) {
      return res.status(400).json({ error: "status is required" })
    }

    const existingOrder = await Order.fetchById(orderId)
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" })
    }

    const updatedOrder = await Order.update(orderId, { status })
    return res.status(200).json({ order: serializeOrderWithItems(updatedOrder) })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to update order" })
  }
})

app.delete("/orders/:orderId", async (req, res) => {
  try {
    const orderId = Number(req.params.orderId)
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order id" })
    }

    const existingOrder = await Order.fetchById(orderId)
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" })
    }

    await Order.delete(orderId)
    return res.status(200).json({ deleted: { id: orderId } })
  } catch (_err) {
    return res.status(500).json({ error: "Failed to delete order" })
  }
})

app.use((err, _req, res, _next) => {
  console.error(err)
  return res.status(500).json({ error: "Unexpected server error" })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

process.on("SIGINT", async () => {
  await prisma.$disconnect()
  process.exit(0)
})

