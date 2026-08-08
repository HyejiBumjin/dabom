import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { code: "yearly_2026" },
    update: { name: "2026 운세", price: 3900, active: true },
    create: {
      code: "yearly_2026",
      name: "2026 운세",
      price: 3900,
      active: true,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
