"""
data/generate_sample_data.py
Generate a realistic synthetic attendance dataset for training the ML models.
Saves the dataset as a CSV file to cv-api/data/attendance_data.csv.
"""

from __future__ import annotations

import datetime
import logging
from pathlib import Path
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("frams.generate_sample_data")


def generate_data(output_path: Path):
    logger.info("Generating realistic training data...")
    np.random.seed(42)

    num_students = 40
    num_subjects = 5
    num_days = 30

    # ── 1. Create Student Profiles ───────────────────────────────────────────
    students = []
    for i in range(num_students):
        student_id = f"student_{i+1:03d}"
        
        # Base absence probability: average is 12% (attendance ~88%), with some variance
        base_abs_prob = np.clip(np.random.beta(2, 15), 0.02, 0.6)
        
        # hostel vs day scholar
        is_hostel = np.random.choice([0, 1], p=[0.4, 0.6])
        if is_hostel == 1:
            distance_km = float(np.random.uniform(0.1, 1.5))
        else:
            distance_km = float(np.random.uniform(2.0, 25.0))
            
        semester = int(np.random.randint(1, 9))
        
        # CGPA correlated with attendance (high attendance -> high CGPA)
        cgpa_base = 9.0 - (base_abs_prob * 8.0)
        cgpa = float(np.clip(cgpa_base + np.random.normal(0, 0.6), 4.0, 10.0))
        cgpa_prev = float(np.clip(cgpa + np.random.normal(-0.1, 0.3), 4.0, 10.0))
        cgpa_drop_last_sem = float(cgpa_prev - cgpa)
        
        club_activities = int(np.random.choice([0, 1], p=[0.7, 0.3]))
        study_hours = float(np.clip(cgpa * 0.7 + np.random.uniform(1.0, 3.0), 1.0, 10.0))
        lib_visits = int(np.clip(int(cgpa * 1.5) + np.random.randint(-2, 5), 0, 20))
        
        # Academic difficulties
        backlogs = 0
        if cgpa < 6.0:
            backlogs = int(np.random.choice([0, 1, 2, 3], p=[0.2, 0.4, 0.3, 0.1]))
        elif cgpa < 7.5:
            backlogs = int(np.random.choice([0, 1], p=[0.8, 0.2]))
            
        financial_aid = int(np.random.choice([0, 1], p=[0.85, 0.15]))
        part_time_job = int(np.random.choice([0, 1], p=[0.9, 0.1]))
        family_issues = int(np.random.choice([0, 1], p=[0.92, 0.08]))
        
        prev_dropout_attempt = 0
        if cgpa < 5.0 and base_abs_prob > 0.3:
            prev_dropout_attempt = int(np.random.choice([0, 1], p=[0.85, 0.15]))
            
        mental_health = float(np.clip(8.0 - (family_issues * 3.0) - (base_abs_prob * 4.0) + np.random.normal(0, 1.0), 1.0, 10.0))
        
        students.append({
            "student_id": student_id,
            "base_abs_prob": base_abs_prob,
            "is_hostel": is_hostel,
            "distance_km": distance_km,
            "semester": semester,
            "cgpa": cgpa,
            "cgpa_prev": cgpa_prev,
            "cgpa_drop_last_sem": cgpa_drop_last_sem,
            "club_activities": club_activities,
            "study_hours_per_day": study_hours,
            "library_visits_per_month": lib_visits,
            "backlogs": backlogs,
            "num_backlogs": backlogs,
            "financial_aid": financial_aid,
            "part_time_job": part_time_job,
            "family_issues": family_issues,
            "previous_dropout_attempt": prev_dropout_attempt,
            "mental_health_score": mental_health,
        })
    df_students = pd.DataFrame(students)

    # ── 2. Create Subject Profiles ───────────────────────────────────────────
    subjects = []
    for j in range(num_subjects):
        subject_id = f"SUB_{j+1:02d}"
        difficulty = float(np.random.uniform(0.2, 0.8))
        subjects.append({"subject_id": subject_id, "subject_difficulty": difficulty})
    df_subjects = pd.DataFrame(subjects)

    # ── 3. Generate Calendar ─────────────────────────────────────────────────
    start_date = datetime.date(2026, 1, 5)  # Monday
    dates = []
    current_date = start_date
    while len(dates) < num_days:
        if current_date.weekday() < 5:  # Mon-Fri
            dates.append(current_date)
        current_date += datetime.timedelta(days=1)
        
    df_dates = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in dates],
        "day_of_week": [d.weekday() for d in dates],
        "month": [d.month for d in dates],
        "weather_score": np.random.uniform(0.3, 1.0, len(dates))  # Random weather
    })
    # Add occasional bad weather days (rainy/cold seasons)
    bad_weather_indices = np.random.choice(len(dates), size=15, replace=False)
    df_dates.loc[bad_weather_indices, "weather_score"] = np.random.uniform(0.05, 0.25, 15)

    # ── 4. Generate Records ──────────────────────────────────────────────────
    # Generate student x subject combinations (1000 combinations)
    combos = []
    for s_idx, s in df_students.iterrows():
        for sub_idx, sub in df_subjects.iterrows():
            combos.append((s["student_id"], sub["subject_id"]))
            
    records = []
    
    logger.info("Simulating attendance records (this might take a few seconds)...")
    
    # We will simulate day-by-day to maintain consecutive absences and rolling rates
    # Initialize trackers
    # student_subject -> consecutive_absences
    consec_track = {f"{sid}_{subid}": 0 for sid, subid in combos}
    # student_subject -> list of last N attendances (for rolling trends)
    history_track = {f"{sid}_{subid}": [] for sid, subid in combos}
    # student_subject -> total classes, total attended
    total_classes_track = {f"{sid}_{subid}": 0 for sid, subid in combos}
    total_attended_track = {f"{sid}_{subid}": 0 for sid, subid in combos}
    # student -> global consecutive absences max
    consec_max_track = {sid: 0 for sid in df_students["student_id"]}
    # student -> global list of all attendances
    student_global_history = {sid: [] for sid in df_students["student_id"]}

    for d_idx, day_row in df_dates.iterrows():
        date_str = day_row["date"]
        dow = int(day_row["day_of_week"])
        month = int(day_row["month"])
        weather = float(day_row["weather_score"])
        
        monday_factor = int(dow == 0)
        friday_factor = int(dow == 4)
        
        # Random time slot: 0=morning, 1=afternoon, 2=evening
        time_slots = np.random.randint(0, 3, len(combos))
        
        for idx, (student_id, subject_id) in enumerate(combos):
            s_prof = df_students.loc[df_students["student_id"] == student_id].iloc[0]
            sub_prof = df_subjects.loc[df_subjects["subject_id"] == subject_id].iloc[0]
            
            key = f"{student_id}_{subject_id}"
            
            # Running metrics before today's record
            t_classes = total_classes_track[key]
            t_attended = total_attended_track[key]
            
            # previous rate default to 85%
            prev_rate = (t_attended / t_classes * 100.0) if t_classes > 0 else 85.0
            
            # Calculate base probability of absence for this session
            prob = s_prof["base_abs_prob"]
            
            # Day of week impact
            if dow == 0:  # Monday blues
                prob += 0.06
            elif dow == 4:  # Friday weekend itch
                prob += 0.09
                
            # Weather impact (especially for day scholars)
            if weather < 0.3:
                if s_prof["is_hostel"] == 0:
                    prob += 0.15 * (s_prof["distance_km"] / 10.0)
                else:
                    prob += 0.03
                    
            # Time slot impact (early morning and late evening are skipped more)
            ts = time_slots[idx]
            if ts == 0:
                prob += 0.04
            elif ts == 2:
                prob += 0.02
                
            # Subject difficulty impact
            prob += sub_prof["subject_difficulty"] * 0.08
            
            # Streak impact (if they missed last class, they are slightly more likely to miss today)
            current_consec = consec_track[key]
            if current_consec > 0:
                prob += 0.05 * min(current_consec, 3)
                
            prob = np.clip(prob, 0.01, 0.98)
            
            # Decide absence
            is_absent = 1 if np.random.rand() < prob else 0
            
            # Update trackers
            total_classes_track[key] += 1
            if is_absent == 0:
                total_attended_track[key] += 1
                consec_track[key] = 0
            else:
                consec_track[key] += 1
                if consec_track[key] > consec_max_track[student_id]:
                    consec_max_track[student_id] = consec_track[key]
                    
            # Keep history for trends
            history_track[key].append(is_absent)
            student_global_history[student_id].append(is_absent)
            
            # Calculate trends
            # trend_7d: rate in last 7 classes vs prior 7 classes
            hist = history_track[key]
            trend_7 = 0.0
            trend_30 = 0.0
            if len(hist) >= 14:
                recent_7 = np.mean(hist[-7:])
                prior_7 = np.mean(hist[-14:-7])
                trend_7 = float((prior_7 - recent_7) * 100.0)  # positive is good (less absence)
            if len(hist) >= 60:
                recent_30 = np.mean(hist[-30:])
                prior_30 = np.mean(hist[-60:-30])
                trend_30 = float((prior_30 - recent_30) * 100.0)
                
            records.append({
                "student_id": student_id,
                "subject_id": subject_id,
                "date": date_str,
                "day_of_week": dow,
                "month": month,
                "semester": s_prof["semester"],
                "previous_rate": float(round(prev_rate, 2)),
                "consecutive_absences": current_consec,
                "is_hostel": s_prof["is_hostel"],
                "cgpa": s_prof["cgpa"],
                "cgpa_prev": s_prof["cgpa_prev"],
                "cgpa_drop_last_sem": s_prof["cgpa_drop_last_sem"],
                "distance": s_prof["distance_km"],
                "distance_km": s_prof["distance_km"],
                "weather_score": float(round(weather, 2)),
                "monday_factor": monday_factor,
                "friday_factor": friday_factor,
                "subject_difficulty": sub_prof["subject_difficulty"],
                "time_slot": ts,
                "is_absent": is_absent,
                # Running stats for risk predictor
                "trend_7d": float(round(trend_7, 2)),
                "trend_30d": float(round(trend_30, 2)),
                "total_classes": total_classes_track[key],
                "total_attended": total_attended_track[key],
                # Student level habit metadata duplicated (will be used by regression/classification)
                "club_activities": s_prof["club_activities"],
                "study_hours_per_day": s_prof["study_hours_per_day"],
                "library_visits_per_month": s_prof["library_visits_per_month"],
                "backlogs": s_prof["backlogs"],
                "num_backlogs": s_prof["backlogs"],
                "financial_aid": s_prof["financial_aid"],
                "part_time_job": s_prof["part_time_job"],
                "family_issues": s_prof["family_issues"],
                "previous_dropout_attempt": s_prof["previous_dropout_attempt"],
                "mental_health_score": s_prof["mental_health_score"],
            })

    df_records = pd.DataFrame(records)

    # ── 5. Add Overall Attendance Pct and Risk Levels ───────────────────────
    # Calculate final global attendance rate for each student
    student_rates = {}
    for sid, hist in student_global_history.items():
        abs_rate = np.mean(hist)
        student_rates[sid] = (1.0 - abs_rate) * 100.0
        
    df_records["attendance_pct"] = df_records["student_id"].map(student_rates).round(2)
    
    # Calculate semester attendance percentages (slightly correlated with final rate)
    student_sem1_rates = {}
    student_sem2_rates = {}
    for sid, hist in student_global_history.items():
        mid = len(hist) // 2
        student_sem1_rates[sid] = float(round((1.0 - np.mean(hist[:mid])) * 100.0, 2))
        student_sem2_rates[sid] = float(round((1.0 - np.mean(hist[mid:])) * 100.0, 2))
        
    df_records["attendance_pct_sem1"] = df_records["student_id"].map(student_sem1_rates)
    df_records["attendance_pct_sem2"] = df_records["student_id"].map(student_sem2_rates)
    
    # Add consecutive absences max
    df_records["consecutive_absences_max"] = df_records["student_id"].map(consec_max_track)
    
    # Warnings count: 0 if attendance >= 85, 1 if 75-85, 2 if 60-75, 3 if < 60
    warnings_map = {}
    for sid, rate in student_rates.items():
        if rate >= 85:
            warnings_map[sid] = 0
        elif rate >= 75:
            warnings_map[sid] = 1
        elif rate >= 60:
            warnings_map[sid] = 2
        else:
            warnings_map[sid] = 3
    df_records["warnings_issued"] = df_records["student_id"].map(warnings_map)
    df_records["num_warnings"] = df_records["warnings_issued"]
    
    # Medical leaves (Poisson count)
    np.random.seed(42)  # Reset for reproducibility
    med_leaves_map = {sid: int(np.random.poisson(1.2)) for sid in student_rates}
    df_records["num_medical_leaves"] = df_records["student_id"].map(med_leaves_map)
    
    # Risk level target
    risk_level_map = {}
    for sid, rate in student_rates.items():
        if rate >= 85:
            risk_level_map[sid] = "low"
        elif rate >= 75:
            risk_level_map[sid] = "medium"
        elif rate >= 60:
            risk_level_map[sid] = "high"
        else:
            risk_level_map[sid] = "critical"
    df_records["risk_level"] = df_records["student_id"].map(risk_level_map)
    df_records["current_percentage"] = df_records["previous_rate"] # running pct is previous_rate
    
    # Previous semester rate: final rate + noise
    prev_sem_rate_map = {sid: float(np.clip(rate + np.random.normal(0.5, 4.0), 30.0, 100.0)) for sid, rate in student_rates.items()}
    df_records["previous_semester_rate"] = df_records["student_id"].map(prev_sem_rate_map)
    
    # Target: dropped_out
    # Dropout occurs if attendance is < 65 and CGPA < 5.5 and student has warnings / family issues
    dropout_map = {}
    for sid in student_rates:
        rate = student_rates[sid]
        s_row = df_students.loc[df_students["student_id"] == sid].iloc[0]
        prob_drop = 0.02
        if rate < 65:
            prob_drop += 0.35
        if s_row["cgpa"] < 5.5:
            prob_drop += 0.30
        if s_row["family_issues"] == 1:
            prob_drop += 0.15
        if s_row["previous_dropout_attempt"] == 1:
            prob_drop += 0.20
        dropout_map[sid] = int(np.random.rand() < prob_drop)
        
    df_records["dropped_out"] = df_records["student_id"].map(dropout_map)

    # Save to disk
    df_records.to_csv(output_path, index=False)
    logger.info("Successfully generated sample dataset containing %d rows and saved to %s", len(df_records), output_path)


if __name__ == "__main__":
    out_dir = Path(__file__).resolve().parent
    out_dir.mkdir(parents=True, exist_ok=True)
    generate_data(out_dir / "attendance_data.csv")
