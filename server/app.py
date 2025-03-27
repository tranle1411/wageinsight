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

@app.route('/predict', methods=['GET', 'POST'])
def predict():
    print("Received prediction request")
    if request.method == 'GET':
        # Show an HTML form so the user can pick a file
        return '''
        <form action="/predict" method="post" enctype="multipart/form-data">
          <label>Select CSV file:</label>
          <input type="file" name="file" accept=".csv" />
          <button type="submit">Upload & Predict</button>
        </form>
        '''

    # If the request method is POST, process the uploaded file
    file = request.files['file']
    if not file:
        return "<h3>No file selected. Please go back and upload a CSV.</h3>"

    # 1. Read CSV into DataFrame
    df = pd.read_csv(file)
    
    # 2. Preprocess df and Load trained model
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "xgb_model.pkl")
    model = joblib.load(MODEL_PATH)
    df = encoder.one_hot_encoder(df)
    df = encoder.target_encoder(df)
    
    # Column order must match the order of columns used to train the model
    train_cols = [
    'SEX', 'AGE', 'MARST', 'VETSTAT', 'HISPAN',
    'CITIZEN', 'SPEAKENG', 'OCC', 'IND', 'EDUC',
    'DEGFIELD1', 'DEGFIELD2', 'RACE', 'WORKSTATE'
    ]
    df = df[train_cols]

    # 3. Predict
    prediction_array = model.predict(df)   # or your pipeline 

    # 4. Convert to string for display
    prediction_string = "<br>".join(f"${val:,.2f}" for val in np.exp(prediction_array))

    # 5. Return the results as HTML
    prediction_value = float(np.exp(prediction_array[0]))
    return jsonify({"prediction": prediction_value})

@app.route('/')
def home():
    return "<h1>Welcome to WageInsight</h1>"

if __name__ == '__main__':
    app.run(debug=True)