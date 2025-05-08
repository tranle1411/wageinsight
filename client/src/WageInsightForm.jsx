import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import './App.css';

// your existing imports
import { loadCsvOptions } from './utils/loadCsvOptions';
import { Autocomplete, TextField } from '@mui/material';

const API_URL = 'https://wageinsight.onrender.com/predict_form';

// … your basicFields, advancedFields, prettyLabels, etc

function WageInsightForm() {
  const [mode,    setMode]    = useState('basic');
  const [form,    setForm]    = useState({});
  const [curve,   setCurve]   = useState({ ages: [], salaries: [] });
  const [info,    setInfo]    = useState([]); // for the comparisons
  const [loading, setLoading] = useState(false);

  // … your loadCsvOptions into fieldOptions, handleChange, etc

  const handleSubmit = async e => {
    e.preventDefault();
    // validate…
    setLoading(true);

    // build an array of ages 25–64
    const ages = Array.from({ length: 40 }, (_, i) => i + 25);

    // for each age, call backend with that age + the other inputs
    const promises = ages.map(age =>
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          inputs: { ...form, AGE: age }
        })
      }).then(r => r.json())
        .then(j => j.prediction)
    );

    const salaries = await Promise.all(promises);

    // set up the line data
    setCurve({ ages, salaries });

    // compute the “median difference” info panel.
    // v simple: pick the mid‐age (e.g. 45) as representative:
    const midIdx = Math.floor(ages.length/2);
    const midAge = ages[midIdx];
    const midSalary = salaries[midIdx];

    // for each binary field, flip it to the other value,
    // re-predict at midAge, compute delta:
    const binaryFields = [
      { key:'SEX',       yes:'Man',              no:'Woman',              label:'Gender'          },
      { key:'MARST',     yes:'Married',          no:'Not married',        label:'Marital Status'  },
      { key:'VETSTAT',   yes:'Veteran',          no:'Not a veteran',      label:'Veteran Status'  },
      { key:'HISPAN',    yes:'Not Hispanic',     no:'Hispanic',           label:'Hispanic Origin' },
      { key:'CITIZEN',   yes:'Citizen',          no:'Not citizen',        label:'Citizenship'     },
      { key:'SPEAKENG',  yes:'Speaks English',   no:'Does not speak English', label:'English Fluency'}
    ];

    const infoPromises = binaryFields.map(async f => {
      const userVal = form[f.key];
      const flipped = (userVal === f.yes ? f.no : f.yes);

      // call backend once at midAge for flipped
      const resp = await fetch(API_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          mode,
          inputs: { ...form, AGE: midAge, [f.key]: flipped }
        })
      });
      const otherSal = (await resp.json()).prediction;

      const diff = midSalary - otherSal;      
      return {
        label:     f.label,
        youChose:  userVal,
        other:     flipped,
        delta:     Math.abs(diff),
        more:      diff > 0
      };
    });

    const infoArray = await Promise.all(infoPromises);
    setInfo(infoArray);

    setLoading(false);
  };

  return (
    <div className="dashboard">
      {/* LEFT: the line chart */}
      <div className="chart">
        <form onSubmit={handleSubmit}>
          {/* … your dropdowns/autocompletes */}
          <button type="submit" disabled={loading}>
            {loading ? 'Predicting…' : 'Predict Salary Curve'}
          </button>
        </form>

        {curve.ages.length > 0 &&
          <Plot
            data={[{
              x: curve.ages,
              y: curve.salaries,
              type: 'scatter',
              mode: 'lines+markers',
              hovertemplate:
                'Age: %{x}<br>' +
                'Salary: $%{y:,.0f}<extra></extra>',
              line: { color: '#007bff' }
            }]}
            layout={{
              title: 'Predicted Salary vs Age',
              xaxis: { title: 'Age' },
              yaxis: { title: 'Salary ($)' },
              margin: { t:40, l:60, r:20, b:40 },
              width: 600,
              height: 400
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        }
      </div>

      {/* RIGHT: the info panel */}
      <div className="infoPanel">
        {info.map((item, i) => (
          <p key={i}>
            On median, <strong>{item.youChose}</strong> {item.label} make{" "}
            <strong>
              ${item.delta.toLocaleString(undefined, { maximumFractionDigits:0 })}
            </strong>{" "}
            {item.more ? 'more' : 'less'} than{" "}
            <strong>{item.other}</strong>.
          </p>
        ))}
      </div>
    </div>
  );
}

export default WageInsightForm;
