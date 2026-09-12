import { describe, it, expect } from "vitest";
import { Decoder, Stream } from "@garmin/fitsdk";
import { encodeWorkout, expandBlocks, fitFilename } from "./encode";
import { sampleProgram, sampleToday } from "@/lib/sample";

function decode(bytes: Uint8Array) {
  const stream = Stream.fromByteArray(bytes);
  const decoder = new Decoder(stream);
  expect(decoder.isFIT()).toBe(true);
  expect(decoder.checkIntegrity()).toBe(true);
  const { messages, errors } = decoder.read();
  expect(errors).toEqual([]);
  return messages;
}

describe("expandBlocks", () => {
  it("expands a 4x repeat group into 8 steps plus warmup and cooldown", () => {
    const steps = expandBlocks(sampleToday.blocks);
    expect(steps).toHaveLength(2 + 4 * 2);
    expect(steps[0]!.kind).toBe("warmup");
    expect(steps.at(-1)!.kind).toBe("cooldown");
    expect(steps.filter((s) => s.kind === "work")).toHaveLength(4);
  });
});

describe("encodeWorkout", () => {
  it("produces a valid FIT workout that round-trips through the decoder", () => {
    const bytes = encodeWorkout(sampleToday, { name: "Tempo with 4 x 5", createdAt: new Date("2026-09-11T12:00:00Z") });
    const m = decode(bytes) as {
      fileIdMesgs: Array<{ type: string }>;
      workoutMesgs: Array<{ wktName: string; sport: string; numValidSteps: number }>;
      workoutStepMesgs: Array<{ durationType: string; durationValue: number; intensity: string; targetType?: string; targetHrZone?: number; customTargetValueLow?: number; customTargetValueHigh?: number }>;
    };
    expect(m.fileIdMesgs[0]!.type).toBe("workout");
    expect(m.workoutMesgs[0]).toMatchObject({ wktName: "Tempo with 4 x 5", sport: "running", numValidSteps: 10 });
    expect(m.workoutStepMesgs).toHaveLength(10);
    expect(m.workoutStepMesgs[0]).toMatchObject({ durationType: "time", durationValue: 600_000, intensity: "warmup", targetType: "open" });
    expect(m.workoutStepMesgs[1]).toMatchObject({ durationType: "time", durationValue: 300_000, intensity: "active", targetType: "heartRate", targetHrZone: 4 });
  });

  it("turns a written pace range into a speed target", () => {
    const day = { ...sampleToday, blocks: sampleToday.blocks.map((b) => (b.kind === "work" ? { ...b, targetPaceMin: 270, targetPaceMax: 285 } : b)) };
    const bytes = encodeWorkout(day, { name: "Paced" });
    const m = decode(bytes) as { workoutStepMesgs: Array<{ targetType?: string; customTargetValueLow?: number; customTargetValueHigh?: number }> };
    const work = m.workoutStepMesgs[1]!;
    expect(work.targetType).toBe("speed");
    // 4:45/km = 3.509 m/s, 4:30/km = 3.704 m/s, stored as m/s * 1000
    expect(work.customTargetValueLow).toBe(3509);
    expect(work.customTargetValueHigh).toBe(3704);
  });

  it("refuses rest days", () => {
    const rest = sampleProgram.days.find((d) => d.kind === "rest")!;
    expect(() => encodeWorkout(rest, { name: "Rest" })).toThrow();
  });

  it("names files predictably", () => {
    expect(fitFilename(sampleProgram.title, sampleToday)).toBe("base-building-for-busy-people-w3d4.fit");
  });
});
