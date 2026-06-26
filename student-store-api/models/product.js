const prisma = require("../src/db/db")

class Product {
  static async list({ category, name, sort }) {
    const where = {}
    let orderBy

    if (category && category !== "All Categories") {
      where.category = { equals: category, mode: "insensitive" }
    }

    if (name) {
      where.name = { contains: name, mode: "insensitive" }
    }

    if (sort === "price") {
      orderBy = { price: "asc" }
    } else if (sort === "name") {
      orderBy = { name: "asc" }
    }

    return prisma.product.findMany({
      where,
      orderBy,
    })
  }

  static async fetchById(id) {
    return prisma.product.findUnique({
      where: { id },
    })
  }

  static async create({ name, description, price, imageUrl, category }) {
    return prisma.product.create({
      data: { name, description, price, imageUrl, category },
    })
  }

  static async update(id, { name, description, price, imageUrl, category }) {
    return prisma.product.update({
      where: { id },
      data: { name, description, price, imageUrl, category },
    })
  }

  static async delete(id) {
    return prisma.product.delete({
      where: { id },
    })
  }
}

module.exports = Product
