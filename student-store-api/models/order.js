const prisma = require("../src/db/db")

class Order {
  static async list() {
    return prisma.order.findMany({
      orderBy: { id: "asc" },
    })
  }

  static async fetchById(id) {
    return prisma.order.findUnique({
      where: { id },
    })
  }

  static async fetchByIdWithItems(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    })
  }

  static async create({ customer, status, totalPrice, items }) {
    const orderItems = Array.isArray(items)
      ? items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          price: item.price,
        }))
      : []

    return prisma.order.create({
      data: {
        customer,
        status,
        totalPrice,
        orderItems: orderItems.length ? { create: orderItems } : undefined,
      },
      include: { orderItems: true },
    })
  }

  static async createTransactional({ customer, status, items }) {
    return prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.product_id)
      const uniqueProductIds = [...new Set(productIds)]

      const products = await tx.product.findMany({
        where: { id: { in: uniqueProductIds } },
      })

      const productById = new Map(products.map((product) => [product.id, product]))
      const missingProductId = uniqueProductIds.find((id) => !productById.has(id))

      if (missingProductId) {
        const error = new Error(`Product ${missingProductId} does not exist`)
        error.code = "PRODUCT_NOT_FOUND"
        error.statusCode = 404
        throw error
      }

      const orderItemsToCreate = items.map((item) => {
        const product = productById.get(item.product_id)
        return {
          productId: item.product_id,
          quantity: item.quantity,
          price: product.price,
        }
      })

      const totalPrice = orderItemsToCreate.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      const createdOrder = await tx.order.create({
        data: {
          customer,
          status,
          totalPrice,
          orderItems: { create: orderItemsToCreate },
        },
        include: { orderItems: true },
      })

      return createdOrder
    })
  }

  static async update(id, { status }) {
    return prisma.order.update({
      where: { id },
      data: { status },
      include: { orderItems: true },
    })
  }

  static async delete(id) {
    return prisma.order.delete({
      where: { id },
    })
  }
}

module.exports = Order
