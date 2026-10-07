from pathlib import Path
import numpy as np
import pandas as pd
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ARTIFACT = Path(__file__).resolve().parent / 'artifacts'
ARTIFACT.mkdir(exist_ok=True)
MODEL_FILE = ARTIFACT / 'crop_yield_model.joblib'
METRICS_FILE = ARTIFACT / 'metrics.json'
DATA_FILE = Path(__file__).resolve().parent.parent / 'data' / 'training_data.csv'

CROPS = ['Maize','Rice','Cassava','Yam','Beans','Groundnut','Tomato']
SOILS = ['Loamy','Clay','Sandy','Silty','Peaty']

def make_dataset(n=1800, seed=42):
    rng = np.random.default_rng(seed)
    crop_base = {'Maize':3.8,'Rice':4.5,'Cassava':12.0,'Yam':10.0,'Beans':1.9,'Groundnut':2.1,'Tomato':18.0}
    rows=[]
    for _ in range(n):
        crop=rng.choice(CROPS); soil=rng.choice(SOILS)
        rainfall=float(np.clip(rng.normal(900,260),300,1800))
        temp=float(np.clip(rng.normal(27,3.5),18,38))
        humidity=float(np.clip(rng.normal(65,12),30,95))
        soil_bonus={'Loamy':1.0,'Silty':.7,'Peaty':.55,'Clay':.35,'Sandy':-.25}[soil]
        water=np.exp(-((rainfall-950)/600)**2)
        heat=np.exp(-((temp-27)/8)**2)
        y=crop_base[crop]*(0.45+0.55*water)*(0.55+0.45*heat)*(0.85+humidity/220)+soil_bonus
        y += rng.normal(0, crop_base[crop]*.08)
        rows.append([crop,soil,rainfall,temp,humidity,max(.1,y)])
    df=pd.DataFrame(rows,columns=['crop_type','soil_type','rainfall','temperature','humidity','yield_tph'])
    DATA_FILE.parent.mkdir(exist_ok=True)
    df.to_csv(DATA_FILE,index=False)
    return df

def train_and_save():
    df=make_dataset()
    X=df[['crop_type','soil_type','rainfall','temperature','humidity']]
    y=df['yield_tph']
    cat=['crop_type','soil_type']; num=['rainfall','temperature','humidity']
    prep=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat)],remainder='passthrough')
    model=RandomForestRegressor(n_estimators=260,max_depth=16,min_samples_leaf=2,random_state=42,n_jobs=-1)
    pipe=Pipeline([('preprocessor',prep),('model',model)])
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,random_state=42)
    pipe.fit(Xtr,ytr); pred=pipe.predict(Xte)
    metrics={'r2':round(float(r2_score(yte,pred)),4),'mae':round(float(mean_absolute_error(yte,pred)),4),'rmse':round(float(np.sqrt(mean_squared_error(yte,pred))),4),'samples':len(df),'algorithm':'Random Forest Regressor','features':list(X.columns)}
    dump(pipe,MODEL_FILE)
    METRICS_FILE.write_text(__import__('json').dumps(metrics,indent=2))
    return metrics
