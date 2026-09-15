import { describe, expect, it } from "vitest";
import { fmtDistance, fmtDistanceUnit, fmtPace, fmtPaceUnit, fmtClimb, toPace } from "./units";
describe("units", () => {
  it("converts distance", () => {
    expect(fmtDistanceUnit(5000, "km")).toBe("5.0 km");
    expect(fmtDistanceUnit(5000, "mi")).toBe("3.1 mi");
    expect(fmtDistance(42195, "mi")).toBe("26.2");
  });
  it("converts pace", () => {
    expect(fmtPace(300, "km")).toBe("5:00");
    expect(fmtPace(300, "mi")).toBe("8:03");
    expect(toPace(360, "mi")).toBe(579);
    expect(fmtPaceUnit(300, "mi")).toBe("8:03 /mi");
  });
  it("converts climb", () => {
    expect(fmtClimb(100, "km")).toBe("100");
    expect(fmtClimb(100, "mi")).toBe("328");
  });
});
