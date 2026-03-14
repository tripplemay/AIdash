import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("teacher123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "teacher01" },
    update: {},
    create: { username: "teacher01", password: hashedPassword, name: "张老师", role: "teacher" },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPassword, name: "管理员", role: "admin" },
  });

  console.log("✅ 种子数据写入完成");
  console.log("   教师账号: teacher01 / teacher123");
  console.log("   管理员账号: admin / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
