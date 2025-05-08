// src/WageInsightForm.jsx

import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
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
  SEX: "Gender",
  MARST: "Marital Status",
  VETSTAT: "Veteran Status",
  HISPAN: "Hispanic Origin",
  CITIZEN: "Citizenship",
  SPEAKENG: "English Fluency",
  OCC: "Occupation",
  IND: "Industry",
  EDUC: "Education Level",
  DEGFIELD1: "1st Degree Field",
  DEGFIELD2: "2nd Degree Field",
  RACE: "Race",
  WORKSTATE: "Work State"
};

// custom order for EDUC if needed
const EDUC_ORDER = [
  "N/A or no schooling",
  "Nursery school to grade 4",
  "Grade 5","Grade 6","Grade 7","Grade 8",
  "Grade 9","Grade 10","Grade 11","Grade 12",
  "1 year of college","2 years of college","3 years of college",
  "4 years of college","5+ years of college"
];

export default function WageInsightForm() {
  const [mode, setMode] = useState('basic');
  const [options, setOptions] = useState({});
  const [inputs, setInputs] = useState({});
  const [series, setSeries] = useState([]);
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  const fields = mode === 'basic' ? basicFields : advancedFields;

  useEffect(() => {
    // fetch all dropdown options once
    async function loadAll() {
      const prefix = "/wageinsight/options/";
      const opts = {
        OCC: await loadCsvOptions(prefix + "occupation.csv"),
        IND: await loadCsvOptions(prefix + "industry.csv"),
        EDUC: await loadCsvOptions(prefix + "educ.csv"),
        DEGFIELD1: await loadCsvOptions(prefix + "degree.csv"),
        DEGFIELD2: await loadCsvOptions(prefix + "degree.csv"),
        RACE: await loadCsvOptions(prefix + "race.csv"),
        WORKSTATE: await loadCsvOptions(prefix + "state.csv"),
        SEX: ['Man','Woman'],
        MARST: ['Married','Not married'],
        VETSTAT: ['Veteran','Not a veteran'],
        HISPAN: ['Hispanic','Not Hispanic'],
        CITIZEN: ['Citizen','Not citizen'],
        SPEAKENG: ['Speaks English','Does not speak English']
      };
      // enforce custom EDUC ordering
      opts.EDUC = EDUC_ORDER.filter(x => opts.EDUC.includes(x))
        .concat(opts.EDUC.filter(x => !EDUC_ORDER.includes(x)));
      setOptions(opts);
    }
    loadAll();
  }, []);

  // reset inputs/outputs when mode changes
  useEffect(() => {
    setInputs({});
    setSeries([]);
    setInfo([]);
  }, [mode]);

  const handleInputChange = field => (_, value) => {
    setInputs(inp => ({ ...inp, [field]: value || '' }));
  };

  const handleModeChange = e => {
    setMode(e.target.value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // ensure all fields filled
    for (let f of fields) {
      if (!inputs[f]) {
        alert(`Please select ${prettyLabels[f] || f}`);
        return;
      }
    }

    setLoading(true);
    setSeries([]);
    setInfo([]);

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ mode, inputs })
      });
      const data = await resp.json();

      // expect backend to return: { series: [...], info: [...] }
      if (data.series) {
        setSeries(data.series);
      }
      if (data.info) {
        setInfo(data.info);
      }
    } catch(err) {
      console.error(err);
      alert("Prediction failed; see console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>WageInsight Dashboard</h1>

      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <FormControl sx={{ minWidth: 140, marginRight: 2 }}>
            <InputLabel>Mode</InputLabel>
            <Select value={mode} label="Mode" onChange={handleModeChange}>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>

          {fields.map(field => (
            <Autocomplete
              key={field}
              sx={{ width: 250, marginRight: 2 }}
              options={options[field] || []}
              getOptionLabel={opt=>opt}
              value={inputs[field]||null}
              onChange={handleInputChange(field)}
              renderInput={params => (
                <TextField
                  {...params}
                  label={prettyLabels[field]||field}
                  variant="outlined"
                  size="small"
                  required
                />
              )}
            />
          ))}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ height: 40 }}
            disabled={loading}
          >
            {loading
              ? <CircularProgress size={24} color="inherit" />
              : "Predict Salary Curve"}
          </Button>
        </form>
      </div>

      {/* once we have results, show dashboard */}
      {series.length > 0 && (
        <div className="dashboard">
          <div className="chart">
            <Plot
              data={[{
                x: series.map(pt => pt.age),
                y: series.map(pt => pt.salary),
                type: 'scatter',
                mode: 'lines+markers',
                hovertemplate: 'Age: %{x}<br>Salary: $%{y:,.0f}<extra></extra>'
              }]}
              layout={{
                width: 600,
                height: 400,
                margin: { t: 40, l: 50, r: 20, b: 50 },
                xaxis: { title: 'Age' },
                yaxis: { title: 'Predicted Salary ($)' }
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="infoPanel">
            {info.map((it, i) => (
              <p key={i}>
                On median, <strong>{it.you}</strong> {it.label} make&nbsp;
                <strong>${it.delta.toLocaleString()}</strong>&nbsp;
                {it.more ? 'more' : 'less'} than <strong>{it.other}</strong>.
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
