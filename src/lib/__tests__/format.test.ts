import { describe, expect, it } from "vitest";

import { startDateStep } from "@/lib/applications/validation";

import { combineDateParts, formatDate, splitDate } from "../format";

describe("date inputs", () => {
  it("combines day, month and year into an ISO date", () => {
    expect(combineDateParts("5", "3", "2027")).toBe("2027-03-05");
    expect(combineDateParts(" ", "", "")).toBe("");
    expect(combineDateParts("5", "March", "2027")).toBe("invalid");
  });

  it("splits an ISO date back into parts", () => {
    expect(splitDate("2027-03-05")).toEqual({ day: "5", month: "3", year: "2027" });
    expect(splitDate("")).toEqual({ day: "", month: "", year: "" });
  });

  it("refuses dates that do not exist", () => {
    expect(startDateStep.safeParse({ startsOn: "2027-02-31" }).success).toBe(false);
    expect(startDateStep.safeParse({ startsOn: "2028-02-29" }).success).toBe(true);
    expect(startDateStep.safeParse({ startsOn: "" }).error?.issues[0].message).toBe(
      "Enter the date trading starts",
    );
  });

  it("formats dates for people in Sri Lanka", () => {
    expect(formatDate("2027-03-05")).toBe("5 March 2027");
    // 20:00 UTC is already the next day in Colombo (UTC+5:30).
    expect(formatDate(new Date("2027-03-05T20:00:00Z"))).toBe("6 March 2027");
  });
});
