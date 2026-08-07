from django.db import models

class User(models.Model):
    ROLE_CHOICES = (
        ('Admin', 'Admin'),
        ('Doctor', 'Doctor'),
        ('Patient', 'Patient'),
    )
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=255, blank=True, null=True)
    reset_token = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialization = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    experience = models.IntegerField(default=0)
    qualification = models.CharField(max_length=255)
    clinic_address = models.TextField()
    contact_number = models.CharField(max_length=20)
    google_maps_link = models.URLField(max_length=500, blank=True, null=True)
    working_hours_start = models.TimeField(default="09:00:00")
    working_hours_end = models.TimeField(default="17:00:00")
    is_verified = models.BooleanField(default=False)  # Verified by Admin
    leaves = models.JSONField(default=list, blank=True, null=True)  # List of blocked dates (YYYY-MM-DD)

    def __str__(self):
        return f"Dr. {self.user.username} - {self.specialization}"

class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    emergency_contact = models.CharField(max_length=20, blank=True, null=True)
    medical_history_summary = models.TextField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True, default="None")

    def __str__(self):
        return self.user.username

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    )
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField()
    time_slot = models.TimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Pending')
    payment_status = models.CharField(max_length=15, default='Pending')  # Pending, Paid, Failed
    payment_method = models.CharField(max_length=20, blank=True, null=True)  # UPI, Card, Hospital
    chief_complaint = models.TextField(blank=True, null=True)
    not_visited = models.BooleanField(default=False) # true if patient missed appointment

    def __str__(self):
        return f"{self.patient.user.username} with {self.doctor.user.username} on {self.date} at {self.time_slot}"

class Prescription(models.Model):
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='prescription')
    symptoms = models.TextField()
    medicines = models.JSONField(default=list)  # List of dicts: {name, dosage, instructions}
    pdf_url = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class MedicalReport(models.Model):
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='reports')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_reports')
    title = models.CharField(max_length=255)
    file_url = models.CharField(max_length=500)
    ocr_results = models.JSONField(default=dict)  # Extracted metrics
    summary = models.TextField(blank=True, null=True)
    doctor_summary = models.TextField(blank=True, null=True)
    explanation = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Payment(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Success', 'Success'),
        ('Failed', 'Failed'),
    )
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20)  # Cash, UPI, Card
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Pending')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class SymptomLog(models.Model):
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='symptom_logs')
    symptoms = models.JSONField(default=list)
    age = models.IntegerField(default=30)
    gender = models.CharField(max_length=10, default='Male')
    bp = models.CharField(max_length=20, default='Normal')
    sugar = models.CharField(max_length=20, default='Normal')
    bmi = models.FloatField(default=22.0)
    family_history = models.CharField(max_length=10, default='No')
    lifestyle = models.CharField(max_length=50, default='Active')
    date = models.DateField(auto_now_add=True)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    type = models.CharField(max_length=50, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class PrescribedMedicine(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Completed', 'Completed'),
        ('Expired', 'Expired'),
        ('Cancelled', 'Cancelled'),
    )
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='prescribed_medicines')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='prescribed_medicines')
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, null=True, blank=True, related_name='prescribed_medicines')
    name = models.CharField(max_length=255)
    strength = models.CharField(max_length=100, blank=True, null=True)
    dosage = models.CharField(max_length=100) # e.g. "1-0-1"
    frequency = models.CharField(max_length=100) # e.g. "Once Daily", "Twice Daily", etc.
    duration = models.IntegerField(default=7) # Duration in days
    instructions = models.TextField(blank=True, null=True)
    meal_timing = models.CharField(max_length=50, default='Any Time') # Before Food, After Food, Any Time
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} for {self.patient.user.username}"

class MedicationSchedule(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Taken', 'Taken'),
        ('Missed', 'Missed'),
        ('Skipped', 'Skipped'),
    )
    medicine = models.ForeignKey(PrescribedMedicine, on_delete=models.CASCADE, related_name='schedules')
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Pending')
    taken_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.medicine.name} dose on {self.scheduled_date} at {self.scheduled_time}"

class HealthMetric(models.Model):
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='health_metrics')
    date = models.DateField(auto_now_add=True)
    weight = models.FloatField(help_text="Weight in kg", null=True, blank=True)
    systolic = models.IntegerField(help_text="Systolic BP", null=True, blank=True)
    diastolic = models.IntegerField(help_text="Diastolic BP", null=True, blank=True)
    blood_sugar = models.IntegerField(help_text="Blood Sugar in mg/dL", null=True, blank=True)
    heart_rate = models.IntegerField(help_text="Heart Rate in bpm", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Metrics for {self.patient.user.username} on {self.date}"

class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField(blank=True, null=True)
    image_url = models.CharField(max_length=500, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username} at {self.created_at}"


