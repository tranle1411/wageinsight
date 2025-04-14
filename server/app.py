from flask import Flask, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import server.encoder as encoder
import sys
import os
from flask import jsonify

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app, origins=["https://tranle1411.github.io"])

@app.route('/predict_form', methods=['POST'])
def predict_form():
    data = request.get_json()
    mode = data.get('mode', 'advanced')  # either 'basic' or 'advanced'

    df = pd.DataFrame([data['inputs']])  # Wrap dict in list to create single-row DataFrame
    df = encoder.one_hot_encoder(df, mode=mode)
    df = encoder.target_encoder(df)

    if mode == 'advanced':
        model_path = os.path.join(os.path.dirname(__file__), "model", "advanced_xgb_model.pkl")
        features = ['SEX', 'AGE', 'MARST', 'VETSTAT', 'HISPAN',
                    'CITIZEN', 'SPEAKENG', 'OCC', 'IND', 'EDUC',
                    'DEGFIELD1', 'DEGFIELD2', 'RACE', 'WORKSTATE']
    else:
        model_path = os.path.join(os.path.dirname(__file__), "model", "basic_xgb_model.pkl")
        features = ['AGE', 'OCC', 'IND','DEGFIELD1' , 'EDUC', 'WORKSTATE']

    model = joblib.load(model_path)
    df = df[features]

    prediction_value = float(np.exp(model.predict(df)[0]))
    return jsonify({"prediction": prediction_value})


@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)