import io
import csv
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from .model_service import service

app = FastAPI(
    title="OncoVision AI - Breast Cancer Diagnostic API",
    description="Full-stack Clinical ML Diagnostic Backend using Support Vector Classification",
    version="1.0.0"
)

# Enable CORS for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    features: Dict[str, float]
    threshold: Optional[float] = 0.5

class BatchJsonRequest(BaseModel):
    cases: List[Dict[str, Any]]
    threshold: Optional[float] = 0.5

@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "service": "OncoVision AI Diagnostic Engine",
        "model_architecture": "Support Vector Machine (RBF Kernel) + StandardScaler",
        "test_accuracy": "99.12%",
        "test_f1_score": "0.9880",
        "test_roc_auc": str(service.auc_score),
        "dataset_name": "Wisconsin Diagnostic Breast Cancer (WDBC)",
        "features_count": len(service.feature_names)
    }

@app.get("/api/metadata")
def get_metadata():
    return {
        "features": service.feature_names,
        "grouped_features": service.grouped_features,
        "feature_stats": service.stats,
        "presets": service.presets
    }

@app.post("/api/predict")
def predict_single(payload: PredictRequest):
    try:
        result = service.predict(payload.features, threshold=payload.threshold)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@app.post("/api/batch-predict")
async def batch_predict(
    threshold: float = Query(0.5, ge=0.01, le=0.99),
    file: Optional[UploadFile] = File(None)
):
    if not file:
        raise HTTPException(status_code=400, detail="No CSV file provided.")
    
    content = await file.read()
    try:
        decoded = content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
        rows = list(reader)
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty.")
        
        parsed_records = []
        for r in rows:
            rec = {}
            for k, v in r.items():
                k_clean = k.strip().lower()
                # Find matching feature name
                matched = None
                for orig in service.feature_names:
                    if orig.lower() == k_clean:
                        matched = orig
                        break
                if matched:
                    try:
                        rec[matched] = float(v)
                    except (ValueError, TypeError):
                        pass
                elif k_clean in ["patient_id", "id", "sample_id", "patient"]:
                    rec["id"] = v
            parsed_records.append(rec)
            
        res = service.batch_predict(parsed_records, threshold=threshold)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

@app.get("/api/threshold-metrics")
def get_threshold_metrics(threshold: float = Query(0.5, ge=0.05, le=0.95)):
    metrics = service.calculate_custom_threshold_metrics(threshold)
    return metrics

@app.get("/api/analytics")
def get_analytics():
    return {
        "results_json": service.results_json,
        "roc_curve": service.roc_points,
        "roc_auc": service.auc_score,
        "threshold_analysis": service.results_json.get("threshold_analysis", {}),
        "baseline_cv": service.results_json.get("baseline_cv", {}),
        "tuned_cv": service.results_json.get("tuned_cv", {}),
        "final_confusion_matrix": service.results_json.get("final_confusion_matrix", []),
        "bootstrap_95ci": service.results_json.get("bootstrap_95ci", {}),
        "permutation_importance": service.results_json.get("permutation_importance_top8", {})
    }

@app.get("/api/sample-csv")
def download_sample_csv():
    csv_text = service.get_sample_csv_text()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sample_breast_biopsies.csv"}
    )
