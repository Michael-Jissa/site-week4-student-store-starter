const prisma = require("../src/db/db")

class OrderItem {
  static async create({ orderId, productId, quantity, price }) {
    return prisma.orderItem.create({
      data: { orderId, productId, quantity, price },
    })
  }

  static async fetchByOrderId(orderId) {
    return prisma.orderItem.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
    })
  }
}

module.exports = OrderItem
