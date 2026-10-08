export const featureGroups: Record<string, string> = {
  EDUCD: "education",
  DEGFIELD: "education",
  OCC: "profession",
  IND: "profession",
  SEX: "demographics",
  RACE: "demographics",
  HISPAN: "demographics",
  MARST: "demographics",
  CITIZEN: "demographics",
  SPEAKENG: "demographics",
  VETSTAT: "demographics",
  STATEFIP: "location",
};
export type Contrast = {
  field: string;
  selected: string;
  reference: string;
  delta: number;
};
export const research = [
  {
    id: "flexibility",
    title: "Goldin — Job structure and the gender pay gap (2014)",
    url: "https://www.aeaweb.org/articles?id=10.1257%2Faer.104.4.1091",
    fields: ["SEX"],
    fact: "Goldin's 2014 research on historical gender convergence highlights how some jobs disproportionately reward long or particular work hours and how temporal flexibility relates to gender pay gaps. This is a researched labor-market mechanism, not proof of the cause of this user's model contrast. This app does not measure job scheduling or career interruptions.",
  },
  {
    id: "education",
    title: "BLS — Education pays (2025)",
    url: "https://www.bls.gov/emp/tables/unemployment-earnings-education.htm",
    fields: ["EDUCD"],
    fact: "BLS reports higher median weekly earnings at higher education levels among full-time wage workers age 25+. These broad CPS comparisons are not causal estimates and omit on-the-job training. The 2025 table is an 11-month average, not this app's ACS annual-income sample.",
  },
  {
    id: "degree",
    title: "Census — Earnings by bachelor's field (2023 article; 2022 data)",
    url: "https://www.census.gov/library/stories/2023/12/education-does-not-resolve-gender-wage-gap.html",
    fields: ["DEGFIELD", "SEX"],
    fact: "Census describes earnings differences across bachelor's fields and between men and women within fields. Occupation, experience, full-time status and further education may be related to those differences. This does not establish why a particular individual's earnings differ.",
  },
  {
    id: "occupation",
    title: "BLS — Women's earnings, 2024",
    url: "https://www.bls.gov/opub/reports/womens-earnings/2024/home.htm",
    fields: ["OCC", "IND", "SEX", "RACE", "HISPAN"],
    fact: "BLS documents earnings patterns across occupations, education, sex, race and ethnicity, and occupational distributions of women and men. Its weekly-earnings comparisons do not control for all job responsibilities, experience or specialization. They are broader comparisons, not explanations of this app's individual dollar contrasts.",
  },
  {
    id: "longterm",
    title: "Census research — Long-term earnings differences (2021)",
    url: "https://www.census.gov/library/working-papers/2021/adrm/CES-WP-21-07.html",
    fields: ["SEX", "RACE", "HISPAN"],
    fact: "This Census working paper examines long-term earnings differences by sex, race, ethnicity and place of birth. Hours paid, geography, industry and education account for different portions of gaps across the earnings distribution. Its population and outcome differ from this app. Remaining gaps do not by themselves identify a cause.",
  },
];
export function sourcesFor(effects: Contrast[]) {
  return research.filter((s) =>
    effects.some((e) => s.fields.includes(e.field)),
  );
}
export function selectContrasts(effects: Contrast[]) {
  return ["education", "profession", "demographics", "location"].flatMap(
    (group) =>
      effects
        .filter((e) => featureGroups[e.field] === group)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, group === "location" ? 1 : 2),
  );
}
