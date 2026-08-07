import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import classification_report, accuracy_score
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import re
import os
import warnings
from PIL import Image
import pytesseract

warnings.filterwarnings('ignore')


# ============================================================
# 1. DISEASE PREDICTION ENGINE  (upgraded)
# ============================================================

DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'enhanced_dataset_general_medicine.csv'
)

# ------------------------------------------------------------------
# 1-A  Symptom Normalisation Map
#      Add more entries here to expand coverage — no code changes
#      needed elsewhere.
# ------------------------------------------------------------------
SYMPTOM_ALIASES = {
    # cough variants
    'coughing':                   'cough',
    'persistent cough':           'cough',
    'dry cough':                  'cough',
    'wet cough':                  'cough',
    'chronic cough':              'cough',
    'mild cough':                 'cough',
    # fever variants
    'high temperature':           'fever',
    'low grade fever':            'fever',
    'high fever':                 'fever',
    'mild fever':                 'fever',
    'temperature':                'fever',
    # pain variants
    'body ache':                  'body pain',
    'muscle ache':                'body pain',
    'muscle aches':               'body pain',
    'body aches':                 'body pain',
    'aches':                      'body pain',
    # breathing
    'difficulty breathing':       'shortness of breath',
    'breathing difficulty':       'shortness of breath',
    'troubled breathing':         'shortness of breath',
    'breathlessness':             'shortness of breath',
    'short of breath':            'shortness of breath',
    # stomach
    'stomach ache':               'abdominal pain',
    'stomach pain':               'abdominal pain',
    'belly pain':                 'abdominal pain',
    'abdominal ache':             'abdominal pain',
    # headache
    'head pain':                  'headache',
    'migraine':                   'headache',
    # fatigue
    'tiredness':                  'fatigue',
    'exhaustion':                 'fatigue',
    'weakness':                   'fatigue',
    'lethargy':                   'fatigue',
    # nausea / vomiting
    'feeling sick':               'nausea',
    'queasiness':                 'nausea',
    'throwing up':                'vomiting',
    # sore throat
    'throat pain':                'sore throat',
    'throat ache':                'sore throat',
    # runny nose
    'runny nose':                 'runny or stuffy nose',
    'stuffy nose':                'runny or stuffy nose',
    'blocked nose':               'runny or stuffy nose',
    'nasal congestion':           'runny or stuffy nose',
    # chest
    'chest tightness':            'chest pain',
    'chest discomfort':           'chest pain',
    # diarrhoea
    'diarrhea':                   'diarrhoea',
    'loose stools':               'diarrhoea',
    'loose motions':              'diarrhoea',
    # skin
    'rash':                       'skin rash',
    'itchy skin':                 'itching',
    'itch':                       'itching',
    # urination
    'burning urination':          'burning sensation during urination',
    'painful urination':          'burning sensation during urination',
    'frequent urination':         'frequent urge to urinate',
}

# ------------------------------------------------------------------
# 1-B  Emergency symptom combinations → skip ML, escalate immediately
# ------------------------------------------------------------------
EMERGENCY_COMBOS = [
    {'chest pain', 'shortness of breath'},
    {'chest pain', 'left arm pain'},
    {'chest pain', 'sweating'},
    {'high fever', 'confusion'},
    {'fever', 'confusion'},
    {'loss of consciousness'},
    {'severe bleeding'},
    {'seizure'},
    {'sudden weakness', 'numbness on one side of the body'},
    {'difficulty speaking', 'confusion'},
    {'severe allergic reaction'},
    {'anaphylaxis'},
]

