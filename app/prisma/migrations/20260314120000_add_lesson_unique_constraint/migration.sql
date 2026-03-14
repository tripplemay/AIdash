-- CreateIndex: unique constraint on (packageId, lessonNo)
CREATE UNIQUE INDEX `Lesson_packageId_lessonNo_key` ON `Lesson`(`packageId`, `lessonNo`);
