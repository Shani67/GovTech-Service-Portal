import { describe, expect, it } from "vitest";

import { allowedTransitions, canTransition, noteRequired } from "../workflow";

describe("workflow", () => {
  it("gives officers review actions and managers final decisions", () => {
    expect(allowedTransitions("in_review", "officer").map((t) => t.to)).toEqual([
      "more_info_required",
    ]);
    expect(allowedTransitions("in_review", "manager").map((t) => t.to)).toEqual([
      "more_info_required",
      "approved",
      "rejected",
    ]);
  });

  it("allows nothing after a final decision", () => {
    expect(allowedTransitions("approved", "manager")).toEqual([]);
    expect(allowedTransitions("rejected", "manager")).toEqual([]);
    expect(canTransition("draft", "approved", "manager")).toBe(false);
  });

  it("requires a message for requests and rejections", () => {
    expect(noteRequired("more_info_required")).toBe(true);
    expect(noteRequired("rejected")).toBe(true);
    expect(noteRequired("approved")).toBe(false);
  });
});
