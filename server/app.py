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
CORS(app, resources={r"/predict_form": {"origins": "https://tranle1411.github.io"}}, supports_credentials=True)

@app.route('/predict_form', methods=['OPTIONS'])
def options_predict_form():
    response = jsonify({'status': 'OK'})
    response.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
    return response


@app.route('/predict_form', methods=['POST'])
def predict_form():
    try:
        data = request.get_json()
        mode = data.get('mode', 'advanced')
        df = pd.DataFrame([data['inputs']])

        df = encoder.one_hot_encoder(df)
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
        df = df[features]  # <-- might crash if missing columns
        prediction_value = float(np.exp(model.predict(df)[0]))
        return jsonify({"prediction": prediction_value})
    
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)