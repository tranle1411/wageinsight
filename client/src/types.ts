export type Profile = Record<string, number>;
export type Tree = {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  defaultLeft: boolean[];
};
export type Forest = { base: number; trees: Tree[] };
export type Variant = {
  features: string[];
  maps: Record<string, Record<string, number>>;
  fallback: number;
  forests: Forest[];
  calibration: number;
  reference: Profile;
};
export type Option = { value: number; label: string };
export type Bundle = {
  peers?: Record<
    string,
    { n: number; median: number; lower: number; upper: number }
  >;
  version: string;
  baseYear: number;
  inflation: Record<string, number>;
  options: Record<string, Option[]>;
  variants: Record<string, Variant>;
  metrics: Record<string, Record<string, number>>;
  provenance: Record<string, unknown>;
};
export type Prediction = {
  estimate: number;
  lower: number;
  upper: number;
  year: number;
  modelVersion: string;
  variant: string;
  curve: { age: number; estimate: number; lower: number; upper: number }[];
  effects: { field: string; delta: number }[];
};
export type Scenario = {
  id: string;
  name: string;
  profile: Profile;
  prediction: Prediction;
};
