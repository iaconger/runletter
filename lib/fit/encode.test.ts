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
      workoutStepMesgs: Array<{ durationType: string; durationValue: number; intensity: string }>;
    };
    expect(m.fileIdMesgs[0]!.type).toBe("workout");
    expect(m.workoutMesgs[0]).toMatchObject({ wktName: "Tempo with 4 x 5", sport: "running", numValidSteps: 10 });
    expect(m.workoutStepMesgs).toHaveLength(10);
    expect(m.workoutStepMesgs[0]).toMatchObject({ durationType: "time", durationValue: 600_000, intensity: "warmup" });
    expect(m.workoutStepMesgs[1]).toMatchObject({ durationType: "time", durationValue: 300_000, intensity: "active" });
  });

  it("refuses rest days", () => {
    const rest = sampleProgram.days.find((d) => d.kind === "rest")!;
    expect(() => encodeWorkout(rest, { name: "Rest" })).toThrow();
  });

  it("names files predictably", () => {
    expect(fitFilename(sampleProgram.title, sampleToday)).toBe("base-building-for-busy-people-w3d4.fit");
  });
});
