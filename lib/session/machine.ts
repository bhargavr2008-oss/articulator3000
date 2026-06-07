/**
 * Client-side session state machine (Step 1 skeleton).
 *
 * Phases follow the locked flow in SPEC.md §7:
 *   setup → capturing → synthesizing → grilling → confirming → generating → complete
 * `error` is reachable from any phase and remembers the phase it failed from so
 * the UI can offer a retry that resumes rather than restarts.
 */

export type Phase =
  | "setup"
  | "capturing"
  | "synthesizing"
  | "grilling"
  | "confirming"
  | "generating"
  | "complete"
  | "error";

export interface SessionState {
  phase: Phase;
  sessionId: string | null;
  /** Phase we were in when an error occurred, for resume-after-retry. */
  errorFrom: Phase | null;
  errorMessage: string | null;
}

export type SessionEvent =
  | { type: "SESSION_CREATED"; sessionId: string }
  | { type: "START_CAPTURE" }
  | { type: "SYNTHESIZE" }
  | { type: "SYNTHESIS_DONE" }
  | { type: "CONFIRM" }
  | { type: "GENERATE" }
  | { type: "GENERATION_DONE" }
  | { type: "FAIL"; message: string }
  | { type: "RETRY" }
  | { type: "RESET" };

export const initialState: SessionState = {
  phase: "setup",
  sessionId: null,
  errorFrom: null,
  errorMessage: null,
};

/** Allowed forward transitions (phase -> event -> next phase). */
const FORWARD: Partial<
  Record<Phase, Partial<Record<SessionEvent["type"], Phase>>>
> = {
  setup: { START_CAPTURE: "capturing" },
  capturing: { SYNTHESIZE: "synthesizing" },
  synthesizing: { SYNTHESIS_DONE: "grilling" },
  grilling: { CONFIRM: "confirming" },
  confirming: { GENERATE: "generating" },
  generating: { GENERATION_DONE: "complete" },
};

export function sessionReducer(
  state: SessionState,
  event: SessionEvent,
): SessionState {
  switch (event.type) {
    case "SESSION_CREATED":
      return { ...state, sessionId: event.sessionId };

    case "FAIL":
      return {
        ...state,
        phase: "error",
        errorFrom: state.phase === "error" ? state.errorFrom : state.phase,
        errorMessage: event.message,
      };

    case "RETRY":
      if (state.phase !== "error" || state.errorFrom === null) return state;
      return {
        ...state,
        phase: state.errorFrom,
        errorFrom: null,
        errorMessage: null,
      };

    case "RESET":
      return { ...initialState };

    default: {
      const next = FORWARD[state.phase]?.[event.type];
      if (!next) return state; // ignore illegal transitions
      return { ...state, phase: next };
    }
  }
}
