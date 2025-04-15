import React, { useState, useEffect } from 'react';
import './App.css';
import { loadCsvOptions } from './utils/loadCsvOptions';
import { Autocomplete, TextField } from '@mui/material';


const API_URL = "https://wageinsight.onrender.com/predict_form";

const basicFields = ['AGE', 'OCC', 'IND', 'DEGFIELD1', 'EDUC', 'WORKSTATE'];
const advancedFields = [
  'SEX', 'AGE', 'MARST', 'VETSTAT', 'HISPAN', 'CITIZEN',
  'SPEAKENG', 'OCC', 'IND', 'EDUC', 'DEGFIELD1', 'DEGFIELD2', 'RACE', 'WORKSTATE'
];

const prettyLabels = {
  AGE: "Age",
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

const EDUC_ORDER = [
  "N/A or no schooling",
  "Nursery school to grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8",
  "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "1 year of college", "2 years of college", "3 years of college",
  "4 years of college", "5+ years of college"
];

function WageInsightForm() {
  const [mode, setMode] = useState('basic');
  const [formData, setFormData] = useState({});
  const [fieldOptions, setFieldOptions] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const fields = mode === 'basic' ? basicFields : advancedFields;

  useEffect(() => {
    async function loadAll() {
      const prefix = "/wageinsight/options/";
      const options = {
        EDUC: await loadCsvOptions(prefix + "educ.csv"),
        DEGFIELD1: await loadCsvOptions(prefix + "degree.csv"),
        DEGFIELD2: await loadCsvOptions(prefix + "degree.csv"),
        OCC: await loadCsvOptions(prefix + "occupation.csv"),
        IND: await loadCsvOptions(prefix + "industry.csv"),
        RACE: await loadCsvOptions(prefix + "race.csv"),
        WORKSTATE: await loadCsvOptions(prefix + "state.csv"),
        SEX: ['Man', 'Woman'],
        MARST: ['Married', 'Not married'],
        VETSTAT: ['Veteran', 'Not a veteran'],
        HISPAN: ['Hispanic', 'Not Hispanic'],
        CITIZEN: ['Citizen', 'Not citizen'],
        SPEAKENG: ['Speaks English', 'Does not speak English'],
        AGE: Array.from({ length: 48 }, (_, i) => (i + 18).toString())
      };
      options.EDUC = EDUC_ORDER;
      setFieldOptions(options);
    }
    loadAll();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fields.some(f => !formData[f])) {
      alert("Please fill out all fields before submitting.");
      return;
    }
    setLoading(true);
    try {
        console.log("Submitting prediction request...");
        console.log("Payload:", {
          mode: mode,
          inputs: formData
        });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, inputs: formData })
      });
      const data = await response.json();
      setPrediction(data.prediction);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }   
  };

  return (
    <div className="App">
      <h1>WageInsight: American's Salary Predictor</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          <strong>Select Mode:</strong>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="basic">Basic</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field} style={{ marginBottom: '0.75rem' }}>
            <label>
              {field}:&nbsp;
              {field === 'AGE' ? (
                <input
                  type="number"
                  name="AGE"
                  min="18"
                  max="65"
                  value={formData.AGE || ''}
                  onChange={handleChange}
                  required
                  placeholder="Enter your age"
                />
              ) : (
                <Autocomplete
                  options={fieldOptions[field] || []}
                  getOptionLabel={(option) => option}
                  value={formData[field] || ''}
                  onChange={(event, newValue) => {
                    setFormData({ ...formData, [field]: newValue || '' });
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label={prettyLabels[field] || field} required />
                  )}
                />
              )}
            </label>
          </div>
        ))}
        <button type="submit" disabled={loading}>
          {loading ? 'Predicting...' : 'Predict Salary'}
        </button>
      </form>

      {prediction && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Estimated Salary:</h2>
          <p><strong>${prediction.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></p>
        </div>
      )}
    </div>
  );
}

export default WageInsightForm;
