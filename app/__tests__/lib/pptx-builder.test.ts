/**
 * pptx-builder tests.
 * Verifies module exports and type structures.
 * Full integration testing requires real template files + pptx-automizer runtime.
 */

describe("pptx-builder module", () => {
  it("exports buildPptx function", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/slideshow/pptx-builder");
    expect(typeof mod.buildPptx).toBe("function");
  });
});

describe("slideshow types", () => {
  it("SlideshowOutput interface includes layout field", () => {
    const output = {
      slides: [
        { type: "cover" as const, layout: "cover_fullimage", title: "Test", subtitle: "Sub" },
        { type: "content" as const, layout: "content_text_only", title: "Content", body: "text", bullets: ["a", "b"] },
        { type: "content" as const, layout: "content_image_right", title: "With Image", body: "text", imagePrompt: "test", imageUrl: "/api/ai-images/test.png" },
        { type: "interaction" as const, layout: "interaction_card", title: "Interact", body: "do this" },
        { type: "showcase" as const, layout: "showcase_centered", title: "Show", bullets: ["x"] },
        { type: "ending" as const, layout: "ending_summary", title: "End", body: "bye" },
      ],
    };
    expect(output.slides).toHaveLength(6);
    expect(output.slides[0].layout).toBe("cover_fullimage");
    expect(output.slides[2].imageUrl).toBe("/api/ai-images/test.png");
  });
});
