import React, { useState, useEffect } from 'react';
import {
  Autocomplete, TextField, Button,
  MenuItem, Select, InputLabel, FormControl, CircularProgress
} from '@mui/material';
import Plot from 'react-plotly.js';
import { loadCsvOptions } from './utils/loadCsvOptions';
import './App.css';

const API_URL = "https://wageinsight.onrender.com/predict_form";

const basicFields = ['OCC','IND','DEGFIELD1','EDUC','WORKSTATE'];
const advancedFields = [
  'SEX','MARST','VETSTAT','HISPAN','CITIZEN','SPEAKENG',
  'OCC','IND','EDUC','DEGFIELD1','DEGFIELD2','RACE','WORKSTATE'
];

const prettyLabels = {
  SEX:      "Gender",
  MARST:    "Marital Status",
  VETSTAT:  "Veteran Status",
  HISPAN:   "Hispanic Origin",
  CITIZEN:  "Citizenship",
  SPEAKENG: "English Fluency",
  OCC:      "Occupation",
  IND:      "Industry",
  EDUC:     "Education Level",
  DEGFIELD1:"1st Degree Field",
  DEGFIELD2:"2nd Degree Field",
  RACE:     "Race",
  WORKSTATE:"Work State"
};

// If you need a custom order for EDUC:
const EDUC_ORDER = [
  "N/A or no schooling",
  "Nursery school to grade 4",
  "Grade 5","Grade 6","Grade 7","Grade 8",
  "Grade 9","Grade 10","Grade 11","Grade 12",
  "1 year of college","2 years of college","3 years of college",
  "4 years of college","5+ years of college"
];

export default function WageInsightForm() {
  const [mode, setMode]         = useState('basic');
  const [options, setOptions]   = useState({});
  const [inputs, setInputs]     = useState({});
  const [series, setSeries]     = useState(null);
  const [info, setInfo]         = useState([]);
  const [loading, setLoading]   = useState(false);

  const fields = mode === 'basic' ? basicFields : advancedFields;

  // load CSV dropdowns once
  useEffect(() => {
    async function loadAll() {
      const p = "/wageinsight/options/";
      const o = {
        OCC: await loadCsvOptions(p+"occupation.csv"),
        IND: await loadCsvOptions(p+"industry.csv"),
        EDUC: await loadCsvOptions(p+"educ.csv"),
        DEGFIELD1: await loadCsvOptions(p+"degree.csv"),
        DEGFIELD2: await loadCsvOptions(p+"degree.csv"),
        RACE: await loadCsvOptions(p+"race.csv"),
        WORKSTATE: await loadCsvOptions(p+"state.csv"),
        SEX: ['Man','Woman'],
        MARST: ['Married','Not married'],
        VETSTAT: ['Veteran','Not a veteran'],
        HISPAN: ['Hispanic','Not Hispanic'],
        CITIZEN: ['Citizen','Not citizen'],
        SPEAKENG: ['Speaks English','Does not speak English']
      };
      
      // override EDUC order if desired
      o.EDUC = EDUC_ORDER.filter(x => o.EDUC.includes(x)).concat(
        o.EDUC.filter(x => !EDUC_ORDER.includes(x))
      );
      setOptions(o);
    }
    loadAll();
  }, []);

  // when mode toggles, clear state
  const handleModeChange = e => {
    setMode(e.target.value);
    setInputs({});
    setSeries(null);
    setInfo([]);
  };

  const handleChange = field => (_, value) => {
    setInputs(i => ({ ...i, [field]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // ensure all filled
    for (let f of fields) {
      if (!inputs[f]) {
        alert(`Please select ${prettyLabels[f]||f}`);
        return;
      }
    }
    setLoading(true);
    setSeries(null);
    setInfo([]);
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ mode, inputs })
      });
      const data = await resp.json();
      if (data.series) setSeries(data.series);
      if (data.info)   setInfo(data.info);
    } catch(err) {
      console.error(err);
      alert("Prediction failed, check console");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>WageInsight Dashboard</h1>

      <FormControl sx={{ minWidth: 120, mb: 2 }}>
        <InputLabel>Mode</InputLabel>
        <Select value={mode} label="Mode" onChange={handleModeChange}>
          <MenuItem value="basic">Basic</MenuItem>
          <MenuItem value="advanced">Advanced</MenuItem>
        </Select>
      </FormControl>

      <form onSubmit={handleSubmit}>
        {fields.map(f => (
          <Autocomplete
            key={f}
            options={options[f]||[]}
            getOptionLabel={o=>o}
            value={inputs[f]||null}
            onChange={handleChange(f)}
            renderInput={params=>(
              <TextField
                {...params}
                label={prettyLabels[f]||f}
                variant="outlined"
                margin="normal"
                required
              />
            )}
          />
        ))}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading
            ? <CircularProgress size={24}/>
            : "Predict Salary"}
        </Button>
      </form>

      {/* line plot */}
      {series && (
        <Plot
          data={[{
            x: series.map(p=>p.age),
            y: series.map(p=>p.salary),
            type:'scatter', mode:'lines+markers',
            hovertemplate:'Age: %{x}<br>Salary: $%{y:,.0f}<extra></extra>'
          }]}
          layout={{
            width:700, height:400,
            title:'Predicted Salary vs. Age',
            xaxis:{title:'Age'}, yaxis:{title:'Salary ($)'}
          }}
        />
      )}

      {/* info panel */}
      {info.length > 0 && (
        <div className="infoPanel" style={{ marginTop: '1rem', textAlign:'left' }}>
          {info.map((it,i)=>(
            <p key={i}>
              On median, <strong>{it.you}</strong> {it.label} make{' '}
              <strong>${it.delta.toLocaleString(undefined,{maximumFractionDigits:2})}</strong>{' '}
              {it.more ? 'more' : 'less'} than <strong>{it.other}</strong>.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
