# WageInsight: An American Salary Predictor

## Introduction  
WageInsight is a full-stack web application that leverages U.S. Census microdata to predict and visualize how demographic and occupational factors influence individual salaries. Built with a React/Material-UI front end and a Flask/XGBoost back end, it turns a user’s profile into a dynamic salary-vs-age curve and a written summary of key disparities.

---

## Purpose  
- **Data-Driven Transparency**: Expose how features like gender, marital status, veteran status, language ability, and ethnicity relate to wage gaps.  
- **Interactive Exploration**: Let users try both a “Basic” model (age + a handful of categorical fields) and an “Advanced” model (full feature set) and see predictions across ages 25–64.  
- **Educational Tool**: Surface median-salary differentials (e.g. “Non-Hispanics make \$X more than Hispanics”) to spark conversations about equity and policy.

---

## Data Pipeline & Modeling  

1. **Data Source**  
   - IPUMS USA extracts (2013–2023)  
   - ~1.5 million working-age respondents (18–65)  
   - Features: `AGE`, `SEX`, `MARST`, `VETSTAT`, `HISPAN`, `CITIZEN`, `SPEAKENG`, `OCC`, `IND`, `EDUC`, `DEGFIELD1`, `DEGFIELD2`, `RACE`, `WORKSTATE`, target `INCWAGE`  

2. **Preprocessing**  
   - **One-Hot/Binary Encoding** for booleans & small categoricals (gender, marital status, veteran, etc.)  
   - **Target Encoding** for high-cardinality fields (industry, occupation, degree fields, state, race) by mapping each category to the average log-wage in the training set  
   - **Log-Transform** of `INCWAGE` stabilizes skew  

3. **Modeling**  
   - **Baseline**: Ordinary Least Squares (OLS) & Lasso regressions for interpretability  
   - **Production**: XGBoost regressors  
     - **Basic Model** uses only age + 5 categorical features  
     - **Advanced Model** uses full 14-feature set  
   - **Evaluation**:  
     - XGBoost achieves RMSE ≈ \$54 k, R² ≈ 0.50 on held-out data  
     - Cross-validation to guard against overfitting  

---

## Application Features  

- **Mode Selector**: Choose Basic vs. Advanced model  
- **Interactive Inputs**:  
  - **Age curve** generated automatically over ages 25–64  
  - **Autocomplete dropdowns** for high-cardinality fields  
- **Salary-Age Curve**: Plotly line chart with hover tooltips  
- **Equity Summaries**: “On median, \*\*Group A\*\* make \$X more/less than \*\*Group B\*\*” for each boolean feature  
- **Responsive UI**: Centered form; side-by-side chart & textual panel  

---

## Weaknesses  

- **Data Limitations**:  
  - IPUMS data doesn’t capture fringe benefits, hours worked, regional cost-of-living differences.  
  - Self-reported wages may contain reporting bias.  
- **Model Limitations**:  
  - Log-wage target ignores zero/informal earnings.  
  - XGBoost can’t easily surface causal relationships—only correlations.  
- **Equity Summaries** assume everyone else holds constant which may oversimplify intersectional effects.  

---

## Future Enhancements  

- **Additional Features**: Incorporate hours worked, industry growth trends, metropolitan vs. rural splits.  
- **Causal Analysis**: Use propensity-score matching or experimental methods to better isolate effect sizes.  
- **User Profiles & Persistence**: Allow users to save scenarios, compare multiple profiles side-by-side.  
- **Multi-Language Support**: Reach non-English speakers with localized UI & data descriptions.  
- **Deeper Visualizations**: Add interactive heatmaps, geographic choropleths for state-level wage maps.  