# %% [markdown]
# # Breast Cancer Diagnosis Classification
# **Junior Machine Learning Analyst Internship: end-to-end project**
#
# Goal: predict whether a breast tumour is **malignant** (positive class) or **benign**
# from 30 cell-nucleus measurements (Breast Cancer Wisconsin Diagnostic dataset).
#
# Workflow: 1) Setup, 2) Data exploration, 3) Baseline models, 4) Optimisation,
# 5) Final evaluation, 6) Save results.
#
# Design rules: stratified split, scaling inside Pipelines (no leakage),
# model selection by cross-validation only, test set used once at the end.

# %% Setup
import json, time, warnings
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                      # remove this line to show plots interactively
import matplotlib.pyplot as plt

from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import (train_test_split, StratifiedKFold, RepeatedStratifiedKFold,
                                     cross_validate, cross_val_predict, GridSearchCV)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.dummy import DummyClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.inspection import permutation_importance
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, confusion_matrix, roc_curve)

warnings.filterwarnings("ignore")
SEED = 42
OUT = Path("outputs"); FIG = OUT / "figures"
FIG.mkdir(parents=True, exist_ok=True)
NAVY, GREY = "#1F3A5F", "#9AA5B1"
plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
R = {}                                      # every result is stored here -> results.json

# %% [markdown]
# ## 1. Load data
# scikit-learn encodes malignant = 0, benign = 1. We flip it so **malignant = 1** (positive class),
# which makes precision/recall describe how well cancers are detected.

# %% Load data
data = load_breast_cancer(as_frame=True)
X = data.data.copy()
y = (data.target == 0).astype(int)
print("Shape:", X.shape, "| malignant:", int(y.sum()), "| benign:", int((1 - y).sum()))

# %% [markdown]
# ## 2. Data exploration

# %% EDA
R["shape"] = list(X.shape)
R["n_malignant"], R["n_benign"] = int(y.sum()), int((1 - y).sum())
R["missing_values"] = int(X.isna().sum().sum())
R["duplicate_rows"] = int(X.duplicated().sum())

corr = X.corr().abs()
upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
R["n_feature_pairs_corr_gt_0.9"] = int((upper > 0.9).sum().sum())

q1, q3 = X.quantile(.25), X.quantile(.75); iqr = q3 - q1
is_out = (X < q1 - 1.5 * iqr) | (X > q3 + 1.5 * iqr)
R["rows_with_any_outlier"] = int(is_out.any(axis=1).sum())
R["n_features_skew_gt_1"] = int((X.skew() > 1).sum())
R["top_target_correlations"] = X.corrwith(y).abs().sort_values(ascending=False).head(5).to_dict()
print(json.dumps({k: R[k] for k in ["missing_values", "duplicate_rows", "n_feature_pairs_corr_gt_0.9",
                                    "rows_with_any_outlier", "n_features_skew_gt_1"]}, indent=1))

fig, ax = plt.subplots(1, 2, figsize=(9, 3.4))
ax[0].bar(["Benign", "Malignant"], [R["n_benign"], R["n_malignant"]], color=[GREY, NAVY])
ax[0].set_title("Class distribution"); ax[0].set_ylabel("Samples")
ax[1].hist(X.loc[y == 0, "worst perimeter"], bins=25, alpha=.8, color=GREY, label="Benign")
ax[1].hist(X.loc[y == 1, "worst perimeter"], bins=25, alpha=.8, color=NAVY, label="Malignant")
ax[1].set_title("'worst perimeter' by class"); ax[1].legend()
plt.tight_layout(); plt.savefig(FIG / "01_eda.png", dpi=200); plt.close()

top12 = X.corrwith(y).abs().sort_values(ascending=False).head(12).index
fig, ax = plt.subplots(figsize=(6.2, 5.2))
im = ax.imshow(X[top12].corr(), cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(12)); ax.set_yticks(range(12))
ax.set_xticklabels(top12, rotation=90, fontsize=8); ax.set_yticklabels(top12, fontsize=8)
plt.colorbar(im, fraction=.046); ax.set_title("Correlation of the 12 most target-related features")
plt.tight_layout(); plt.savefig(FIG / "02_correlation.png", dpi=200); plt.close()

