import numpy as np
import pandas as pd
from ml.train import crossfit


def test_held_fold_labels_do_not_change_its_encoded_values():
    n = 180
    frame = pd.DataFrame(
        {
            "SAMPLE": [201801] * n,
            "SERIAL": np.arange(n),
            "AGE": [35] * n,
            "OCC": [10] * n,
            "_target": np.linspace(9, 12, n),
            "_w": [1.0] * n,
        }
    )
    folds = pd.util.hash_pandas_object(frame[["SAMPLE", "SERIAL"]], index=False).to_numpy() % 3
    original, _, _ = crossfit(frame, ["AGE", "OCC"])
    changed = frame.copy()
    changed.loc[folds == 0, "_target"] += 10
    encoded, _, _ = crossfit(changed, ["AGE", "OCC"])
    assert np.allclose(original[folds == 0], encoded[folds == 0])
