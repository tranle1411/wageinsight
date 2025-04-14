import React, { useState, useEffect } from 'react';
import './App.css';
import { loadCsvOptions } from './utils/loadCsvOptions';

const API_URL = "https://wageinsight.onrender.com/predict_form";

const basicFields = ['AGE', 'OCC', 'IND', 'EDUC', 'WORKSTATE'];
const advancedFields = [
  'SEX', 'AGE', 'MARST', 'VETSTAT', 'HISPAN', 'CITIZEN',
  'SPEAKENG', 'OCC', 'IND', 'EDUC', 'DEGFIELD1', 'DEGFIELD2', 'RACE', 'WORKSTATE'
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
      setFieldOptions(options);
    }
    loadAll();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      <h1>WageInsight Predictor</h1>

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
              <select name={field} onChange={handleChange} required>
                <option value="">-- select --</option>
                {(fieldOptions[field] || []).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
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
