import { describe, expect, it } from "vitest";
import { initialState, sessionReducer, type SessionState } from "./machine";

describe("sessionReducer", () => {
  it("walks the happy path setup → complete", () => {
    let s: SessionState = initialState;
    expect(s.phase).toBe("setup");
    s = sessionReducer(s, { type: "START_CAPTURE" });
    expect(s.phase).toBe("capturing");
    s = sessionReducer(s, { type: "SYNTHESIZE" });
    expect(s.phase).toBe("synthesizing");
    s = sessionReducer(s, { type: "SYNTHESIS_DONE" });
    expect(s.phase).toBe("grilling");
    s = sessionReducer(s, { type: "CONFIRM" });
    expect(s.phase).toBe("confirming");
    s = sessionReducer(s, { type: "GENERATE" });
    expect(s.phase).toBe("generating");
    s = sessionReducer(s, { type: "GENERATION_DONE" });
    expect(s.phase).toBe("complete");
  });

  it("ignores illegal transitions", () => {
    const s = sessionReducer(initialState, { type: "CONFIRM" });
    expect(s.phase).toBe("setup");
  });

  it("stores the session id without changing phase", () => {
    const s = sessionReducer(initialState, {
      type: "SESSION_CREATED",
      sessionId: "abc",
    });
    expect(s.sessionId).toBe("abc");
    expect(s.phase).toBe("setup");
  });

  it("captures the failing phase and resumes it on retry", () => {
    let s = sessionReducer(initialState, { type: "START_CAPTURE" });
    s = sessionReducer(s, { type: "SYNTHESIZE" }); // synthesizing
    s = sessionReducer(s, { type: "FAIL", message: "model timeout" });
    expect(s.phase).toBe("error");
    expect(s.errorFrom).toBe("synthesizing");
    expect(s.errorMessage).toBe("model timeout");

    s = sessionReducer(s, { type: "RETRY" });
    expect(s.phase).toBe("synthesizing");
    expect(s.errorFrom).toBeNull();
    expect(s.errorMessage).toBeNull();
  });

  it("does not lose the original failing phase if FAIL fires twice", () => {
    let s = sessionReducer(initialState, { type: "START_CAPTURE" });
    s = sessionReducer(s, { type: "FAIL", message: "first" });
    s = sessionReducer(s, { type: "FAIL", message: "second" });
    expect(s.errorFrom).toBe("capturing");
    expect(s.errorMessage).toBe("second");
  });

  it("resets back to the initial state", () => {
    let s = sessionReducer(initialState, { type: "START_CAPTURE" });
    s = sessionReducer(s, { type: "RESET" });
    expect(s).toEqual(initialState);
  });
});
