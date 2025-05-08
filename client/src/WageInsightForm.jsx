// src/WageInsightForm.jsx
import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, Button, MenuItem, Select, InputLabel, FormControl, CircularProgress } from '@mui/material';
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
  const [mode, setMode] = useState('basic');
  const [options, setOptions] = useState({});
  const [inputs, setInputs] = useState({});
  const [series, setSeries] = useState(null);
  const [singleSalary, setSingleSalary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fields = mode === 'basic' ? basicFields : advancedFields;

  useEffect(() => {
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

      // override EDUC order if desired
      opts.EDUC = EDUC_ORDER.filter(x => opts.EDUC.includes(x)).concat(
        opts.EDUC.filter(x => !EDUC_ORDER.includes(x))
      );

      setOptions(opts);
    }
    loadAll();
  }, []);

  const handleChange = (field) => (_, value) => {
    setInputs(i => ({ ...i, [field]: value }));
  };

  const handleModeChange = (e) => {
    setMode(e.target.value);
    setInputs({});       // clear previous inputs
    setSeries(null);
    setSingleSalary(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validate
    for (let f of fields) {
      if (!inputs[f]) {
        alert(`Please select ${prettyLabels[f] || f}`);
        return;
      }
    }

    setLoading(true);
    setSeries(null);
    setSingleSalary(null);

    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ mode, inputs })
      });
      const data = await resp.json();

      if (data.series) {
        setSeries(data.series);
      } else if (data.salary) {
        setSingleSalary(data.salary);
      } else if (data.prediction) {
        setSingleSalary(data.prediction);
      }
    } catch(err) {
      console.error(err);
      alert("Prediction failed, see console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>WageInsight Dashboard</h1>
      <FormControl sx={{ minWidth:120, marginBottom:2 }}>
        <InputLabel>Mode</InputLabel>
        <Select value={mode} label="Mode" onChange={handleModeChange}>
          <MenuItem value="basic">Basic</MenuItem>
          <MenuItem value="advanced">Advanced</MenuItem>
        </Select>
      </FormControl>

      <form onSubmit={handleSubmit}>
        {fields.map(field => (
          <Autocomplete
            key={field}
            options={options[field]||[]}
            getOptionLabel={opt=>opt}
            onChange={handleChange(field)}
            value={inputs[field]||null}
            renderInput={params => (
              <TextField
                {...params}
                label={prettyLabels[field]||field}
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
        >
          {loading ? <CircularProgress size={24}/> : "Predict Salary"}
        </Button>
      </form>

      {series && (
        <Plot
          data={[{
            x: series.map(pt=>pt.age),
            y: series.map(pt=>pt.salary),
            type: 'scatter', mode: 'lines+markers',
            marker: { size:6 }
          }]}
          layout={{
            width: 700, height: 400,
            title: 'Predicted Salary vs. Age',
            xaxis:{ title:'Age' }, yaxis:{ title:'Salary ($)' }
          }}
        />
      )}

      {singleSalary != null && (
        <div style={{ marginTop:20 }}>
          <h2>Estimated Salary:</h2>
          <p style={{ fontSize:24 }}>
            <strong>${singleSalary.toLocaleString(undefined,{maximumFractionDigits:2})}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
