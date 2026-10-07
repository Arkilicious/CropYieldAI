from pathlib import Path
import json
import numpy as np
import pandas as pd
from joblib import load
MODEL_FILE=Path(__file__).resolve().parent/'artifacts'/'crop_yield_model.joblib'
METRICS_FILE=Path(__file__).resolve().parent/'artifacts'/'metrics.json'

def model_ready(): return MODEL_FILE.exists()
def metrics(): return json.loads(METRICS_FILE.read_text()) if METRICS_FILE.exists() else {}
def predict(data):
    pipe=load(MODEL_FILE)
    X=pd.DataFrame([data])
    value=float(pipe.predict(X)[0])
    m=metrics(); mae=float(m.get('mae',0.4)); low=max(0,value-mae*1.7); high=value+mae*1.7
    rainfall=float(data['rainfall']); temp=float(data['temperature']); humidity=float(data['humidity'])
    risk=0
    if rainfall<500 or rainfall>1500: risk+=30
    if temp<20 or temp>35: risk+=30
    if humidity<40 or humidity>90: risk+=20
    risk=min(95,max(5,risk))
    risk_label='Low' if risk<35 else ('Moderate' if risk<65 else 'High')
    score=max(5,100-risk)
    recommendations=[]
    if rainfall<600: recommendations.append('Plan supplemental irrigation and monitor soil moisture.')
    elif rainfall>1400: recommendations.append('Improve drainage and monitor waterlogging risk.')
    else: recommendations.append('Rainfall profile is broadly suitable for the selected crop.')
    if temp>33: recommendations.append('Monitor heat stress and consider shading or adjusted planting timing.')
    if humidity>85: recommendations.append('Increase disease surveillance because sustained high humidity can raise disease pressure.')
    if data['soil_type']=='Sandy': recommendations.append('Consider organic matter improvement and moisture retention practices.')
    else: recommendations.append('Maintain soil fertility with soil-test-guided nutrient management.')
    return {'yield_tph':round(value,2),'range_low':round(low,2),'range_high':round(high,2),'risk_score':risk,'risk_label':risk_label,'condition_score':score,'recommendations':recommendations}
