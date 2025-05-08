from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import server.encoder as encoder
import os, sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)

# Allow your GitHub Pages origin to hit any endpoint
CORS(app, resources={r"/*": {"origins": "https://tranle1411.github.io"}}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    # Just to be 100% sure, echo back CORS headers on every response
    response.headers["Access-Control-Allow-Origin"] = "https://tranle1411.github.io"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

@app.route('/predict_form', methods=['POST', 'OPTIONS'])
def predict_form():
    if request.method == 'OPTIONS':
        # flask-cors will already add the headers for you, so just return
        return '', 204

    try:
        data = request.get_json()
        mode = data.get('mode', 'advanced')
        user_inputs = data['inputs']

        # build one row per age
        ages = list(range(25, 65))
        batch = []
        for age in ages:
            row = user_inputs.copy()
            row['AGE'] = age
            batch.append(row)
        df = pd.DataFrame(batch)

        # encode
        df = encoder.one_hot_encoder(df, mode=mode)
        df = encoder.target_encoder(df)

        # choose features + model
        if mode == 'advanced':
            feats = ['SEX','AGE','MARST','VETSTAT','HISPAN','CITIZEN','SPEAKENG',
                     'OCC','IND','EDUC','DEGFIELD1','DEGFIELD2','RACE','WORKSTATE']
            model_file = "advanced_xgb_model.pkl"
        else:
            feats = ['AGE','OCC','IND','DEGFIELD1','EDUC','WORKSTATE']
            model_file = "basic_xgb_model.pkl"
        model_path = os.path.join(os.path.dirname(__file__), "model", model_file)
        model = joblib.load(model_path)

        # predict
        preds = model.predict(df[feats])
        salaries = np.exp(preds)

        # series for the curve
        series = [
            {"age": int(r["AGE"]), "salary": float(sal)}
            for r, sal in zip(df.to_dict(orient="records"), salaries)
        ]

        # info panel
        flips = {
            'SEX':      ('Man','Woman', 'gender'),
            'MARST':    ('Married','Not married', 'marital status'),
            'VETSTAT':  ('Veteran','Not a veteran', 'veteran status'),
            'HISPAN':   ('Hispanic','Not Hispanic', 'Hispanic origin'),
            'CITIZEN':  ('Citizen','Not citizen', 'citizenship'),
            'SPEAKENG': ('Speaks English','Does not speak English', 'English fluency')
        }
        base_med = float(np.median(salaries))
        info = []
        for field,(val,other,label) in flips.items():
            if mode=='advanced' and user_inputs.get(field)==val:
                # batch for "other" group
                batch2 = []
                for age in ages:
                    r2 = user_inputs.copy()
                    r2['AGE'] = age
                    r2[field] = other
                    batch2.append(r2)
                df2 = pd.DataFrame(batch2)
                df2 = encoder.one_hot_encoder(df2, mode=mode)
                df2 = encoder.target_encoder(df2)
                sal2 = np.exp(model.predict(df2[feats]))
                other_med = float(np.median(sal2))
                diff = base_med - other_med
                info.append({
                    "you": val,
                    "other": other,
                    "label": label,
                    "delta": abs(diff),
                    "more": diff > 0
                })

        resp = jsonify({"series": series, "info": info})
        return resp

    except Exception as e:
        print("❌ /predict_form failed:", e)
        return jsonify({"error": str(e)}), 500

@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)
