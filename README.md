# *OncoVision AI — Breast Cancer Diagnosis Classification & Clinical Decision Intelligence*

Predict whether a breast tumour is **malignant** or **benign** from 30 fine-needle aspirate (FNA) cell-nucleus measurements (Breast Cancer Wisconsin Diagnostic dataset, 569 samples, built into scikit-learn).

---

## 🌟 Full-Stack Architecture

This repository contains both the rigorous ML experimentation pipeline and a modern, full-stack clinical diagnostic web application:

- **Backend:** **FastAPI** (`backend/app.py` & `backend/model_service.py`)
  - Exposes REST endpoints for real-time inference, batch CSV ingestion, model metadata, and cost-sensitive threshold metrics.
  - Serves the tuned `StandardScaler + SVC (RBF kernel)` calibrated pipeline.
- **Frontend:** **React + Vite** (`frontend/`)
  - Modern dark-mode glassmorphic interface with `Outfit` & `Plus Jakarta Sans` typography.
  - Interactive Cytology Predictor with preloaded biopsy presets (High-Grade Malignant, Confirmed Benign, Borderline Case).
  - Cost-Sensitive Decision Threshold Explorer with a live-updating $2 \times 2$ Confusion Matrix.
  - Model Validation & Biomarker Significance Dashboard (ROC curve, Permutation Importance, Bootstrap 95% CIs).
  - Batch Population Screening tool with CSV upload and sample download.

---

## 🚀 Quick Start (Running Full Stack)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
pip install fastapi uvicorn
cd frontend && npm install && cd ..
```

### 2. Start the FastAPI Backend (Port 8000)
```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: `http://127.0.0.1:8000/docs`

### 3. Start the React Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔬 ML Methodology & Experimental Pipeline

| Stage | Content |
|---|---|
| **Planning** | Binary classification; primary metrics F1 and malignant recall (a missed cancer is costlier than a false alarm) |
| **Data exploration** | Class balance (212 Malignant vs 357 Benign), missing values (0), outliers (IQR), skew, collinearity (21 pairs > 0.9) |
| **Models** | Dummy baseline, Logistic Regression, KNN, SVM (RBF), Random Forest, Gradient Boosting |
| **Optimisation** | GridSearchCV, scaling ablation, feature selection, repeated CV, cost-sensitive decision-threshold analysis |
| **Evaluation** | Held-out test evaluation (N=114), confusion matrix, ROC curve, bootstrap 95% CIs, error analysis, permutation importance |

### Run Pure ML Script / Regenerate Notebook
```bash
python breast_cancer_classification.py
python -m nbconvert --execute --inplace breast_cancer_classification.ipynb
```

---

## 🏆 Final Model Evaluation (Held-Out Test Set)

Selected Model: **Tuned SVM (RBF kernel, $C=10$, $\gamma=0.01$, balanced)**

| Metric | Score | Bootstrap 95% CI |
|---|---|---|
| **Accuracy** | **99.12%** | [97.4%, 100.0%] |
| **Precision** | **100.0%** | [100.0%, 100.0%] |
| **Malignant Recall** | **97.62%** | [92.9%, 100.0%] |
| **F1-Score** | **0.9880** | [96.3%, 100.0%] |
| **ROC AUC** | **0.9970** | — |

- **Confusion Matrix at 0.50 Threshold:**
  - True Negatives (TN): **72**
  - False Positives (FP): **0**
  - False Negatives (FN): **1**
  - True Positives (TP): **41**
- **Clinical Safety Note:** Lowering the operating cut-off to **$0.30$** on the Threshold Explorer tab achieves **100% Malignant Recall (0 missed cancers)** with only 1 false alarm.

---

> *Notice: Intended for research and educational demonstrations.*