# %% [markdown]
# ## 3. Split and baseline models
# Stratified 80/20 split. The test set is **not touched** until Section 5.

# %% Split + baselines
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=.2, stratify=y, random_state=SEED)
R["split"] = {"train": len(Xtr), "test": len(Xte), "train_malignant": int(ytr.sum()), "test_malignant": int(yte.sum())}

cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
SCORING = {"acc": "accuracy", "prec": "precision", "rec": "recall", "f1": "f1", "auc": "roc_auc"}

def scaled(model):
    return Pipeline([("scaler", StandardScaler()), ("m", model)])

def make_models():
    return {
        "Dummy (majority)": DummyClassifier(strategy="most_frequent"),
        "Logistic Regression": scaled(LogisticRegression(max_iter=5000, random_state=SEED)),
        "KNN": scaled(KNeighborsClassifier()),
        "SVM (RBF)": scaled(SVC(probability=True, random_state=SEED)),
        "Random Forest": RandomForestClassifier(random_state=SEED),
        "Gradient Boosting": GradientBoostingClassifier(random_state=SEED),
    }

def cv_summary(model, cv_obj=cv):
    r = cross_validate(model, Xtr, ytr, cv=cv_obj, scoring=SCORING)
    return {k: [float(r[f"test_{k}"].mean()), float(r[f"test_{k}"].std())] for k in SCORING}

models = make_models()
NAMES = [n for n in models if not n.startswith("Dummy")]
R["baseline_cv"] = {n: cv_summary(m) for n, m in models.items()}
print(pd.DataFrame({n: {k: v[0] for k, v in s.items()} for n, s in R["baseline_cv"].items()}).T.round(3))

# Ablation: how much does feature scaling matter?
R["no_scaling_cv"] = {n: cv_summary(m) for n, m in {
    "Logistic Regression": LogisticRegression(max_iter=20000, random_state=SEED),
    "KNN": KNeighborsClassifier(),
    "SVM (RBF)": SVC(random_state=SEED)}.items()}

# %% [markdown]
# ## 4. Performance optimisation
# 4.1 Hyperparameter tuning (GridSearchCV, F1) | 4.2 Feature selection |
# 4.3 Repeated CV (was tuning real?) | 4.4 Decision threshold

# %% Hyperparameter tuning
GRIDS = {
    "Logistic Regression": (models["Logistic Regression"], {"m__C": [0.01, 0.1, 1, 10, 100], "m__class_weight": [None, "balanced"]}),
    "KNN": (models["KNN"], {"m__n_neighbors": [3, 5, 7, 9, 11, 15], "m__weights": ["uniform", "distance"], "m__p": [1, 2]}),
    "SVM (RBF)": (models["SVM (RBF)"], {"m__C": [0.1, 1, 10, 100], "m__gamma": ["scale", 0.001, 0.01, 0.1], "m__class_weight": [None, "balanced"]}),
    "Random Forest": (models["Random Forest"], {"n_estimators": [200, 500], "max_depth": [None, 5, 10], "min_samples_leaf": [1, 2, 4], "max_features": ["sqrt", "log2"]}),
    "Gradient Boosting": (models["Gradient Boosting"], {"n_estimators": [100, 300], "learning_rate": [0.03, 0.1], "max_depth": [2, 3], "subsample": [0.8, 1.0]}),
}
best, R["tuned_cv"] = {}, {}
for name, (est, grid) in GRIDS.items():
    t0 = time.time()
    gs = GridSearchCV(est, grid, cv=cv, scoring="f1", n_jobs=-1).fit(Xtr, ytr)
    best[name] = gs.best_estimator_
    R["tuned_cv"][name] = {**cv_summary(gs.best_estimator_),
        "best_params": {k: (v.item() if isinstance(v, np.generic) else v) for k, v in gs.best_params_.items()},
        "n_fits": len(gs.cv_results_["params"]) * 5, "search_seconds": round(time.time() - t0, 1)}
    print(f"{name:20s} CV F1 {R['tuned_cv'][name]['f1'][0]:.3f}  {gs.best_params_}")

