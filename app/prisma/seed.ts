import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  // 迁移旧路径（/course-packages/ → /api/course-files/），幂等可重复执行
  await prisma.$executeRaw`UPDATE \`Lesson\` SET \`contentPath\` = REPLACE(\`contentPath\`, '/course-packages/', '/api/course-files/') WHERE \`contentPath\` LIKE '/course-packages/%'`;
  await prisma.$executeRaw`UPDATE \`Attachment\` SET \`path\` = REPLACE(\`path\`, '/course-packages/', '/api/course-files/') WHERE \`path\` LIKE '/course-packages/%'`;

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
