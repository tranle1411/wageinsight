import pandas as pd
import os
import joblib

def one_hot_encoder(df):
    sex_map = {'Man': 1, 'Woman': 0}
    marst_map = {'Married': 1, 'Not married': 0}
    vetstat_map = {'Veteran': 1, 'Not a veteran': 0}
    hispan_map = {'Hispanic': 1, 'Not Hispanic': 0}
    citizen_map = {'Citizen': 1, 'Not citizen': 0}
    speakeng_map = {'Speaks English': 1, 'Does not speak English': 0}
    
    # Map values to integers
    df['SEX'] = df['SEX'].map(sex_map)
    df['MARST'] = df['MARST'].map(marst_map)
    df['VETSTAT'] = df['VETSTAT'].map(vetstat_map)
    df['HISPAN'] = df['HISPAN'].map(hispan_map)
    df['CITIZEN'] = df['CITIZEN'].map(citizen_map)
    df['SPEAKENG'] = df['SPEAKENG'].map(speakeng_map)
    
    return df

def target_encoder(df):
        
    for col in df.select_dtypes(include=['object']).columns:
        ENCODED_DATA_PATH = os.path.join(os.path.dirname(__file__), "encoded_data", f"{col}_encoded.csv")
        encoded_data = joblib.load(ENCODED_DATA_PATH)
        encoded_df = pd.read_csv(encoded_data, header=0)
        encoding_map = encoded_df.set_index("Category")["Target Encode Value"].to_dict()
        df[col] = df[col].map(encoding_map)
    print(encoding_map)
    return df