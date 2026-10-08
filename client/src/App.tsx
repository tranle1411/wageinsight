import { useCallback, useEffect, useRef, useState } from "react";
import { Turnstile } from "./Turnstile";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Download,
  Leaf,
  LockKeyhole,
  Save,
  Trash2,
  X,
  GitCompareArrows,
  Info,
  LoaderCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bundle, Profile, Prediction, Scenario } from "./types";
import { supabase } from "./auth";
const labels: Record<string, string> = {
  OCC: "Occupation",
  IND: "Industry",
  EDUCD: "Education",
  DEGFIELD: "Bachelor’s field",
  STATEFIP: "Home state",
  SEX: "Sex recorded in survey",
  RACE: "Race",
  HISPAN: "Hispanic origin",
  MARST: "Marital status",
  CITIZEN: "Citizenship",
  SPEAKENG: "English proficiency",
  VETSTAT: "Veteran status",
};
const dollars = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null),
    [profile, setProfile] = useState<Profile>({ AGE: 35 }),
    [variant, setVariant] = useState("career"),
    [year, setYear] = useState(2024);
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Prediction | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [history, setHistory] = useState<
      { id: string; name: string; profile: Profile; prediction: Prediction }[]
    >([]);
  const [explain, setExplain] = useState(false),
    [explanation, setExplanation] = useState(""),
    [explaining, setExplaining] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const explanationRequest = useRef(0);
  useEffect(() => {
    explanationRequest.current++;
    setVerifying(false);
    setExplaining(false);
    setExplanation("");
  }, [result, year, variant]);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [authOpen, setAuthOpen] = useState(false),
    [authBusy, setAuthBusy] = useState(false),
    [recovering, setRecovering] = useState(false);
  const worker = useRef<Worker | null>(null),
    request = useRef(0),
    resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!authOpen) return;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, a[href], summary",
        ) ?? [],
      );
    controls()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setAuthOpen(false);
      if (event.key !== "Tab") return;
      const list = controls(),
        first = list[0],
        last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [authOpen]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/models/bundle.json", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            "Estimates are unavailable right now. Please try again later.",
          );
        return r.json() as Promise<Bundle>;
      })
      .then((b) => {
        if (active) {
          setBundle(b);
          const initial: Profile = {
            ...b.variants.demographic.reference,
            AGE: 35,
          };
          if (
            initial.EDUCD >= 101 &&
            initial.DEGFIELD === 0 &&
            b.options.DEGFIELD.some((o) => o.value === 62)
          )
            initial.DEGFIELD = 62;
          setProfile(initial);
          setYear(b.baseYear);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    const w = new Worker(new URL("./predict.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.id !== request.current) return;
      setBusy(false);
      if (e.data.error) setError(e.data.error);
      else {
        setResult(e.data.result);
        setTimeout(
          () =>
            resultRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          100,
        );
      }
    };
    w.onerror = () => {
      setBusy(false);
      setError("Prediction failed. Please reload and try again.");
    };
    return () => {
      active = false;
      controller.abort();
      w.terminate();
    };
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user.id ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
        setAuthOpen(true);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setHistory([]);
    if (!supabase || !user) {
      return;
    }
    let active = true;
    supabase
      .from("predictions")
      .select("id,name,profile,prediction")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!active) return;
        if (error)
          setNotice(
            "Saved history is unavailable. You can still predict and export.",
          );
        else setHistory(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [user]);
  function change(field: string, value: number) {
    setProfile((p) => ({
      ...p,
      [field]: value,
      ...(field === "EDUCD" && value < 101 ? { DEGFIELD: 0 } : {}),
    }));
    setResult(null);
    setExplain(false);
    setExplanation("");
    request.current++;
    setBusy(false);
  }
  function calculate() {
    if (!bundle) return;
    setError("");
    setExplain(false);
    setExplanation("");
    setBusy(true);
    worker.current?.postMessage({
      id: ++request.current,
      profile,
      variant,
      year,
    });
  }
  function compare() {
    if (!result) return;
    if (scenarios.length >= 4) {
      setNotice("Compare up to four profiles. Remove one to add another.");
      return;
    }
    setScenarios((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        name:
          (labels.OCC &&
            bundle?.options.OCC.find((o) => o.value === profile.OCC)?.label) ||
          "Profile",
        profile: { ...profile },
        prediction: result,
      },
    ]);
    setNotice("Added to this session’s comparison.");
  }
  async function save() {
    if (!result) return;
    if (!supabase || !user) {
      setAuthOpen(true);
      return;
    }
    const row = {
      user_id: user,
      name:
        bundle?.options.OCC.find((o) => o.value === profile.OCC)?.label ||
        "Prediction",
      profile,
      prediction: result,
    };
    const { data, error } = await supabase
      .from("predictions")
      .insert(row)
      .select("id,name,profile,prediction")
      .single();
    if (error)
      setNotice("Could not save. Please try again or export your result.");
    else {
      setHistory((h) => [data, ...h]);
      setNotice("Prediction saved to your account.");
    }
  }
  async function remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("predictions").delete().eq("id", id);
    if (error) setNotice("Could not delete. Try again.");
    else setHistory((h) => h.filter((r) => r.id !== id));
  }
  function exportResults() {
    const data = {
      exportedAt: new Date().toISOString(),
      current: result ? { profile, prediction: result } : null,
      comparisons: scenarios,
      methodology:
        "Historical wage associations. Annual income among full-time year-round wage workers. Not contractual salary or a career forecast.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "wageinsight-scenarios.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function auth(action: "login" | "signup" | "verify" | "reset") {
    if (!supabase) {
      setNotice(
        "Account setup is pending. Guest predictions and exports work without an account.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const response =
        action === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : action === "signup"
            ? await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: window.location.origin },
              })
            : action === "verify"
              ? await supabase.auth.verifyOtp({
                  email,
                  token: code,
                  type: "signup",
                })
              : await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin,
                });
      if (response.error) throw response.error;
      setNotice(
        action === "signup"
          ? "Check your email to verify your account."
          : action === "reset"
            ? "Check your email for a reset link."
            : "Signed in.",
      );
      if (action === "login" || action === "verify") {
        setAuthOpen(false);
        setPassword("");
        setCode("");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }
  async function cloudExplain() {
    if (!result) return;
    setExplain(true);
    setExplaining(false);
    setExplanation("");
    const endpoint = import.meta.env.VITE_EXPLANATION_URL;
    if (!endpoint) {
      setExplanation(
        "Further explanation is unavailable right now. The local summary remains available.",
      );
      setExplaining(false);
      return;
    }
    setVerifying(true);
  }
  const fetchExplanation = useCallback(
    async (token: string) => {
      if (!result) return;
      const generation = ++explanationRequest.current;
      const endpoint = import.meta.env.VITE_EXPLANATION_URL;
      setVerifying(false);
      setExplaining(true);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estimate: result.estimate,
            token,
            lower: result.lower,
            upper: result.upper,
            year,
            variant,
            effects: result.effects
              .slice(0, 4)
              .map((e) => ({ field: labels[e.field], delta: e.delta })),
          }),
          signal: AbortSignal.timeout(20000),
        });
        const data = (await response.json()) as {
          text?: string;
          error?: string;
          resetAt?: string;
        };
        if (generation !== explanationRequest.current) return;
        if (!response.ok) {
          if (data.resetAt)
            throw Error(
              "Further explanation is unavailable right now. Try again at " +
                new Date(data.resetAt).toLocaleString(undefined, {
                  timeZoneName: "short",
                }),
            );
          throw Error(
            data.error ||
              "Further explanation is unavailable right now. Please try again later.",
          );
        }
        if (typeof data.text !== "string")
          throw Error("Further explanation is unavailable right now.");
        setExplanation(data.text);
      } catch (e) {
        if (generation !== explanationRequest.current) return;
        setExplanation(
          e instanceof Error
            ? e.message
            : "Further explanation is unavailable.",
        );
      } finally {
        if (generation === explanationRequest.current) setExplaining(false);
      }
    },
    [result, year, variant],
  );
  function field(key: string) {
    if (key === "OCC" || key === "IND") {
      const options = bundle?.options[key] ?? [];
      const selected =
        options.find((o) => o.value === profile[key])?.label ?? "";
      return (
        <label className="field" key={key}>
          <span>{labels[key]}</span>
          <input
            required
            list={"options-" + key}
            value={searches[key] ?? selected}
            placeholder={"Search " + labels[key].toLowerCase()}
            onChange={(event) => {
              const value = event.target.value;
              setSearches((s) => ({ ...s, [key]: value }));
              const match = options.find((o) => o.label === value);
              event.target.setCustomValidity(
                match ? "" : "Choose an item from the suggestions.",
              );
              if (match) change(key, match.value);
            }}
          />
          <datalist id={"options-" + key}>
            {options.map((o) => (
              <option key={o.value} value={o.label} />
            ))}
          </datalist>
        </label>
      );
    }
    return (
      <label className="field" key={key}>
        <span>{labels[key]}</span>
        <select
          value={profile[key] ?? ""}
          onChange={(e) => change(key, Number(e.target.value))}
        >
          {bundle?.options[key]?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const chart = result?.curve.map((p) => ({ ...p, band: [p.lower, p.upper] }));
  return (
    <div className="site">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brandmark">
            <BarChart3 size={21} />
          </span>
          Wage<span>Insight</span>
        </a>
        <nav>
          <a href="#methodology">How it works</a>
          <button
            className="button small outline"
            onClick={() =>
              user ? supabase?.auth.signOut() : setAuthOpen(true)
            }
          >
            {user ? "Sign out" : "Sign in"}
            <ArrowUpRight size={15} />
          </button>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> THE NUMBERS BEHIND YOUR NEXT CHAPTER
          </div>
          <h1>
            Understand your pay.
            <br />
            <em>Explore your possibilities.</em>
          </h1>
          <p>
            See how education, work, and demographic patterns relate to
            full-time wages across the United States.
          </p>
          <div className="hero-meta">
            <span>
              <LockKeyhole size={14} /> Guest profiles stay on your device
            </span>
            <span>
              <Leaf size={14} /> Powered by US Census microdata
            </span>
          </div>
          <div className="hero-decoration" aria-hidden="true">
            <span>$</span>
            <div className="mini-bars">
              {[35, 60, 48, 82, 68, 100].map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </div>
          </div>
        </section>
        <section className="workspace">
          <aside className="profile panel">
            <div className="panel-heading">
              <span className="step">01</span>
              <div>
                <h2>Your starting point</h2>
                <p>A few details. A clearer picture.</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                calculate();
              }}
            >
              <p className="help">
                An example profile is filled in. Change these details to match
                the person or scenario you want to explore.
              </p>
              <div className="two-fields">
                <label className="field">
                  <span>Age</span>
                  <input
                    type="number"
                    min="25"
                    max="64"
                    required
                    value={profile.AGE}
                    onChange={(e) => change("AGE", Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Dollar basis</span>
                  <select
                    value={year}
                    onChange={(e) => {
                      setYear(Number(e.target.value));
                      setResult(null);
                      setExplain(false);
                      request.current++;
                      setBusy(false);
                    }}
                  >
                    {Object.keys(bundle?.inflation ?? { "2024": 1 }).map(
                      (y) => (
                        <option key={y} value={y}>
                          {y} dollars
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {["STATEFIP", "OCC", "IND", "EDUCD"].map(field)}
              {(profile.EDUCD ?? 0) >= 101 && field("DEGFIELD")}
              <details className="demographics">
                <summary>
                  Explore demographic associations <span>Optional</span>
                </summary>
                <p className="help">
                  Compare historical patterns using a model that includes
                  demographics. These describe associations, not causes or
                  personal worth.
                </p>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={variant === "demographic"}
                    onChange={(e) => {
                      setVariant(e.target.checked ? "demographic" : "career");
                      setResult(null);
                      setExplain(false);
                      request.current++;
                      setBusy(false);
                    }}
                  />{" "}
                  Include demographics in this estimate
                </label>
                {variant === "demographic" &&
                  [
                    "SEX",
                    "RACE",
                    "HISPAN",
                    "MARST",
                    "CITIZEN",
                    "SPEAKENG",
                    "VETSTAT",
                  ].map(field)}
              </details>
              <button
                className="button primary full"
                disabled={busy || !bundle}
                type="submit"
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <>
                    Explore my estimate <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="fineprint">
                Ages 25–64 · 35+ hours/week · 50+ weeks/year
              </p>
            </form>
          </aside>
          <div className="results" ref={resultRef}>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="notice" role="status">
                {notice}
                <button
                  aria-label="Dismiss message"
                  onClick={() => setNotice("")}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {!result ? (
              <div className="empty panel">
                <div className="empty-icon">
                  <BarChart3 size={38} />
                </div>
                <div className="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</div>
                <h2>
                  Your next chapter,
                  <br />
                  backed by data.
                </h2>
                <p>
                  Build your profile to see an income range, explore what
                  changes the estimate, and compare different paths.
                </p>
                <div className="empty-pill">
                  No account needed to explore <ArrowUpRight size={14} />
                </div>
              </div>
            ) : (
              <>
                <article className="estimate panel">
                  <div className="result-label">
                    <span className="eyebrow">
                      ESTIMATED ANNUAL WAGE INCOME
                    </span>
                    <span className="badge">
                      {variant === "career"
                        ? "Career profile"
                        : "With demographics"}
                    </span>
                  </div>
                  <div className="estimate-value">
                    {dollars(result.estimate)}
                    <span>/ year</span>
                  </div>
                  <p className="range">
                    <span className="range-dot" /> Estimated 80% range{" "}
                    <strong>
                      {dollars(result.lower)} — {dollars(result.upper)}
                    </strong>
                  </p>
                  <div className="range-track">
                    <i />
                  </div>
                  <p className="help">
                    In {year} dollars. A historical estimate for full-time,
                    year-round wage workers; benefits and self-employment income
                    are excluded.
                  </p>
                  <div className="action-row">
                    <button className="button outline" onClick={compare}>
                      <GitCompareArrows size={15} /> Compare
                    </button>
                    <button className="button outline" onClick={save}>
                      <Save size={15} /> Save
                    </button>
                    <button
                      className="iconbutton"
                      aria-label="Export results"
                      onClick={exportResults}
                    >
                      <Download size={17} />
                    </button>
                    <button
                      className="textbutton"
                      onClick={() =>
                        explain
                          ? (explanationRequest.current++,
                            setVerifying(false),
                            setExplain(false))
                          : cloudExplain()
                      }
                    >
                      {explain ? "Close explanation" : "Explain this estimate"}{" "}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
                {explain && (
                  <article className="panel explanation">
                    <h3>Reading your estimate</h3>
                    <p>
                      The middle estimate is a modeled median. The range
                      describes individual income variation, rather than
                      confidence in a single person’s exact salary.
                    </p>
                    <p>
                      Changing one field while holding others fixed can show how
                      this model responds. That change does not prove what
                      caused a wage gap.
                    </p>
                    {verifying ? (
                      <Turnstile onToken={fetchExplanation} />
                    ) : explaining ? (
                      <p role="status">Preparing further explanation…</p>
                    ) : (
                      <p>{explanation}</p>
                    )}
                    <p className="fineprint">
                      Extended explanation sends only estimate context to the
                      configured AI provider. No guest history is saved by this
                      app.
                    </p>
                    <a
                      href="https://usa.ipums.org/usa-action/variables/INCWAGE"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source: IPUMS wage income definition ↗
                    </a>
                  </article>
                )}
                <article className="panel factors">
                  <div className="section-title">
                    <h3>What changes the estimate?</h3>
                    <span className="badge neutral">Model associations</span>
                  </div>
                  <p className="help">
                    Each field compared with its most common training category,
                    holding your other choices fixed. Changes are not additive.
                  </p>
                  {result.effects.slice(0, 5).map((e) => (
                    <div className="factor" key={e.field}>
                      <div
                        className={
                          e.delta >= 0
                            ? "factor-icon positive"
                            : "factor-icon negative"
                        }
                      >
                        {e.delta >= 0 ? (
                          <ArrowUpRight size={17} />
                        ) : (
                          <ArrowDownRight size={17} />
                        )}
                      </div>
                      <div>
                        <strong>{labels[e.field]}</strong>
                        <small>
                          Versus{" "}
                          {
                            bundle?.options[e.field]?.find(
                              (o) =>
                                o.value ===
                                bundle.variants[variant].reference[e.field],
                            )?.label
                          }
                        </small>
                      </div>
                      <span className={e.delta >= 0 ? "positive" : "negative"}>
                        {e.delta >= 0 ? "+" : "−"}
                        {dollars(Math.abs(e.delta))}
                      </span>
                    </div>
                  ))}
                </article>
                {bundle?.peers?.[String(profile.OCC)] && (
                  <article className="panel peers">
                    <div className="section-title">
                      <h3>People in the same occupation</h3>
                      <span className="badge neutral">Observed wages</span>
                    </div>
                    <p className="help">
                      Weighted training-period statistics, across states and
                      education levels. In {year} dollars; this group is broader
                      than your profile.
                    </p>
                    <h2>
                      {dollars(
                        bundle.peers[String(profile.OCC)].median *
                          bundle.inflation[String(year)],
                      )}
                      <small className="help"> median annual wage income</small>
                    </h2>
                    <p className="help">
                      Middle 80%:{" "}
                      {dollars(
                        bundle.peers[String(profile.OCC)].lower *
                          bundle.inflation[String(year)],
                      )}{" "}
                      –{" "}
                      {dollars(
                        bundle.peers[String(profile.OCC)].upper *
                          bundle.inflation[String(year)],
                      )}
                      . Based on{" "}
                      {bundle.peers[String(profile.OCC)].n.toLocaleString()}{" "}
                      sampled records; not the national population count.
                    </p>
                  </article>
                )}
                <article className="panel chart">
                  <div className="section-title">
                    <h3>Age in perspective</h3>
                    <span className="badge neutral">
                      Same profile · different ages
                    </span>
                  </div>
                  <p className="help">
                    Cross-sectional estimates, not your future career
                    trajectory. Shaded area: estimated 80% range.
                  </p>
                  <ResponsiveContainer width="100%" height={235}>
                    <AreaChart
                      data={chart}
                      margin={{ left: 0, right: 15, top: 10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#e9ece7" />
                      <XAxis
                        dataKey="age"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={(n) => "$" + Math.round(n / 1000) + "k"}
                        width={55}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) =>
                          Array.isArray(value)
                            ? value.map(Number).map(dollars).join(" – ")
                            : dollars(Number(value))
                        }
                        labelFormatter={(l) => "Age " + l}
                      />
                      <Area
                        dataKey="band"
                        name="Range"
                        fill="#e2ece6"
                        stroke="none"
                        type="monotone"
                      />
                      <Area
                        dataKey="estimate"
                        name="Estimate"
                        stroke="#216650"
                        fill="transparent"
                        strokeWidth={2.5}
                        type="monotone"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </article>
              </>
            )}
          </div>
        </section>
        {scenarios.length > 0 && (
          <section className="panel comparison">
            <div className="section-title">
              <div>
                <span className="eyebrow">EXPLORE DIFFERENT PATHS</span>
                <h2>Your side-by-side comparison</h2>
              </div>
              <button className="button outline" onClick={exportResults}>
                <Download size={16} /> Export
              </button>
            </div>
            <div className="scenario-grid">
              {scenarios.map((s, i) => (
                <article key={s.id}>
                  <button
                    className="remove"
                    aria-label={"Remove profile " + (i + 1)}
                    onClick={() =>
                      setScenarios((a) => a.filter((x) => x.id !== s.id))
                    }
                  >
                    <X size={16} />
                  </button>
                  <span className="eyebrow">PROFILE {i + 1}</span>
                  <h3>{s.name}</h3>
                  <strong>{dollars(s.prediction.estimate)}</strong>
                  <p>
                    {dollars(s.prediction.lower)} –{" "}
                    {dollars(s.prediction.upper)}
                  </p>
                  <small>
                    Age {s.profile.AGE} · {s.prediction.year} dollars
                  </small>
                </article>
              ))}
            </div>
            <p className="help">
              Comparisons stay in this session unless you explicitly save.
              Education/occupation changes represent model scenarios, not causal
              returns on investment.
            </p>
          </section>
        )}
        {user && (
          <section className="panel saved">
            <h2>Saved predictions</h2>
            {history.length === 0 ? (
              <p className="help">
                Your account history is empty. Use Save on a result to keep it.
              </p>
            ) : (
              history.map((h) => (
                <div className="history-row" key={h.id}>
                  <span>
                    {h.name}
                    <small>
                      {dollars(h.prediction.estimate)} · {h.prediction.year}{" "}
                      dollars
                    </small>
                  </span>
                  <button
                    className="iconbutton"
                    aria-label={"Delete " + h.name}
                    onClick={() => remove(h.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))
            )}
          </section>
        )}
        <section id="methodology" className="methodology">
          <div>
            <span className="eyebrow">TRANSPARENCY, BY DESIGN</span>
            <h2>
              Useful context.
              <br />
              Honest limitations.
            </h2>
          </div>
          <div className="method-grid">
            <div>
              <Info size={20} />
              <h3>Population, not promise</h3>
              <p>
                ACS 2018–2024, excluding 2020. Full-time year-round wage
                workers, ages 25–64. Estimates cannot predict an exact offer.
              </p>
            </div>
            <div>
              <LockKeyhole size={20} />
              <h3>You choose what stays</h3>
              <p>
                Guest profiles stay in memory. Signing in doesn’t automatically
                save results. You control Save and Delete.
              </p>
            </div>
            <div>
              <BarChart3 size={20} />
              <h3>Evidence you can inspect</h3>
              <p>
                Chronological evaluation, survey weights, and separate
                calibration.{" "}
                {bundle
                  ? "2024 test coverage: " +
                    Math.round(bundle.metrics[variant].coverage * 100) +
                    "%."
                  : "Model metrics appear after training."}{" "}
                Protected traits describe historical associations.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          WageInsight
        </a>
        <span>
          Built by{" "}
          <a
            href="https://github.com/tranle1411/wageinsight"
            target="_blank"
            rel="noreferrer"
          >
            Tran Le ↗
          </a>
        </span>
        <a
          href="https://doi.org/10.18128/D010.V16.0"
          target="_blank"
          rel="noreferrer"
        >
          Data: IPUMS USA ↗
        </a>
      </footer>
      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="remove"
              aria-label="Close sign in"
              onClick={() => setAuthOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 id="auth-title">Keep your discoveries</h2>
            <p className="help">
              Sign in to save and manage predictions. Guest exploration is
              always available.
            </p>
            {!supabase ? (
              <p className="alert">
                Sign-in is unavailable right now. Continue exploring as a guest.
              </p>
            ) : recovering ? (
              <>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={authBusy || password.length < 8}
                  onClick={async () => {
                    setAuthBusy(true);
                    const response = await supabase!.auth.updateUser({
                      password,
                    });
                    setAuthBusy(false);
                    if (response.error) setNotice(response.error.message);
                    else {
                      setNotice("Password updated.");
                      setPassword("");
                      setRecovering(false);
                      setAuthOpen(false);
                    }
                  }}
                >
                  Update password
                </button>
              </>
            ) : (
              <>
                <div className="oauth">
                  {(["google", "github"] as const).map((provider) => (
                    <button
                      className="button outline"
                      key={provider}
                      onClick={() =>
                        supabase?.auth.signInWithOAuth({
                          provider,
                          options: { redirectTo: window.location.origin },
                        })
                      }
                    >
                      Continue with {provider}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <div className="action-row">
                  <button
                    disabled={authBusy}
                    className="button primary"
                    onClick={() => auth("login")}
                  >
                    Sign in
                  </button>
                  <button
                    disabled={authBusy || password.length < 8}
                    className="button outline"
                    onClick={() => auth("signup")}
                  >
                    Create account
                  </button>
                </div>
                <button className="textbutton" onClick={() => auth("reset")}>
                  Forgot password?
                </button>
                <details>
                  <summary>Verify with an email code</summary>
                  <label className="field">
                    <span>Verification code</span>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="one-time-code"
                    />
                  </label>
                  <button
                    className="button outline"
                    disabled={authBusy}
                    onClick={() => auth("verify")}
                  >
                    Verify email
                  </button>
                </details>
              </>
            )}
            <p role="status">{notice}</p>
          </section>
        </div>
      )}
    </div>
  );
}
