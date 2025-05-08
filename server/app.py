from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import server.encoder as encoder
import sys, os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["https://tranle1411.github.io"]}}, supports_credentials=True)

@app.route('/predict_form', methods=['POST'])
def predict_form():
    try:
        data = request.get_json()
        mode = data.get('mode', 'advanced')
        user_inputs = data['inputs'].copy()

        # 1) build one DataFrame for ages 25–64
        ages = list(range(25, 65))
        batch = []
        for age in ages:
            row = user_inputs.copy()
            row['AGE'] = age
            batch.append(row)
        df = pd.DataFrame(batch)

        # 2) encode
        df = encoder.one_hot_encoder(df, mode=mode)
        df = encoder.target_encoder(df)

        # 3) select features + load model
        if mode == 'advanced':
            feats = ['SEX','AGE','MARST','VETSTAT','HISPAN','CITIZEN','SPEAKENG',
                     'OCC','IND','EDUC','DEGFIELD1','DEGFIELD2','RACE','WORKSTATE']
            model_file = "advanced_xgb_model.pkl"
        else:
            feats = ['AGE','OCC','IND','DEGFIELD1','EDUC','WORKSTATE']
            model_file = "basic_xgb_model.pkl"
        model_path = os.path.join(os.path.dirname(__file__), "model", model_file)
        model = joblib.load(model_path)
        df_feats = df[feats]

        # 4) baseline predictions
        preds = model.predict(df_feats)
        salaries = np.exp(preds)

        # prepare series to send back
        series = [
            {"age": int(r["AGE"]), "salary": float(sal)}
            for r, sal in zip(df.to_dict(orient="records"), salaries)
        ]

        # 5) now compute the “info” panel: for each binary field,
        #    compare median(base) vs median(“other”)
        info = []
        # map of flip‐fields → (yourValue, otherValue, prettyLabel)
        flips = {
            'SEX':      ('Man','Woman', 'gender'),
            'MARST':    ('Married','Not married', 'marital status'),
            'VETSTAT':  ('Veteran','Not a veteran', 'veteran status'),
            'HISPAN':   ('Hispanic','Not Hispanic', 'Hispanic origin'),
            'CITIZEN':  ('Citizen','Not citizen', 'citizenship'),
            'SPEAKENG': ('Speaks English','Does not speak English', 'English fluency')
        }
        base_median = float(np.median(salaries))
        for field,(val,other_val,label) in flips.items():
            # only if in this mode and user actually selected that field
            if mode=='advanced' and user_inputs.get(field)==val:
                # build a batch for the “other” category
                batch2 = []
                for age in ages:
                    r = user_inputs.copy()
                    r['AGE'] = age
                    r[field] = other_val
                    batch2.append(r)
                df2 = pd.DataFrame(batch2)
                df2 = encoder.one_hot_encoder(df2, mode=mode)
                df2 = encoder.target_encoder(df2)
                df2 = df2[feats]
                preds2 = model.predict(df2)
                sal2 = np.exp(preds2)
                other_median = float(np.median(sal2))
                diff = base_median - other_median
                info.append({
                    "you": val,
                    "other": other_val,
                    "label": label,
                    "delta": abs(diff),
                    "more": diff > 0
                })

        resp = jsonify({"series": series, "info": info})
        resp.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return resp

    except Exception as e:
        print("❌ /predict_form failed", e)
        err = jsonify({"error": str(e)})
        err.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return err, 500

@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)
