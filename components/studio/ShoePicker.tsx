"use client";
// Adding a pair, in the app: brand, then model, then a colour. Our own list, so nothing is borrowed from a
// retailer and nothing breaks when a link rots. "Something else" takes whatever they type.
import { useState, useTransition } from "react";
import { BRANDS, SHOE_COLOURS, colourValue } from "@/lib/shoes/catalog";
import { Shoe as ShoeMark } from "@/components/studio/Rotation";

export type StravaPair = { id: string; label: string; distanceM: number };

export function ShoePicker({ add, stravaPairs = [] }: {
  add: (input: { brand: string; model: string; colour: string; nickname: string | null; stravaGearId: string | null; distanceM: number }) => Promise<{ ok: boolean; error?: string }>;
  /** Pairs Strava already knows, offered so the mileage comes along. */
  stravaPairs?: StravaPair[];
}) {
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [colour, setColour] = useState("cobalt");
  const [link, setLink] = useState<string>("");
  const [pending, start] = useTransition();

  const b = BRANDS.find((x) => x.key === brand) ?? null;
  const reset = () => { setOpen(false); setBrand(null); setModel(""); setColour("cobalt"); setLink(""); };
  const save = () => {
    if (!brand || !model.trim()) return;
    const pair = stravaPairs.find((p) => p.id === link) ?? null;
    start(async () => {
      await add({ brand, model: model.trim(), colour, nickname: null, stravaGearId: pair?.id ?? null, distanceM: pair?.distanceM ?? 0 });
      reset();
    });
  };

  if (!open) {
    return (
      <button type="button" className="rl-btn rl-btn-secondary rl-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setOpen(true)}>
        Add a pair
      </button>
    );
  }

  return (
    <div className="rl-shoeadd">
      <div className="q">
        <span className="ask">Brand</span>
        <div className="opts">
          {BRANDS.map((x) => (
            <button key={x.key} type="button" data-on={brand === x.key ? "true" : undefined} onClick={() => { setBrand(x.key); setModel(""); }}>{x.name}</button>
          ))}
        </div>
      </div>

      {b && (
        <div className="q">
          <span className="ask">{b.models.length ? "Model" : "What is it"}</span>
          {b.models.length > 0 && (
            <div className="opts">
              {b.models.map((m) => (
                <button key={m} type="button" data-on={model === m ? "true" : undefined} onClick={() => setModel(m)}>{m}</button>
              ))}
            </div>
          )}
          <input
            className="rl-input"
            placeholder={b.models.length ? "or type it, with the version if you like" : "Brand and model"}
            value={model}
            maxLength={60}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
      )}

      {b && model.trim() && (
        <>
          <div className="q">
            <span className="ask">Colour</span>
            <div className="swatches">
              {SHOE_COLOURS.map((c) => (
                <button key={c.key} type="button" title={c.label} aria-label={c.label} data-on={colour === c.key ? "true" : undefined}
                  onClick={() => setColour(c.key)} style={{ ["--sw" as string]: c.value }} />
              ))}
            </div>
          </div>

          {stravaPairs.length > 0 && (
            <div className="q">
              <span className="ask">Mileage</span>
              <select className="rl-input" value={link} onChange={(e) => setLink(e.target.value)}>
                <option value="">Start at zero</option>
                {stravaPairs.map((p) => <option key={p.id} value={p.id}>Use {p.label}</option>)}
              </select>
              <span className="rl-help">Linking a Strava pair brings its mileage with it.</span>
            </div>
          )}

          <div className="preview">
            <ShoeMark size={24} tint={colourValue(colour)} letter={b.name} />
            <span>{b.name} {model.trim()}</span>
          </div>
        </>
      )}

      <div className="rl-row" style={{ gap: 6 }}>
        <button type="button" className="rl-btn rl-btn-primary rl-btn-sm" disabled={!brand || !model.trim() || pending} onClick={save}>
          {pending ? "Adding" : "Add it"}
        </button>
        <button type="button" className="rl-btn rl-btn-ghost rl-btn-sm" disabled={pending} onClick={reset}>Cancel</button>
      </div>
    </div>
  );
}
