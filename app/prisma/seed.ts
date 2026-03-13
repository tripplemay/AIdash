import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  // ── 创建测试用户 ──
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

  // ── 创建样板课程包 ──
  const pkg = await prisma.coursePackage.upsert({
    where: { slug: "my-magical-partner" },
    update: {},
    create: {
      slug: "my-magical-partner",
      title: "我的神奇搭档课程包",
      ageRange: "8-12",
      level: "L1",
      summary: "面向 8-12 岁学生的 AI 创作课程包，帮助学生通过 AI 互动创作「我的神奇搭档介绍页」。",
      coverImage: "/images/my-magical-partner-cover.png",
      status: "published",
    },
  });

  // ── 创建第 1 课 ──
  const lesson = await prisma.lesson.upsert({
    where: { id: "lesson-01-my-magical-partner" },
    update: {},
    create: {
      id: "lesson-01-my-magical-partner",
      lessonNo: 1,
      title: "我的神奇搭档",
      durationMinutes: 45,
      deliveryMode: "offline_small_group",
      groupSize: "4-6",
      aiRoundsCount: 3,
      outputSummary: "《我的神奇搭档介绍页》",
      entryFile: "index.html",
      contentPath: "/course-packages/my-magical-partner/lessons/lesson-01/index.html",
      status: "published",
      packageId: pkg.id,
    },
  });

  // ── 创建附件 ──
  const attachments = [
    { type: "teacher_screen", title: "教师投屏页", path: "attachments/teacher-screen/index.html" },
    { type: "student_ai_input_template", title: "学生 AI 输入模板单", path: "attachments/student-ai-template/template.pdf" },
    { type: "student_output_template", title: "学生成果模板", path: "attachments/student-output-template/template.pdf" },
    { type: "teacher_demo_case", title: "教师示范案例页", path: "attachments/teacher-demo/index.html" },
  ];

  for (const att of attachments) {
    await prisma.attachment.upsert({
      where: { id: `${lesson.id}-${att.type}` },
      update: {},
      create: { id: `${lesson.id}-${att.type}`, ...att, lessonId: lesson.id },
    });
  }

  console.log("✅ 种子数据写入完成");
  console.log("   教师账号: teacher01 / teacher123");
  console.log("   管理员账号: admin / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
