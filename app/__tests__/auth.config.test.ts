import { authConfig } from "@/auth.config";

const authorized = authConfig.callbacks!.authorized! as Function;
const jwt = authConfig.callbacks!.jwt! as Function;
const session = authConfig.callbacks!.session! as Function;

const makeRequest = (path: string) => ({
  nextUrl: new URL(`http://localhost${path}`),
});

describe("authConfig.callbacks.authorized", () => {
  it("allows unauthenticated access to login page", () => {
    expect(authorized({ auth: null, request: makeRequest("/") })).toBe(true);
  });

  it("blocks unauthenticated access to /list", () => {
    expect(authorized({ auth: null, request: makeRequest("/list") })).toBe(false);
  });

  it("blocks unauthenticated access to /detail/slug", () => {
    expect(
      authorized({ auth: null, request: makeRequest("/detail/some-slug") })
    ).toBe(false);
  });

  it("blocks unauthenticated access to /admin", () => {
    expect(authorized({ auth: null, request: makeRequest("/admin") })).toBe(false);
  });

  it("allows authenticated access to /list", () => {
    const auth = { user: { name: "teacher" }, expires: "" };
    expect(authorized({ auth, request: makeRequest("/list") })).toBe(true);
  });

  it("allows authenticated access to /admin", () => {
    const auth = { user: { name: "admin" }, expires: "" };
    expect(authorized({ auth, request: makeRequest("/admin") })).toBe(true);
  });

  it("redirects authenticated user from login page to /list", () => {
    const auth = { user: { name: "teacher" }, expires: "" };
    const result = authorized({ auth, request: makeRequest("/") });
    expect(result).toBeInstanceOf(Response);
  });

  it("allows unauthenticated access to non-protected paths", () => {
    expect(
      authorized({ auth: null, request: makeRequest("/public-path") })
    ).toBe(true);
  });
});

describe("authConfig.callbacks.jwt", () => {
  it("injects role from user into token on sign-in", () => {
    const result = jwt({ token: {}, user: { role: "admin" } });
    expect(result.role).toBe("admin");
  });

  it("injects teacher role from user into token", () => {
    const result = jwt({ token: {}, user: { role: "teacher" } });
    expect(result.role).toBe("teacher");
  });

  it("returns token unchanged when no user (subsequent requests)", () => {
    const token = { role: "admin", sub: "123" };
    const result = jwt({ token, user: undefined });
    expect(result).toEqual(token);
  });

  it("handles user without role", () => {
    const result = jwt({ token: {}, user: {} });
    expect(result.role).toBeUndefined();
  });
});

describe("authConfig.callbacks.session", () => {
  it("propagates role from token to session user", () => {
    const sess = { user: { name: "teacher" }, expires: "" };
    const result = session({ session: sess, token: { role: "admin" } });
    expect((result.user as any).role).toBe("admin");
  });

  it("propagates teacher role", () => {
    const sess = { user: { name: "teacher" }, expires: "" };
    const result = session({ session: sess, token: { role: "teacher" } });
    expect((result.user as any).role).toBe("teacher");
  });

  it("propagates undefined role when token has no role", () => {
    const sess = { user: { name: "teacher" }, expires: "" };
    const result = session({ session: sess, token: {} });
    expect((result.user as any).role).toBeUndefined();
  });
});
