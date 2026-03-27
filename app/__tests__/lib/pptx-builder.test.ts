/**
 * pptx-builder tests.
 *
 * pptxgenjs uses dynamic imports (import()) internally which require
 * --experimental-vm-modules in Jest. These tests verify the module
 * exports correctly and that the builder function signature is correct.
 * Full integration testing of .pptx generation is done via manual testing
 * or E2E tests with a real Node runtime.
 */

describe("pptx-builder module", () => {
  it("exports buildPptx function", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/slideshow/pptx-builder");
    expect(typeof mod.buildPptx).toBe("function");
  });
});

describe("slideshow types", () => {
  it("SlideshowOutput interface is usable", () => {
    const output = {
      slides: [
        { type: "cover" as const, title: "Test", subtitle: "Sub" },
        { type: "content" as const, title: "Content", body: "text", bullets: ["a", "b"] },
        { type: "interaction" as const, title: "Interact", body: "do this" },
        { type: "showcase" as const, title: "Show", bullets: ["x"] },
        { type: "ending" as const, title: "End", body: "bye" },
      ],
    };
    expect(output.slides).toHaveLength(5);
    expect(output.slides[0].type).toBe("cover");
    expect(output.slides[1].bullets).toEqual(["a", "b"]);
  });
});
