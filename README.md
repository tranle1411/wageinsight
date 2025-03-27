This program uses big data from IPUMS USA (2013-2023) to predict American individual's salary.

Here are the steps to run this program on your device:
1. Create virtual enviroment.
2. Install Packages by running this line in terminal:
    pip install -r requirements.txt
3. Run this command in terminal: 
        cd client
        npm start
4. Keep that terminal running. Open a new terminal and run this command:
        cd server
        python app.py
5. Application is now run on your local device at this address: http://localhost:5000/predict

How to see analysis:
1. Create a database called CSC498.db. Import all csv files in 'Database' folder (not the 'test' folder)
2. Connect to the database using SQLite. Run all queries in DataCleaning.sql
3. Run analysis.ipynb to see analysis. Note that tuning model will take a very long time to run.