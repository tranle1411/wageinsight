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
        data = request.get_json(force=True)
        mode = data.get('mode', 'advanced')
        user_inputs = data['inputs'].copy()

        # build batch of ages 25–64
        ages_list = list(range(25, 65))
        batch = []
        for a in ages_list:
            row = user_inputs.copy()
            row['AGE'] = a
            batch.append(row)
        df = pd.DataFrame(batch)

        # encode & load model
        df = encoder.one_hot_encoder(df, mode=mode)
        df = encoder.target_encoder(df)
        if mode == 'advanced':
            model_file = "advanced_xgb_model.pkl"
            features = [...]
        else:
            model_file = "basic_xgb_model.pkl"
            features = [...]
        model = joblib.load(os.path.join(os.path.dirname(__file__), "model", model_file))
        df = df[features]

        # predict and exponentiate
        raw_preds = model.predict(df)            # numpy.ndarray of float32
        salaries_list = [float(np.exp(p)) for p in raw_preds]  # Python floats

        # return JSON
        resp = jsonify({
            "ages": ages_list,
            "salaries": salaries_list,
            "info": []
        })
        resp.headers.add("Access-Control-Allow-Origin", "https://tranle1411.github.io")
        return resp

    except Exception as e:
        app.logger.exception("❌ /predict_form failed")
        # even on error, return JSON with the right shape
        return jsonify({
            "ages": [],
            "salaries": [],
            "info": [],
            "error": str(e)
        }), 500


@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)
