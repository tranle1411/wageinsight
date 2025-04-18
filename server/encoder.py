import pandas as pd
import os

def one_hot_encoder(df, mode='advanced'):
    df['AGE'] = df['AGE'].astype(int)  # Age is always numeric

    if mode == 'basic':
        return df  # only AGE is numeric in basic mode

    # For advanced mode — apply one-hot/binary mapping
    sex_map = {'Man': 1, 'Woman': 0}
    marst_map = {'Married': 1, 'Not married': 0}
    vetstat_map = {'Veteran': 1, 'Not a veteran': 0}
    hispan_map = {'Hispanic': 1, 'Not Hispanic': 0}
    citizen_map = {'Citizen': 1, 'Not citizen': 0}
    speakeng_map = {'Speaks English': 1, 'Does not speak English': 0}

    df['SEX'] = df['SEX'].map(sex_map).fillna(-1)
    df['MARST'] = df['MARST'].map(marst_map).fillna(-1)
    df['VETSTAT'] = df['VETSTAT'].map(vetstat_map).fillna(-1)
    df['HISPAN'] = df['HISPAN'].map(hispan_map).fillna(-1)
    df['CITIZEN'] = df['CITIZEN'].map(citizen_map).fillna(-1)
    df['SPEAKENG'] = df['SPEAKENG'].map(speakeng_map).fillna(-1)

    return df

def target_encoder(df):
    # These are binary-coded by one_hot_encoder already
    one_hot_columns = ['SEX', 'MARST', 'VETSTAT', 'HISPAN', 'CITIZEN', 'SPEAKENG', 'AGE']

    for col in df.columns:
        if col in one_hot_columns:
            continue

        ENCODED_DATA_PATH = os.path.join(os.path.dirname(__file__), "encoded_data", f"{col}_encoded.csv")
        if os.path.exists(ENCODED_DATA_PATH):
            encoded_df = pd.read_csv(ENCODED_DATA_PATH)
            encoding_map = encoded_df.set_index("Category")["Target Encode Value"].to_dict()
            df[col] = df[col].map(encoding_map).fillna(0)
        else:
            print(f"[Warning] No encoding file found for column: {col}")

    return df