# %% Feature selection (inside the pipeline so it is re-fitted per fold)
lr_p = R["tuned_cv"]["Logistic Regression"]["best_params"]
R["feature_selection_lr"] = {}
for k in [5, 10, 15, 20, 30]:
    pipe = Pipeline([("scaler", StandardScaler()), ("sel", SelectKBest(f_classif, k=k)),
                     ("m", LogisticRegression(C=lr_p["m__C"], class_weight=lr_p["m__class_weight"], max_iter=5000))])
    R["feature_selection_lr"][k] = {m: v[0] for m, v in cv_summary(pipe).items()}

# %% Repeated CV: is the tuning gain real or noise?
rcv = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=11)
R["repeated_cv_f1"] = {}
for n in ["Logistic Regression", "SVM (RBF)", "Random Forest", "Gradient Boosting"]:
    b = cross_validate(make_models()[n], Xtr, ytr, cv=rcv, scoring="f1")["test_score"]
    t = cross_validate(best[n], Xtr, ytr, cv=rcv, scoring="f1")["test_score"]
    R["repeated_cv_f1"][n] = {"default": [float(b.mean()), float(b.std())], "tuned": [float(t.mean()), float(t.std())]}

# %% Choose the final model by CV only (no test data used)
final_name = max(R["tuned_cv"], key=lambda n: (round(R["tuned_cv"][n]["f1"][0], 4), R["tuned_cv"][n]["auc"][0]))
final = best[final_name]; R["final_model"] = final_name
print("Final model:", final_name)

# %% [markdown]
# ## 5. Final evaluation on the held-out test set

# %% Test evaluation
def test_eval(model):
    model.fit(Xtr, ytr)
    pred, score = model.predict(Xte), model.predict_proba(Xte)[:, 1]
    return {"acc": accuracy_score(yte, pred), "prec": precision_score(yte, pred), "rec": recall_score(yte, pred),
            "f1": f1_score(yte, pred), "auc": roc_auc_score(yte, score)}, score, pred

R["test_all"], scores = {}, {}
for n in NAMES:
    R["test_all"][f"{n} | default"], _, _ = test_eval(make_models()[n])
    R["test_all"][f"{n} | tuned"], scores[n], _ = test_eval(best[n])

R["final_test"], fscore, fpred = test_eval(final)
cm = confusion_matrix(yte, fpred); R["final_confusion_matrix"] = cm.tolist()
print(R["final_test"]); print("Confusion matrix [[TN FP],[FN TP]]:", cm.tolist())

# Bootstrap 95% intervals (how certain are we with only 114 test samples?)
rng = np.random.default_rng(0); yt = yte.values; boot = {"acc": [], "f1": [], "rec": []}
for _ in range(2000):
    i = rng.choice(len(yt), len(yt))
    if yt[i].sum() == 0: continue
    boot["acc"].append(accuracy_score(yt[i], fpred[i])); boot["f1"].append(f1_score(yt[i], fpred[i])); boot["rec"].append(recall_score(yt[i], fpred[i]))
R["bootstrap_95ci"] = {k: [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))] for k, v in boot.items()}

# Decision threshold analysis (out-of-fold on TRAIN guides the choice)
oof = cross_val_predict(final, Xtr, ytr, cv=cv, method="predict_proba")[:, 1]
R["threshold_analysis"] = {}
for t in [0.5, 0.4, 0.3, 0.2, 0.1]:
    pp, pt = (oof >= t).astype(int), (fscore >= t).astype(int)
    R["threshold_analysis"][str(t)] = {"cv_recall": recall_score(ytr, pp), "cv_precision": precision_score(ytr, pp),
        "test_recall": recall_score(yte, pt), "test_precision": precision_score(yte, pt),
        "test_FN": int(((pt == 0) & (yt == 1)).sum()), "test_FP": int(((pt == 1) & (yt == 0)).sum())}