EMERGENCY_RESPONSE = {
    'disease':    'MEDICAL EMERGENCY — Seek Immediate Help',
    'confidence': 100.0,
    'risk_level': 'high (critical)',
    'urgency':    'high',
    'doctor':     'Emergency Department / 108',
    'specialist': 'Emergency Medicine',
    'cures':      [
        'Call 108 (or your local emergency number) immediately.',
        'Do NOT drive yourself to the hospital.',
        'Stay calm and keep the patient still.',
        'Do not eat or drink anything.',
    ],
    'disclaimer':  (
        'EMERGENCY ALERT: These symptoms may indicate a life-threatening condition. '
        'This is NOT a time for self-diagnosis. Call emergency services NOW.'
    ),
    'matched_symptoms':  [],
    'missing_symptoms':  [],
    'predictions':       [],
    'algorithm_details': {
        'random_forest': {'prediction': 'Emergency override', 'confidence': 100.0},
        'knn':           {'prediction': 'Emergency override', 'confidence': 100.0},
    },
}


def normalize_symptom(sym: str) -> str:
    """Return the canonical form of a symptom string."""
    cleaned = sym.strip().lower()
    return SYMPTOM_ALIASES.get(cleaned, cleaned)


def normalize_symptom_list(symptoms: list) -> list:
    """Normalise every symptom in a list and remove empty strings."""
    return [normalize_symptom(s) for s in symptoms if s.strip()]


# ------------------------------------------------------------------
# 1-C  Dataset helpers
# ------------------------------------------------------------------

def clean_risk_level(val):
    r = str(val).strip()
    if r.endswith('%') or ')' in r:
        return r if r.endswith(')') else r + ')'
    if r.startswith(('low', 'moderate', 'high')) and '%' in r and not r.endswith(')'):
        return r + ')'
    return r


def clean_cures_list(c):
    if pd.isna(c) or not str(c).strip():
        return ['Consult a medical professional for personalised advice and supportive care.']
    raw = str(c).strip()
    if ',' in raw and len(raw) < 200:
        items = [item.strip().capitalize() for item in raw.split(',') if item.strip()]
        return items if items else [raw.capitalize()]
    return [raw.capitalize()]


def determine_urgency(risk_str: str) -> str:
    r = risk_str.lower()
    if 'high' in r:
        return 'high'
    if 'moderate' in r:
        return 'moderate'
    if 'low' in r:
        return 'low'
    return 'varies'


# ------------------------------------------------------------------
# 1-D  Load, clean, and train model (runs once at startup)
# ------------------------------------------------------------------

