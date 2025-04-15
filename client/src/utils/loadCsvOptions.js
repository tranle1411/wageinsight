export async function loadCsvOptions(url) {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.trim().split('\n');

  const values = new Set();
  for (const line of lines) {
    const value = line.trim();
    values.add(value);
  }

  const sorted = Array.from(values).sort();
  const naOptions = sorted.filter(v => v.trim().toLowerCase().includes("n/a"));
  const rest = sorted.filter(v => !v.trim().toLowerCase().includes("n/a"));
  return [...naOptions, ...rest];

}
