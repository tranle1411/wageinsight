// src/WageInsightForm.jsx

import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, Button } from '@mui/material';
import Plot from 'react-plotly.js';
import './App.css';
import { loadCsvOptions } from './utils/loadCsvOptions';

const API_URL = "https://wageinsight.onrender.com/predict_form";

const basicFields = ['OCC', 'IND', 'DEGFIELD1', 'EDUC', 'WORKSTATE'];
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

export default function WageInsightForm() {
  const [mode, setMode] = useState('basic');
  const [fields, setFields] = useState(basicFields);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState({});
  const [curve, setCurve] = useState({ ages: [], salaries: [] });
  const [info, setInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  // load dropdown options once
  useEffect(() => {
    const prefix = process.env.PUBLIC_URL + '/options/';
    async function loadAll() {
      const loaded = {
        OCC:    await loadCsvOptions(prefix + "occupation.csv"),
        IND:    await loadCsvOptions(prefix + "industry.csv"),
        EDUC:   await loadCsvOptions(prefix + "educ.csv"),
        DEGFIELD1: await loadCsvOptions(prefix + "degree.csv"),
        DEGFIELD2: await loadCsvOptions(prefix + "degree.csv"),
        RACE:   await loadCsvOptions(prefix + "race.csv"),
        WORKSTATE: await loadCsvOptions(prefix + "state.csv"),
        SEX:    ['Man','Woman'],
        MARST:  ['Married','Not married'],
        VETSTAT:['Veteran','Not a veteran'],
        HISPAN: ['Hispanic','Not Hispanic'],
        CITIZEN:['Citizen','Not citizen'],
        SPEAKENG:['Speaks English','Does not speak English']
      };
      setOptions(loaded);
    }
    loadAll();
  }, []);

  // update fields when mode toggles
  useEffect(() => {
    setFields(mode === 'basic' ? basicFields : advancedFields);
    setForm({});
    setCurve({ ages: [], salaries: [] });
    setInfo([]);
  }, [mode]);

  const handleChange = (field) => (_, value) => {
    setForm(f => ({ ...f, [field]: value || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fields.some(f => !form[f])) {
      alert("Please select a value for every field.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, inputs: form })
      });
      const data = await resp.json();
      setCurve({ ages: data.ages, salaries: data.salaries });
      setInfo(data.info);
    } catch (err) {
      console.error(err);
      alert("Prediction failed; check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>WageInsight Salary Curve</h1>

      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              <strong>Mode:&nbsp;</strong>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>

          {fields.map(f => (
            <div key={f} className="fieldRow">
              <Autocomplete
                options={options[f] || []}
                getOptionLabel={o => o}
                value={form[f] || ''}
                onChange={handleChange(f)}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={prettyLabels[f]}
                    required
                    variant="outlined"
                    size="small"
                  />
                )}
              />
            </div>
          ))}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Predicting…' : 'Predict Salary Curve'}
          </Button>
        </form>
      </div>

      {Array.isArray(curve.ages) && curve.ages.length > 0 && (
        <div className="dashboard">
          <div className="chart">
            <Plot
              data={[{
                x: curve.ages,
                y: curve.salaries,
                type: 'scatter',
                mode: 'lines+markers',
                hovertemplate: 'Age: %{x}<br>Salary: $%{y:,.0f}<extra></extra>'
              }]}
              layout={{
                margin: { t: 20, b: 40, l: 40, r: 20 },
                xaxis: { title: 'Age' },
                yaxis: { title: 'Predicted Salary' },
                autosize: true
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="infoPanel">
            {info.map((it,i) => (
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
