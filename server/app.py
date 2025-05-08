from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import server.encoder as encoder
import os, sys

# make sure server.encoder is on PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
# allow GitHub Pages origin
CORS(app, resources={r"/*": {"origins": ["https://tranle1411.github.io"]}})

@app.route('/predict_form', methods=['POST'])
def predict_form():
    try:
        data = request.get_json()
        mode = data.get('mode', 'advanced')
        user_inputs = data['inputs']

        # build one row per age from 25-64
        ages = list(range(25, 65))
        batch = []
        for a in ages:
            row = user_inputs.copy()
            row['AGE'] = a
            batch.append(row)
        df = pd.DataFrame(batch)

        # encode
        df = encoder.one_hot_encoder(df, mode=mode)
        df = encoder.target_encoder(df)

        # pick model & features
        if mode == 'advanced':
            model_file = "advanced_xgb_model.pkl"
            features = [
                'SEX','AGE','MARST','VETSTAT','HISPAN',
                'CITIZEN','SPEAKENG','OCC','IND','EDUC',
                'DEGFIELD1','DEGFIELD2','RACE','WORKSTATE'
            ]
        else:
            model_file = "basic_xgb_model.pkl"
            features = ['AGE','OCC','IND','DEGFIELD1','EDUC','WORKSTATE']

        model_path = os.path.join(os.path.dirname(__file__), "model", model_file)
        model = joblib.load(model_path)

        # predict and exponentiate
        preds = model.predict(df[features])
        salaries = list(np.exp(preds))

        # empty for now—later populate with your delta‐information
        info = []

        # return JSON with exactly these keys
        resp = jsonify({
            "ages": ages,
            "salaries": salaries,
            "info": info
        })
        resp.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return resp

    except Exception as e:
        print("Error in /predict_form:", e)
        err = jsonify({"error": str(e)})
        err.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return err, 500

@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)
