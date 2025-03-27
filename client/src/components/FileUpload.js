import React, { useState } from 'react';
import { Button, Typography } from '@mui/material';
import axios from 'axios';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [predictions, setPredictions] = useState([]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('http://localhost:5000/predict', formData);
    setPredictions(res.data.predictions);
  };

  return (
    <div>
      <Typography variant="h5">Upload CSV File</Typography>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <Button onClick={handleUpload} variant="contained" sx={{ mt: 2 }}>Submit</Button>
      {predictions.length > 0 && (
        <div>
          <Typography variant="h6">Predicted Wages:</Typography>
          <ul>
            {predictions.map((val, idx) => <li key={idx}>${val}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