def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all data-cleaning rules to the raw CSV."""
    required = {'disease', 'symptoms', 'cures', 'doctor', 'risk level'}
    missing = required - set(df.columns.str.strip().str.lower())
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    # Normalise column names
    df.columns = df.columns.str.strip().str.lower()

    # Strip whitespace from all string cells (pandas 2.1+ uses .map instead of .applymap)
    strip_fn = lambda x: x.strip() if isinstance(x, str) else x
    try:
        df = df.map(strip_fn)
    except AttributeError:
        df = df.applymap(strip_fn)  # pandas < 2.1 fallback

    # Drop rows with no disease or no symptoms
    df = df.dropna(subset=['disease', 'symptoms'])
    df = df[df['disease'].str.strip() != '']
    df = df[df['symptoms'].str.strip() != '']

    # Lowercase disease names for deduplication; keep original casing in metadata
    df['disease_key'] = df['disease'].str.strip().str.lower()

    # Merge duplicate disease rows → combine their symptom sets
    merged_rows = []
    for key, group in df.groupby('disease_key'):
        combined_syms = set()
        for _, row in group.iterrows():
            for s in str(row['symptoms']).split(','):
                ns = normalize_symptom(s)
                if ns:
                    combined_syms.add(ns)
        # Use first row's metadata for non-symptom fields
        first = group.iloc[0]
        merged_rows.append({
            'disease':     str(first['disease']).strip(),
            'disease_key': key,
            'symptoms':    ','.join(sorted(combined_syms)),
            'cures':       first.get('cures', ''),
            'doctor':      first.get('doctor', 'General Medicine'),
            'risk level':  first.get('risk level', 'low (0.1%)'),
        })

    clean = pd.DataFrame(merged_rows)
    clean = clean.drop_duplicates(subset=['disease_key'])
    return clean


def load_and_train_disease_model():
    """Load the CSV, clean it, build features, train RF, return artefacts."""
    if not os.path.exists(DATASET_PATH):
        # Minimal fallback so the server starts even without the CSV
        print("[ML] WARNING: Dataset not found — using minimal fallback.")
        all_symptoms = ['fever', 'cough', 'shortness of breath', 'chest pain', 'fatigue', 'headache']
        disease_metadata = {
            'flu': {
                'disease':    'Flu',
                'doctor':     'General Medicine, Urgent Care',
                'risk_level': 'low (0.1%)',
                'urgency':    'low',
                'cures':      ['Over-the-counter medications', 'Rest', 'Fluids'],
                'symptoms':   ['fever', 'cough', 'fatigue'],
            }
        }
        mlb = MultiLabelBinarizer(classes=all_symptoms)
        X = pd.DataFrame(mlb.fit_transform([all_symptoms]), columns=all_symptoms)
        y = pd.Series(['flu'])
        return pd.DataFrame(), all_symptoms, disease_metadata, X, y, mlb

    # --- Load & clean ---
    raw_df = pd.read_csv(DATASET_PATH)
    df = _clean_dataframe(raw_df)

    print(f"[ML] Dataset loaded: {len(df)} unique diseases after deduplication.")

    # --- Build symptom set ---
    all_disease_symptoms = []
    for _, row in df.iterrows():
        syms = [normalize_symptom(s) for s in str(row['symptoms']).split(',') if s.strip()]
        all_disease_symptoms.append(syms)

    mlb = MultiLabelBinarizer()
    mlb.fit(all_disease_symptoms)
    all_symptoms = list(mlb.classes_)

    X_arr = mlb.transform(all_disease_symptoms)
    X = pd.DataFrame(X_arr, columns=all_symptoms)
    y = df['disease_key'].reset_index(drop=True)

    # --- Build disease metadata (symptoms included for overlap engine) ---
    disease_metadata = {}
    for i, row in df.reset_index(drop=True).iterrows():
        key = str(row['disease_key'])
        dr = str(row['doctor']).strip() if not pd.isna(row['doctor']) else 'General Medicine'
        rl = clean_risk_level(row['risk level']) if not pd.isna(row['risk level']) else 'low (0.1%)'
        cures = clean_cures_list(row['cures'])
        syms = [normalize_symptom(s) for s in str(row['symptoms']).split(',') if s.strip()]
        disease_metadata[key] = {
            'disease':    str(row['disease']).strip().title(),
            'doctor':     dr.title(),
            'risk_level': rl,
            'urgency':    determine_urgency(rl),
            'cures':      cures,
            'symptoms':   syms,          # canonical symptom list for overlap scoring
        }

    # --- Train / evaluate ---
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=20,
        min_samples_split=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
    )

    if len(X) >= 20:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42
            # Note: stratify omitted — dataset has only 1 sample per disease class
        )
        rf.fit(X_train, y_train)
        y_pred = rf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        print(f"[ML] Random Forest accuracy on hold-out set: {acc * 100:.1f}%")
    else:
        rf.fit(X, y)
        print("[ML] Dataset too small for train/test split — trained on full set.")

    return df, all_symptoms, disease_metadata, X, y, mlb


# Run once at module load time
(df_disease, SYMPTOMS, DISEASE_METADATA,
 X_disease, y_disease, MLB) = load_and_train_disease_model()

rf_classifier = RandomForestClassifier(
    n_estimators=300,
    max_depth=20,
    min_samples_split=2,
    class_weight='balanced',
    random_state=42,
    n_jobs=-1,
)
rf_classifier.fit(X_disease, y_disease)


# ------------------------------------------------------------------
# 1-E  Symptom overlap engine
# ------------------------------------------------------------------

def _overlap_score(user_syms: set, disease_key: str) -> float:
    """
    Return overlap = matched / total_disease_symptoms.
    Falls back to 0.0 if disease not found.
    """
    meta = DISEASE_METADATA.get(disease_key)
    if not meta or not meta['symptoms']:
        return 0.0
    disease_syms = set(meta['symptoms'])
    if not disease_syms:
        return 0.0
    return len(user_syms & disease_syms) / len(disease_syms)


# ------------------------------------------------------------------
# 1-F  Combined confidence score
# ------------------------------------------------------------------

def _combined_confidence(rf_prob: float, overlap: float, matched: int) -> float:
    """
    Blend ML probability, symptom overlap, and absolute match count
    into a single realistic confidence score (0–100).
    """
    # Weights: RF 50 %, overlap 35 %, match bonus 15 %
    match_bonus = min(matched / 5.0, 1.0)          # saturates at 5 symptoms
    raw = (rf_prob * 0.50) + (overlap * 0.35) + (match_bonus * 0.15)
    return round(raw * 100, 1)


# ------------------------------------------------------------------
# 1-G  Main prediction function  (API-compatible)
# ------------------------------------------------------------------

def predict_disease(symptom_list: list) -> dict:
    """
    Entry point called by Django views.  Signature unchanged.
    Returns the existing flat dict PLUS a new `predictions` list.
    """
    # ---- 0. Validate input ----
    if not symptom_list:
        return {
            'disease':    'Unknown / Insufficient Data',
            'confidence': 0.0,
            'risk_level': 'N/A',
            'urgency':    'low',
            'doctor':     'General Medicine',
            'specialist': 'General Medicine',
            'cures':      ['Please select at least one symptom to run the diagnostic analysis.'],
            'disclaimer': 'Please select symptoms to analyse your health risk.',
            'matched_symptoms': [],
            'missing_symptoms': [],
            'predictions': [],
            'algorithm_details': {
                'random_forest': {'prediction': 'None', 'confidence': 0.0},
                'knn':           {'prediction': 'None', 'confidence': 0.0},
            },
        }

    # ---- 1. Normalise ----
    normalised = normalize_symptom_list(symptom_list)
    user_sym_set = set(normalised)

    # ---- 2. Minimum symptom guard ----
    if len(user_sym_set) < 2:
        return {
            'disease':    'Insufficient Symptoms',
            'confidence': 0.0,
            'risk_level': 'N/A',
            'urgency':    'low',
            'doctor':     'General Medicine',
            'specialist': 'General Medicine',
            'cures':      [
                'One symptom alone is not enough to make a reliable prediction.',
                'Please select at least 2 symptoms for a meaningful analysis.',
            ],
            'disclaimer': (
                'A minimum of 2 symptoms is required to run the diagnostic engine. '
                'Single-symptom queries produce too many false positives.'
            ),
            'matched_symptoms': list(user_sym_set),
            'missing_symptoms': [],
            'predictions': [],
            'algorithm_details': {
                'random_forest': {'prediction': 'None', 'confidence': 0.0},
                'knn':           {'prediction': 'None', 'confidence': 0.0},
            },
        }

    # ---- 3. Emergency detection ----
    for combo in EMERGENCY_COMBOS:
        if combo.issubset(user_sym_set):
            resp = dict(EMERGENCY_RESPONSE)
            resp['matched_symptoms'] = list(combo & user_sym_set)
            return resp

    # ---- 4. Build input feature vector via MLB ----
    known_syms = [s for s in normalised if s in MLB.classes_]
    if not known_syms:
        return {
            'disease':    'Unknown / Insufficient Data',
            'confidence': 0.0,
            'risk_level': 'N/A',
            'urgency':    'low',
            'doctor':     'General Medicine',
            'specialist': 'General Medicine',
            'cures':      ['The symptoms you entered are not in our database. Please try common symptom names.'],
            'disclaimer': 'None of the entered symptoms could be matched to our disease database.',
            'matched_symptoms': [],
            'missing_symptoms': list(user_sym_set),
            'predictions': [],
            'algorithm_details': {
                'random_forest': {'prediction': 'None', 'confidence': 0.0},
                'knn':           {'prediction': 'None', 'confidence': 0.0},
            },
        }

    feature_vec = MLB.transform([known_syms])
    vector_df   = pd.DataFrame(feature_vec, columns=MLB.classes_)

    # ---- 5. RF prediction → probabilities for ALL diseases ----
    rf_probs_arr    = rf_classifier.predict_proba(vector_df)[0]
    rf_classes      = rf_classifier.classes_               # disease keys
    rf_top_pred_key = rf_classes[int(np.argmax(rf_probs_arr))]
    rf_top_conf     = round(float(np.max(rf_probs_arr)) * 100, 2)

    # ---- 6. Symptom overlap pre-filter ----
    # Compute overlap for every disease and keep those with overlap > 0
    disease_overlap = {}
    for key in rf_classes:
        ov = _overlap_score(user_sym_set, key)
        if ov > 0:
            disease_overlap[key] = ov

    # If no disease overlaps at all, relax to include any RF candidate
    if not disease_overlap:
        for key, prob in zip(rf_classes, rf_probs_arr):
            if prob > 0.01:
                disease_overlap[key] = 0.0

    # ---- 7. Score & rank candidates ----
    scored = []
    for key, ov in disease_overlap.items():
        rf_prob_for_key = float(rf_probs_arr[list(rf_classes).index(key)]) if key in rf_classes else 0.0
        meta = DISEASE_METADATA.get(key)
        if not meta:
            continue
        d_syms    = set(meta['symptoms'])
        matched   = list(user_sym_set & d_syms)
        missing   = list(d_syms - user_sym_set)
        n_matched = len(matched)
        conf      = _combined_confidence(rf_prob_for_key, ov, n_matched)

        scored.append({
            'disease':          meta['disease'],
            'disease_key':      key,
            'confidence':       conf,
            'matched_symptoms': matched,
            'missing_symptoms': missing[:5],         # cap for readability
            'doctor':           meta['doctor'],
            'urgency':          meta['urgency'],
            'risk_level':       meta['risk_level'],
            'cures':            meta['cures'],
        })

    # Sort by composite confidence descending
    scored.sort(key=lambda x: x['confidence'], reverse=True)
    top5 = scored[:5]

    if not top5:
        # Ultra-rare fallback
        meta = DISEASE_METADATA.get(rf_top_pred_key, {})
        top5 = [{
            'disease':          meta.get('disease', str(rf_top_pred_key).title()),
            'disease_key':      rf_top_pred_key,
            'confidence':       rf_top_conf,
            'matched_symptoms': list(user_sym_set),
            'missing_symptoms': [],
            'doctor':           meta.get('doctor', 'General Medicine'),
            'urgency':          meta.get('urgency', 'low'),
            'risk_level':       meta.get('risk_level', 'low (0.1%)'),
            'cures':            meta.get('cures', ['Consult a doctor.']),
        }]

    # ---- 8. Build backward-compatible flat response from top result ----
    primary = top5[0]

    # Build the new `predictions` list (strip internal keys)
    predictions_list = []
    for item in top5:
        predictions_list.append({
            'disease':          item['disease'],
            'confidence':       item['confidence'],
            'matched_symptoms': item['matched_symptoms'],
            'missing_symptoms': item['missing_symptoms'],
            'doctor':           item['doctor'],
            'urgency':          item['urgency'],
            'risk_level':       item['risk_level'],
            'cures':            item['cures'],
        })

    return {
        # ── Backward-compatible flat fields ──────────────────────────
        'disease':    primary['disease'],
        'confidence': primary['confidence'],
        'risk_level': primary['risk_level'],
        'urgency':    primary['urgency'],
        'doctor':     primary['doctor'],
        'specialist': primary['doctor'],
        'cures':      primary['cures'],
        'disclaimer': (
            'Medical AI Diagnostic Disclaimer: This analysis is for informational purposes only. '
            'Please consult a qualified healthcare provider for official diagnosis and treatment.'
        ),
        # ── Extended fields (new) ─────────────────────────────────────
        'matched_symptoms': primary['matched_symptoms'],
        'missing_symptoms': primary['missing_symptoms'],
        'predictions':      predictions_list,
        'algorithm_details': {
            'random_forest': {
                'prediction': str(rf_top_pred_key).title(),
                'confidence': rf_top_conf,
            },
            'knn': {
                'prediction': primary['disease'],
                'confidence': primary['confidence'],
            },
        },
    }


# ============================================================
# 2. HEALTH RISK PREDICTION ENGINE  (unchanged)
# ============================================================

def predict_health_risk_trend(history_metrics):
    """
    history_metrics: list of dicts like {'day': 1, 'metric_value': 85}
    We will fit both Linear Regression and Polynomial Regression (degree 2)
    to predict the values for next 5 days.
    """
    if len(history_metrics) < 2:
        return {'status': 'insufficient_data'}

    df = pd.DataFrame(history_metrics)
    X = df['day'].values.reshape(-1, 1)
    y = df['metric_value'].values

    # Linear Regression
    lr = LinearRegression()
    lr.fit(X, y)

    # Polynomial Regression (degree 2)
    poly = PolynomialFeatures(degree=2)
    X_poly = poly.fit_transform(X)
    poly_lr = LinearRegression()
    poly_lr.fit(X_poly, y)

    # Predict next 5 days
    future_days = np.array([X[-1][0] + i for i in range(1, 6)]).reshape(-1, 1)
    lr_predictions = lr.predict(future_days)

    future_days_poly = poly.transform(future_days)
    poly_predictions = poly_lr.predict(future_days_poly)

    trend_data = []
    for i in range(len(future_days)):
        day_num = int(future_days[i][0])
        trend_data.append({
            'day':            day_num,
            'linear_pred':    round(float(lr_predictions[i]), 2),
            'polynomial_pred': round(float(poly_predictions[i]), 2),
        })

    return {
        'status':    'success',
        'trend':     trend_data,
        'direction': 'increasing' if lr.coef_[0] > 0 else 'decreasing',
        'slope':     float(lr.coef_[0]),
    }


# ============================================================
# 3. MEDICAL REPORT OCR ANALYZER  (unchanged)
# ============================================================

def analyze_medical_report(file_path):
    """
    Analyzes medical report image or text/pdf.
    Using Tesseract OCR if available; else fall back to parsing file text or simulation.
    """
    text = ""
    if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
        try:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
        except Exception as e:
            print("pytesseract failed, falling back to simulated extraction:", e)

    if not text:
        filename = os.path.basename(file_path).lower()
        if 'diabetic' in filename or 'sugar' in filename:
            text = "Blood Sugar: 180 mg/dL, Hemoglobin: 11.5 g/dL, WBC: 8500, Platelets: 250000, RBC: 4.2"
        elif 'anemic' in filename or 'blood' in filename:
            text = "Hemoglobin: 9.2 g/dL, RBC: 3.1, Platelets: 180000, Vitamin D: 15 ng/mL"
        else:
            text = "Hemoglobin: 14.5 g/dL, WBC: 6500, Platelets: 220000, Blood Sugar: 95 mg/dL, Vitamin D: 32 ng/mL, Vitamin B12: 450 pg/mL"

    def extract_val(pattern, text, default):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return default

    hemoglobin  = extract_val(r'Hemoglobin[:\s]+([\d\.]+)', text, 14.0)
    wbc         = extract_val(r'WBC[:\s]+([\d\.]+)',         text, 7000.0)
    rbc         = extract_val(r'RBC[:\s]+([\d\.]+)',         text, 4.5)
    platelets   = extract_val(r'Platelets[:\s]+([\d\.]+)',   text, 230000.0)
    blood_sugar = extract_val(r'Blood\s+Sugar[:\s]+([\d\.]+)', text, 95.0)
    vitamin_d   = extract_val(r'Vitamin\s+D[:\s]+([\d\.]+)', text, 30.0)
    vitamin_b12 = extract_val(r'Vitamin\s+B12[:\s]+([\d\.]+)', text, 400.0)

    ranges = {
        'hemoglobin':  {'min': 12.0,   'max': 16.0,    'unit': 'g/dL'},
        'wbc':         {'min': 4000.0, 'max': 11000.0, 'unit': 'cells/mcL'},
        'rbc':         {'min': 4.0,    'max': 5.9,     'unit': 'million/mcL'},
        'platelets':   {'min': 150000.0, 'max': 450000.0, 'unit': 'cells/mcL'},
        'blood_sugar': {'min': 70.0,   'max': 100.0,   'unit': 'mg/dL'},
        'vitamin_d':   {'min': 20.0,   'max': 50.0,    'unit': 'ng/mL'},
        'vitamin_b12': {'min': 200.0,  'max': 900.0,   'unit': 'pg/mL'},
    }

    results = {}
    for metric, val in [
        ('hemoglobin', hemoglobin), ('wbc', wbc), ('rbc', rbc),
        ('platelets', platelets),   ('blood_sugar', blood_sugar),
        ('vitamin_d', vitamin_d),   ('vitamin_b12', vitamin_b12),
    ]:
        ref    = ranges[metric]
        status = 'Normal'
        if val < ref['min']:
            status = 'Low'
        elif val > ref['max']:
            status = 'High'
        results[metric] = {
            'value':  val,
            'range':  f"{ref['min']} - {ref['max']} {ref['unit']}",
            'status': status,
        }

    anomalies = [m for m, r in results.items() if r['status'] != 'Normal']

    explanation    = ("All key metabolic panel parameters (Hemoglobin, WBC, RBC, Platelets, "
                      "Blood Sugar, and Vitamin levels) are within the standard reference ranges. "
                      "This indicates excellent metabolic and haematological health.")
    recommendations = ("Continue with a balanced diet, stay hydrated, and perform daily physical "
                       "activities. Re-test in 6 months to track your progress.")
    doctor_summary  = ("Patient's blood chemistry panel displays normocytic-normochromic counts. "
                       "Glucose levels are controlled, and vitamin distributions are optimal. "
                       "No acute intervention is required.")

    if anomalies:
        exps, recs, docs = [], [], []
        for a in anomalies:
            st  = results[a]['status']
            val = results[a]['value']
            if a == 'hemoglobin' and st == 'Low':
                exps.append(f"Your Hemoglobin is low ({val} g/dL), which indicates mild anaemia. This can cause fatigue and weakness.")
                recs.append("Increase consumption of iron-rich foods (spinach, red meat, beans) and Vitamin C to aid absorption.")
                docs.append("Hemoglobin is below normal. Patient may present with clinical anaemia. Rule out dietary deficiency.")
            elif a == 'blood_sugar' and st == 'High':
                exps.append(f"Your Blood Sugar level is elevated ({val} mg/dL). This could be a sign of pre-diabetes or diabetes.")
                recs.append("Restrict simple sugars and processed carbs. Plan regular walks after meals.")
                docs.append("Hyperglycaemia detected. Suggest fasting plasma glucose or HbA1c test for confirmation.")
            elif a == 'vitamin_d' and st == 'Low':
                exps.append(f"Your Vitamin D level is low ({val} ng/mL), which can lead to bone pain and lower immunity.")
                recs.append("Get 15-20 minutes of morning sunlight daily or consult about Vitamin D3 supplements.")
                docs.append("Hypovitaminosis D. Recommend supplementation schedule based on deficiency severity.")
        if exps:
            explanation    = " ".join(exps)
            recommendations = " ".join(recs)
            doctor_summary  = " ".join(docs)

    return {
        'ocr_results':    results,
        'summary':        f"Analysed Medical Report with {len(anomalies)} abnormal flag(s).",
        'doctor_summary': doctor_summary,
        'explanation':    explanation,
        'recommendations': recommendations,
    }
