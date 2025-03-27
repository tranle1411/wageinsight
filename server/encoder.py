import pandas as pd
import numpy as np
import os

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
    
    # Map values to target encoded values stored in CSV files in folder .\database\encoded
    encoded_dir = './encoded_data'
    
    for col in df.select_dtypes(include=['object']).columns:
        encoded_file = os.path.join(encoded_dir, f'{col}_encoded.csv')
        if os.path.exists(encoded_file):
            encoded_df = pd.read_csv(encoded_file, header=0)
            encoding_map = encoded_df.set_index("Category")["Target Encode Value"].to_dict()
            df[col] = df[col].map(encoding_map)
    print(encoding_map)
    return df