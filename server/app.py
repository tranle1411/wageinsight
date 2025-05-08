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
CORS(app, resources={r"/*": {"origins": ["https://tranle1411.github.io"]}}, supports_credentials=True)

@app.route('/predict_form', methods=['POST'])
def predict_form():
    try:
        data = request.get_json()
        mode = data.get('mode', 'advanced')
        user_inputs = data['inputs'].copy()
        ages = list(range(25, 65))
        batch = []
        for a in ages:
            row = user_inputs.copy()
            row['AGE'] = a
            batch.append(row)
        df = pd.DataFrame(batch)
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

        preds = model.predict(df)
        salaries = np.exp(preds)
        series = [
            {"age": int(row["AGE"]), "salary": float(sal)}
            for row, sal in zip(df.to_dict(orient="records"), salaries)
        ]
        response = jsonify({"series": series})
        response.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return response

    except Exception as e:
        print("Error:", e)
        error_response = jsonify({"error": str(e)})
        error_response.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return error_response, 500

@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)