# Error analysis + permutation importance
wrong = np.where(fpred != yt)[0]
R["errors"] = [{"sample_index": int(Xte.index[i]), "true": int(yt[i]), "pred": int(fpred[i]),
                "prob_malignant": float(fscore[i]), "worst_perimeter": float(Xte.iloc[i]["worst perimeter"]),
                "worst_concave_points": float(Xte.iloc[i]["worst concave points"])} for i in wrong]
pi = permutation_importance(final, Xte, yte, scoring="f1", n_repeats=30, random_state=SEED)
imp = pd.Series(pi.importances_mean, index=X.columns).sort_values(ascending=False)
R["permutation_importance_top8"] = imp.head(8).to_dict()

# %% Figures
nm, w, xs = NAMES, .38, np.arange(len(NAMES))
fig, ax = plt.subplots(figsize=(8, 3.8))
ax.bar(xs - w/2, [R["baseline_cv"][n]["f1"][0] for n in nm], w, color=GREY, label="Default")
ax.bar(xs + w/2, [R["tuned_cv"][n]["f1"][0] for n in nm], w, color=NAVY, label="Tuned")
ax.set_xticks(xs); ax.set_xticklabels(nm, fontsize=9); ax.set_ylim(.88, 1.0)
ax.set_ylabel("5-fold CV F1 (train set)"); ax.legend(loc="lower right"); ax.set_title("Effect of hyperparameter tuning")
plt.tight_layout(); plt.savefig(FIG / "03_tuning.png", dpi=200); plt.close()

fig, ax = plt.subplots(1, 2, figsize=(9, 3.8))
for n in nm:
    fpr, tpr, _ = roc_curve(yte, scores[n]); ax[0].plot(fpr, tpr, label=f"{n} ({R['test_all'][n + ' | tuned']['auc']:.3f})")
ax[0].plot([0, 1], [0, 1], "--", color=GREY); ax[0].legend(fontsize=7, loc="lower right", title="Tuned (AUC)", title_fontsize=7)
ax[0].set_xlabel("False positive rate"); ax[0].set_ylabel("True positive rate"); ax[0].set_title("ROC curves (test set)")
ax[1].imshow(cm, cmap="Blues")
for i in range(2):
    for j in range(2): ax[1].text(j, i, cm[i, j], ha="center", va="center", fontsize=16, color="white" if cm[i, j] > cm.max()/2 else "black")
ax[1].set_xticks([0, 1]); ax[1].set_yticks([0, 1]); ax[1].set_xticklabels(["Benign", "Malignant"]); ax[1].set_yticklabels(["Benign", "Malignant"])
ax[1].set_xlabel("Predicted"); ax[1].set_ylabel("Actual"); ax[1].set_title(f"Confusion matrix: {final_name}")
plt.tight_layout(); plt.savefig(FIG / "04_evaluation.png", dpi=200); plt.close()

fig, ax = plt.subplots(figsize=(7, 3.6)); h = imp.head(8)[::-1]
ax.barh(h.index, h.values, xerr=[pi.importances_std[list(X.columns).index(k)] for k in h.index], color=NAVY)
ax.set_xlabel("Drop in test F1 when shuffled"); ax.set_title("Permutation importance (top 8)")
plt.tight_layout(); plt.savefig(FIG / "05_importance.png", dpi=200); plt.close()

# %% [markdown]
# ## 6. Save results

# %% Save
json.dump(R, open(OUT / "results.json", "w"), indent=1, default=float)
pd.DataFrame(R["test_all"]).T.round(4).to_csv(OUT / "test_results.csv")
pd.DataFrame({n: {k: v[0] for k, v in s.items()} for n, s in R["baseline_cv"].items()}).T.round(4).to_csv(OUT / "baseline_cv_results.csv")
pd.DataFrame({n: {k: v[0] for k, v in s.items() if k in SCORING} for n, s in R["tuned_cv"].items()}).T.round(4).to_csv(OUT / "tuned_cv_results.csv")
print("Done. Results saved to", OUT.resolve())
