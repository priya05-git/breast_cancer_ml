import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import roc_curve, roc_auc_score, confusion_matrix, precision_score, recall_score, f1_score, accuracy_score

SEED = 42

class ModelService:
    def __init__(self):
        self._load_data_and_train()
        self._load_results_json()

    def _load_data_and_train(self):
        cancer = load_breast_cancer(as_frame=True)
        self.raw_data = cancer
        self.feature_names = list(cancer.feature_names)
        self.X = cancer.data.copy()
        # Flip target so Malignant = 1, Benign = 0
        self.y = (cancer.target == 0).astype(int)
        
        # Stratified 80/20 split consistent with notebook
        self.Xtr, self.Xte, self.ytr, self.yte = train_test_split(
            self.X, self.y, test_size=0.2, stratify=self.y, random_state=SEED
        )
        
        # Pipeline: StandardScaler + SVC tuned params
        self.pipeline = Pipeline([
            ("scaler", StandardScaler()),
            ("svm", SVC(C=10.0, gamma=0.01, class_weight="balanced", probability=True, random_state=SEED))
        ])
        self.pipeline.fit(self.Xtr, self.ytr)
        
        # Test evaluation predictions & probabilities
        self.test_probs = self.pipeline.predict_proba(self.Xte)[:, 1]
        self.test_preds = (self.test_probs >= 0.5).astype(int)
        
        # ROC Curve points
        fpr, tpr, roc_thresh = roc_curve(self.yte, self.test_probs)
        self.roc_points = [
            {"fpr": round(float(f), 4), "tpr": round(float(t), 4), "threshold": round(float(th), 4)}
            for f, t, th in zip(fpr, tpr, roc_thresh)
        ]
        self.auc_score = round(float(roc_auc_score(self.yte, self.test_probs)), 4)
        
        # Feature distributions (means & std for benign vs malignant)
        benign_mask = (self.y == 0)
        mal_mask = (self.y == 1)
        self.stats = {}
        for col in self.feature_names:
            b_vals = self.X.loc[benign_mask, col]
            m_vals = self.X.loc[mal_mask, col]
            all_vals = self.X[col]
            self.stats[col] = {
                "min": round(float(all_vals.min()), 4),
                "max": round(float(all_vals.max()), 4),
                "overall_mean": round(float(all_vals.mean()), 4),
                "benign_mean": round(float(b_vals.mean()), 4),
                "benign_std": round(float(b_vals.std()) if b_vals.std() > 1e-6 else 1.0, 4),
                "malignant_mean": round(float(m_vals.mean()), 4),
                "malignant_std": round(float(m_vals.std()) if m_vals.std() > 1e-6 else 1.0, 4)
            }
            
        # Group features into 3 logical categories
        self.grouped_features = {
            "Mean Nucleus Measurements": [f for f in self.feature_names if f.startswith("mean ")],
            "Standard Error (Variation)": [f for f in self.feature_names if " error" in f],
            "Worst / Extreme Values": [f for f in self.feature_names if f.startswith("worst ")]
        }
        
        # Prepare rich clinical presets from actual held-out test data
        mal_idx = self.yte[self.yte == 1].index
        ben_idx = self.yte[self.yte == 0].index
        
        self.presets = [
            {
                "id": "high_malignant",
                "label": "High-Grade Malignant Biopsy",
                "tag": "High Risk",
                "description": "Marked nuclear atypia, enlarged perimeter and high concavity measurements.",
                "data": {col: round(float(self.Xte.loc[mal_idx[0], col]), 4) for col in self.feature_names}
            },
            {
                "id": "clear_benign",
                "label": "Confirmed Benign Sample",
                "tag": "Low Risk",
                "description": "Smooth, uniform nuclear borders consistent with typical fibroadenoma or benign cysts.",
                "data": {col: round(float(self.Xte.loc[ben_idx[0], col]), 4) for col in self.feature_names}
            },
            {
                "id": "moderate_malignant",
                "label": "Moderate Malignant Tumor",
                "tag": "Elevated Risk",
                "description": "Invasive carcinoma presentation with moderate texture variance.",
                "data": {col: round(float(self.Xte.loc[mal_idx[2], col]), 4) for col in self.feature_names}
            },
            {
                "id": "borderline_edge_case",
                "label": "Challenging Borderline Case",
                "tag": "Borderline / Ambiguous",
                "description": "Subtle cell anomalies on the margin of standard decision boundaries.",
                "data": {col: round(float(self.Xte.loc[mal_idx[1], col]), 4) for col in self.feature_names}
            }
        ]

    def _load_results_json(self):
        results_path = Path(__file__).resolve().parent.parent / "outputs" / "results.json"
        if results_path.exists():
            with open(results_path, "r") as f:
                self.results_json = json.load(f)
        else:
            self.results_json = {}

    def predict(self, feature_dict: dict, threshold: float = 0.5):
        # Build 1-row DataFrame ensuring all 30 features are present
        row = []
        for name in self.feature_names:
            val = feature_dict.get(name)
            if val is None or val == "":
                val = self.stats[name]["overall_mean"]
            row.append(float(val))
        
        df = pd.DataFrame([row], columns=self.feature_names)
        prob_mal = float(self.pipeline.predict_proba(df)[0, 1])
        prob_ben = float(1.0 - prob_mal)
        is_malignant = bool(prob_mal >= threshold)
        
        # Risk classification tiers
        if prob_mal >= 0.85:
            risk_tier = "Critical Risk (Strongly Malignant)"
            risk_color = "#ef4444"
        elif prob_mal >= 0.50:
            risk_tier = "High Suspicion (Malignant Profile)"
            risk_color = "#f97316"
        elif prob_mal >= 0.20:
            risk_tier = "Moderate / Intermediate Watch"
            risk_color = "#eab308"
        else:
            risk_tier = "Low Risk (Benign Characteristics)"
            risk_color = "#10b981"
            
        # Feature impact analysis: compute Z-scores relative to benign baseline
        impacts = []
        for name in self.feature_names:
            val = float(df[name].iloc[0])
            b_mean = self.stats[name]["benign_mean"]
            b_std = self.stats[name]["benign_std"]
            z_score = (val - b_mean) / b_std
            impacts.append({
                "feature": name,
                "value": round(val, 4),
                "benign_mean": b_mean,
                "malignant_mean": self.stats[name]["malignant_mean"],
                "z_score_vs_benign": round(z_score, 2),
                "is_elevated": z_score > 1.5
            })
            
        # Top 6 features deviating most positively (towards malignant)
        impacts.sort(key=lambda x: x["z_score_vs_benign"], reverse=True)
        top_deviations = impacts[:6]
        
        # Hallmarks for radar / polygon visualization
        key_hallmarks = [
            ("worst perimeter", 188.0),
            ("worst concave points", 0.29),
            ("mean concave points", 0.20),
            ("worst radius", 36.0),
            ("mean perimeter", 188.0),
            ("worst texture", 49.0)
        ]
        radar_metrics = []
        for feat, max_ref in key_hallmarks:
            val = float(df[feat].iloc[0]) if feat in df else self.stats[feat]["overall_mean"]
            norm_val = min(1.0, max(0.0, val / max_ref))
            radar_metrics.append({
                "name": feat.replace("worst ", "W-").replace("mean ", "M-"),
                "value": round(norm_val * 100, 1),
                "raw": round(val, 3)
            })

        return {
            "prediction": "Malignant" if is_malignant else "Benign",
            "is_malignant": is_malignant,
            "probability_malignant": round(prob_mal, 4),
            "probability_benign": round(prob_ben, 4),
            "threshold_used": round(threshold, 2),
            "risk_tier": risk_tier,
            "risk_color": risk_color,
            "top_deviations": top_deviations,
            "radar_metrics": radar_metrics
        }

    def batch_predict(self, records: list, threshold: float = 0.5):
        results = []
        n_mal = 0
        n_ben = 0
        for i, rec in enumerate(records):
            pred_res = self.predict(rec, threshold=threshold)
            if pred_res["is_malignant"]:
                n_mal += 1
            else:
                n_ben += 1
            results.append({
                "row_index": i + 1,
                "id": rec.get("id", f"Patient-{i+1:03d}"),
                "prediction": pred_res["prediction"],
                "probability_malignant": pred_res["probability_malignant"],
                "risk_tier": pred_res["risk_tier"]
            })
            
        return {
            "total_cases": len(records),
            "malignant_count": n_mal,
            "benign_count": n_ben,
            "malignant_percentage": round((n_mal / len(records) * 100) if records else 0, 1),
            "threshold_used": threshold,
            "predictions": results
        }

    def get_sample_csv_text(self):
        # 10 test samples formatted as CSV text
        subset = self.Xte.iloc[:10].copy()
        subset.insert(0, "Patient_ID", [f"P_{100+i}" for i in range(len(subset))])
        return subset.to_csv(index=False)

    def calculate_custom_threshold_metrics(self, threshold: float):
        preds = (self.test_probs >= threshold).astype(int)
        cm = confusion_matrix(self.yte, preds)
        # [[TN, FP], [FN, TP]]
        tn, fp, fn, tp = cm.ravel()
        rec = float(recall_score(self.yte, preds, zero_division=0))
        prec = float(precision_score(self.yte, preds, zero_division=0))
        f1 = float(f1_score(self.yte, preds, zero_division=0))
        acc = float(accuracy_score(self.yte, preds))
        
        return {
            "threshold": threshold,
            "accuracy": round(acc, 4),
            "recall": round(rec, 4),
            "precision": round(prec, 4),
            "f1": round(f1, 4),
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp)
            },
            "missed_cancers_fn": int(fn),
            "false_alarms_fp": int(fp)
        }

# Global instance
service = ModelService()
