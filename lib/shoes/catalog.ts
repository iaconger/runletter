// A shoe list we keep ourselves. No retailer API, no scraping, no affiliate terms: a curated set of the
// families people actually run in, by brand. Versions change every year, so we hold the family (Pegasus,
// Clifton, Endorphin Speed) and let the runner add the number if they care. "Something else" always wins.
export type Brand = { key: string; name: string; models: string[] };

export const BRANDS: Brand[] = [
  { key: "nike", name: "Nike", models: ["Pegasus", "Vomero", "Structure", "Invincible", "Zoom Fly", "Vaporfly", "Alphafly", "Streakfly", "Rival Fly", "Wildhorse", "Ultrafly"] },
  { key: "hoka", name: "Hoka", models: ["Clifton", "Bondi", "Rincon", "Mach", "Arahi", "Speedgoat", "Challenger", "Cielo X1", "Rocket X", "Tecton X", "Skyward X"] },
  { key: "asics", name: "Asics", models: ["Gel-Nimbus", "Gel-Kayano", "Gel-Cumulus", "Novablast", "Superblast", "Magic Speed", "Metaspeed Sky", "Metaspeed Edge", "GT-2000", "Trabuco Max", "Fuji Lite"] },
  { key: "brooks", name: "Brooks", models: ["Ghost", "Glycerin", "Adrenaline GTS", "Launch", "Hyperion", "Hyperion Elite", "Caldera", "Cascadia", "Divide", "Catamount"] },
  { key: "saucony", name: "Saucony", models: ["Ride", "Triumph", "Guide", "Kinvara", "Endorphin Speed", "Endorphin Pro", "Endorphin Elite", "Peregrine", "Xodus", "Tempus"] },
  { key: "newbalance", name: "New Balance", models: ["1080", "880", "860", "Rebel", "SC Elite", "SC Trainer", "SC Pacer", "More", "Hierro", "Summit Unknown"] },
  { key: "adidas", name: "Adidas", models: ["Adizero Boston", "Adizero Adios", "Adizero Adios Pro", "Adizero Evo SL", "Adizero SL", "Ultraboost", "Supernova", "Terrex Agravic", "Terrex Speed"] },
  { key: "on", name: "On", models: ["Cloudmonster", "Cloudsurfer", "Cloudflow", "Cloudboom Echo", "Cloudboom Strike", "Cloudeclipse", "Cloudultra", "Cloudvista"] },
  { key: "puma", name: "Puma", models: ["Deviate Nitro", "Velocity Nitro", "Magnify Nitro", "Fast-R Nitro Elite", "ForeverRun Nitro", "Redeem Pro"] },
  { key: "mizuno", name: "Mizuno", models: ["Wave Rider", "Wave Sky", "Wave Inspire", "Wave Rebellion Pro", "Wave Neo", "Wave Daichi"] },
  { key: "altra", name: "Altra", models: ["Escalante", "Torin", "Rivera", "Lone Peak", "Olympus", "Mont Blanc", "Superior"] },
  { key: "topo", name: "Topo Athletic", models: ["Cyclone", "Phantom", "Magnifly", "Ultrafly", "Ultraventure", "MTN Racer", "Terraventure"] },
  { key: "salomon", name: "Salomon", models: ["Sense Ride", "Speedcross", "S/Lab Ultra", "S/Lab Pulsar", "Ultra Glide", "Genesis", "Aero Glide"] },
  { key: "nnormal", name: "NNormal", models: ["Kjerag", "Tomir", "Kboix"] },
  { key: "merrell", name: "Merrell", models: ["Agility Peak", "MTL Skyfire", "Morphlite", "Long Sky"] },
  { key: "other", name: "Something else", models: [] },
];

/** The colours a runner can tag a pair with. Ours, not the brand's, so nothing is borrowed. */
export const SHOE_COLOURS = [
  { key: "cobalt", label: "Blue", value: "var(--rl-accent)" },
  { key: "plum", label: "Plum", value: "var(--rl-run-long)" },
  { key: "amber", label: "Amber", value: "var(--rl-run-tempo)" },
  { key: "sage", label: "Green", value: "var(--rl-run-easy)" },
  { key: "teal", label: "Teal", value: "var(--rl-run-recovery)" },
  { key: "red", label: "Red", value: "var(--rl-run-race)" },
  { key: "ink", label: "Black", value: "var(--rl-text)" },
  { key: "stone", label: "Stone", value: "var(--rl-run-cross)" },
];
export const colourValue = (k: string | null | undefined) => SHOE_COLOURS.find((c) => c.key === k)?.value ?? "var(--rl-accent)";
export const brandName = (k: string) => BRANDS.find((b) => b.key === k)?.name ?? k;
