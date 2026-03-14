/**
 * 判断课次是否有可访问的内容。
 * v2: contentData（JSON）；未来扩展只改这一处。
 */
export function isLessonAccessible(lesson: {
  contentPath?: string | null;
  contentData?: string | null;
}): boolean {
  return !!(lesson.contentPath || lesson.contentData);
}
