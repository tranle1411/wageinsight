import React, { useState } from 'react';
import './App.css';

const API_URL = "https://wageinsight.onrender.com/predict";

function App() {
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPrediction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setPrediction(result.prediction);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>WageInsight Predictor</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Upload & Predict"}
        </button>
      </form>

      {prediction && (
        <div style={{ marginTop: '20px' }}>
          <h2>Estimated Wage:</h2>
          <p>${Number(prediction).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

export default App;
