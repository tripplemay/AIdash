import { prisma } from "@/lib/prisma";
import { SetTopBar } from "@/components/TopBarContext";
import { notFound } from "next/navigation";
import SlideshowWorkspace from "@/components/SlideshowWorkspace";

export default async function SlideshowSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const pkg = await prisma.coursePackage.findUnique({
    where: { slug },
  });

  if (!pkg || pkg.status !== "published") notFound();

  // Load available themes
  const themes = await prisma.preset.findMany({
    where: { category: "slideshow_theme", isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, value: true },
  });

  const parsedThemes = themes.map((t) => {
    let description = "";
    try {
      description = JSON.parse(t.value).description ?? "";
    } catch { /* ignore */ }
    return { name: t.name, description };
  });

  return (
    <>
      <SetTopBar breadcrumb="课件生成" title={pkg.title} />
      <div className="card--glass" style={{ padding: "var(--sp-5)" }}>
        <SlideshowWorkspace
          packageSlug={slug}
          packageTitle={pkg.title}
          themes={parsedThemes}
        />
      </div>
    </>
  );
}
