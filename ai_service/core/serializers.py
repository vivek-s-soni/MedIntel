from rest_framework import serializers
from .models import (
    User, DoctorProfile, PatientProfile, Appointment, 
    Prescription, MedicalReport, Payment, SymptomLog, Notification,
    PrescribedMedicine, MedicationSchedule, HealthMetric, ChatMessage
)

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = '__all__'

class DoctorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = DoctorProfile
        fields = '__all__'

class PatientProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = PatientProfile
        fields = '__all__'

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)
    patient_user_id = serializers.IntegerField(source='patient.user.id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.username', read_only=True)
    doctor_user_id = serializers.IntegerField(source='doctor.user.id', read_only=True)
    specialization = serializers.CharField(source='doctor.specialization', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='appointment.patient.user.username', read_only=True)
    doctor_name = serializers.CharField(source='appointment.doctor.user.username', read_only=True)

    class Meta:
        model = Prescription
        fields = '__all__'

class MedicalReportSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.username', default='', read_only=True)

    class Meta:
        model = MedicalReport
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='appointment.patient.user.username', read_only=True)
    doctor_name = serializers.CharField(source='appointment.doctor.user.username', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

class SymptomLogSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)

    class Meta:
        model = SymptomLog
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class MedicationScheduleSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.name', read_only=True)

    class Meta:
        model = MedicationSchedule
        fields = '__all__'

class PrescribedMedicineSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.username', read_only=True)
    schedules = MedicationScheduleSerializer(many=True, read_only=True)
    adherence_percentage = serializers.SerializerMethodField()

    class Meta:
        model = PrescribedMedicine
        fields = '__all__'

    def get_adherence_percentage(self, obj):
        total = obj.schedules.count()
        if total == 0:
            return 100.0
        taken = obj.schedules.filter(status='Taken').count()
        return round((taken / total) * 100, 1)

class HealthMetricSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.username', read_only=True)

    class Meta:
        model = HealthMetric
        fields = '__all__'

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    receiver_name = serializers.CharField(source='receiver.username', read_only=True)

    class Meta:
        model = ChatMessage
        fields = '__all__'

