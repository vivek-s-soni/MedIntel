import os
import random
import pandas as pd
from ml_engine import _clean_dataframe, normalize_symptom

RAW_DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'enhanced_dataset_general_medicine.csv'
)

OUTPUT_DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'enhanced_dataset_multi_sample.csv'
)

def generate_augmented_dataset(samples_per_disease=35, random_seed=42):
    random.seed(random_seed)
    if not os.path.exists(RAW_DATASET_PATH):
        raise FileNotFoundError(f"Source dataset not found at {RAW_DATASET_PATH}")

    raw_df = pd.read_csv(RAW_DATASET_PATH)
    clean_df = _clean_dataframe(raw_df)

    print(f"[Generator] Source cleaned dataset contains {len(clean_df)} unique diseases.")

    # Gather all unique symptoms across the dataset to use as noise pool
    all_symptoms_set = set()
    disease_symptom_map = {}

    for _, row in clean_df.iterrows():
        key = row['disease_key']
        syms = [normalize_symptom(s) for s in str(row['symptoms']).split(',') if s.strip()]
        if syms:
            disease_symptom_map[key] = syms
            all_symptoms_set.update(syms)

    all_symptoms_list = list(all_symptoms_set)
    generated_rows = []

    for _, row in clean_df.iterrows():
        key = row['disease_key']
        disease_name = row['disease']
        cures = row['cures']
        doctor = row['doctor']
        risk_level = row['risk level']
        base_syms = disease_symptom_map.get(key, [])

        if not base_syms:
            continue

        for i in range(samples_per_disease):
            # Pick 50% to 100% of the disease's canonical symptoms
            k_base = max(1, random.randint(int(len(base_syms) * 0.5), len(base_syms)))
            chosen_base = random.sample(base_syms, k_base)

            # 20% chance to add 1 random noise symptom not in base_syms
            chosen_noise = []
            if random.random() < 0.20:
                other_syms = list(all_symptoms_set - set(base_syms))
                if other_syms:
                    chosen_noise.append(random.choice(other_syms))

            sample_syms = sorted(list(set(chosen_base + chosen_noise)))

            generated_rows.append({
                'disease': disease_name,
                'disease_key': key,
                'symptoms': ','.join(sample_syms),
                'cures': cures,
                'doctor': doctor,
                'risk level': risk_level
            })

    output_df = pd.DataFrame(generated_rows)
    output_df.to_csv(OUTPUT_DATASET_PATH, index=False)
    print(f"[Generator] Successfully created augmented dataset with {len(output_df)} samples saved to: {OUTPUT_DATASET_PATH}")
    return output_df

if __name__ == '__main__':
    generate_augmented_dataset()
