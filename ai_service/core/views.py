import datetime
from django.db.models import Q
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import (
    User, DoctorProfile, PatientProfile, Appointment, 
    Prescription, MedicalReport, Payment, SymptomLog, Notification,
    PrescribedMedicine, MedicationSchedule, HealthMetric, ChatMessage
)
from .serializers import (
    UserSerializer, DoctorProfileSerializer, PatientProfileSerializer, 
    AppointmentSerializer, PrescriptionSerializer, MedicalReportSerializer, 
    PaymentSerializer, SymptomLogSerializer, NotificationSerializer,
    PrescribedMedicineSerializer, MedicationScheduleSerializer,
    HealthMetricSerializer, ChatMessageSerializer
)

from .ml_engine import predict_disease, predict_health_risk_trend, analyze_medical_report


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def login_check(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email)
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class DoctorProfileViewSet(viewsets.ModelViewSet):
    queryset = DoctorProfile.objects.all()
    serializer_class = DoctorProfileSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        # specialization, location, experience, etc.
        specialization = request.query_params.get('specialization')
        location = request.query_params.get('location')
        queryset = self.queryset
        if specialization:
            queryset = queryset.filter(specialization__icontains=specialization)
        if location:
            queryset = queryset.filter(location__icontains=location)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class PatientProfileViewSet(viewsets.ModelViewSet):
    queryset = PatientProfile.objects.all()
    serializer_class = PatientProfileSerializer

    def perform_update(self, serializer):
        profile = serializer.save()
        
        doctor = None
        med = PrescribedMedicine.objects.filter(patient=profile).first()
        if med:
            doctor = med.doctor
        else:
            appt = Appointment.objects.filter(patient=profile).first()
            if appt:
                doctor = appt.doctor
        
        if doctor:
            msg = f"[Emergency Info Updated] Patient {profile.user.username} has updated emergency info: Allergies: {profile.allergies}, Emergency Contact: {profile.emergency_contact}, Blood Group: {profile.blood_group}."
            Notification.objects.create(
                user=doctor.user,
                message=msg,
                type='clinical_alert'
            )

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    @action(detail=False, methods=['get'])
    def slots(self, request):
        doctor_id = request.query_params.get('doctor')
        date = request.query_params.get('date')
        if not doctor_id or not date:
            return Response({'error': 'Doctor and date parameters required'}, status=400)
        
        doctor = get_object_or_404(DoctorProfile, id=doctor_id)
        is_leave = False
        if doctor.leaves and date in doctor.leaves:
            is_leave = True
        
        # Get existing appointments for that doctor on that date
        booked_appointments = Appointment.objects.filter(doctor_id=doctor_id, date=date, status__in=['Pending', 'Approved', 'Completed'])
        booked_slots = [a.time_slot.strftime('%H:%M') for a in booked_appointments]
        return Response({'is_leave': is_leave, 'booked_slots': booked_slots})

def generate_medication_schedules(medicine, start_date, end_date):
    freq_times = {
        'Once Daily': ['09:00:00'],
        'Twice Daily': ['09:00:00', '21:00:00'],
        'Three Times Daily': ['09:00:00', '14:00:00', '21:00:00'],
        'Every 6 Hours': ['00:00:00', '06:00:00', '12:00:00', '18:00:00'],
        'Every 8 Hours': ['06:00:00', '14:00:00', '22:00:00'],
        'Every 12 Hours': ['08:00:00', '20:00:00'],
    }
    times = freq_times.get(medicine.frequency, ['09:00:00'])
    current_date = start_date
    delta = datetime.timedelta(days=1)
    schedules_to_create = []
    while current_date <= end_date:
        for t_str in times:
            t = datetime.datetime.strptime(t_str, '%H:%M:%S').time()
            schedules_to_create.append(
                MedicationSchedule(
                    medicine=medicine,
                    scheduled_date=current_date,
                    scheduled_time=t,
                    status='Pending'
                )
            )
        current_date += delta
    MedicationSchedule.objects.bulk_create(schedules_to_create)

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer

    def perform_create(self, serializer):
        prescription = serializer.save()
        medicines_list = prescription.medicines
        if isinstance(medicines_list, list):
            for med_data in medicines_list:
                try:
                    start_date = datetime.date.today()
                    duration_str = str(med_data.get('duration', '7 Days')).lower()
                    duration_days = 7
                    if 'day' in duration_str:
                        duration_days = int(''.join(filter(str.isdigit, duration_str)) or 7)
                    elif 'month' in duration_str:
                        months = int(''.join(filter(str.isdigit, duration_str)) or 1)
                        duration_days = months * 30
                    elif 'week' in duration_str:
                        weeks = int(''.join(filter(str.isdigit, duration_str)) or 1)
                        duration_days = weeks * 7
                    else:
                        try:
                            duration_days = int(duration_str)
                        except ValueError:
                            duration_days = 7
                    end_date = start_date + datetime.timedelta(days=duration_days - 1)
                    patient = prescription.appointment.patient
                    doctor = prescription.appointment.doctor
                    prescribed_med = PrescribedMedicine.objects.create(
                        patient=patient,
                        doctor=doctor,
                        prescription=prescription,
                        name=med_data.get('name', ''),
                        strength=med_data.get('strength', ''),
                        dosage=med_data.get('dosage', ''),
                        frequency=med_data.get('frequency', 'Once Daily'),
                        duration=duration_days,
                        instructions=med_data.get('instructions', ''),
                        meal_timing=med_data.get('meal_timing', 'Any Time'),
                        start_date=start_date,
                        end_date=end_date,
                        status='Active'
                    )
                    generate_medication_schedules(prescribed_med, start_date, end_date)
                except Exception as e:
                    print(f"Error generating schedule: {e}")

class PrescribedMedicineViewSet(viewsets.ModelViewSet):
    queryset = PrescribedMedicine.objects.all()
    serializer_class = PrescribedMedicineSerializer

    def get_queryset(self):
        queryset = self.queryset
        patient_id = self.request.query_params.get('patient')
        doctor_id = self.request.query_params.get('doctor')
        status = self.request.query_params.get('status')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    @action(detail=True, methods=['post'], url_path='stop')
    def stop_medication(self, request, pk=None):
        medicine = self.get_object()
        med_id = medicine.id
        med_name = medicine.name
        if medicine.prescription and isinstance(medicine.prescription.medicines, list):
            medicine.prescription.medicines = [m for m in medicine.prescription.medicines if m.get('name') != med_name]
            medicine.prescription.save()
        medicine.delete()
        return Response({'message': 'Medication stopped and deleted from database successfully', 'id': med_id})

    @action(detail=True, methods=['post'], url_path='extend')
    def extend_medication(self, request, pk=None):
        medicine = self.get_object()
        days = int(request.data.get('days', 0))
        if days <= 0:
            return Response({'error': 'Days must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)
        original_end_date = medicine.end_date
        new_end_date = original_end_date + datetime.timedelta(days=days)
        medicine.duration = int(medicine.duration) + days
        medicine.end_date = new_end_date
        medicine.status = 'Active'
        medicine.save()
        if medicine.prescription and isinstance(medicine.prescription.medicines, list):
            for m in medicine.prescription.medicines:
                if m.get('name') == medicine.name:
                    m['duration'] = f"{medicine.duration} Days"
            medicine.prescription.save()
        generate_medication_schedules(medicine, original_end_date + datetime.timedelta(days=1), new_end_date)
        return Response({
            'message': f'Medication extended by {days} days',
            'new_end_date': new_end_date.strftime('%Y-%m-%d'),
            'duration': medicine.duration
        })

    @action(detail=False, methods=['get'])
    def adherence_report(self, request):
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response({'error': 'patient query parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        medicines = PrescribedMedicine.objects.filter(patient_id=patient_id)
        total_doses = 0
        taken_doses = 0
        missed_doses = 0
        skipped_doses = 0
        pending_doses = 0
        for med in medicines:
            total_doses += med.schedules.count()
            taken_doses += med.schedules.filter(status='Taken').count()
            missed_doses += med.schedules.filter(status='Missed').count()
            skipped_doses += med.schedules.filter(status='Skipped').count()
            pending_doses += med.schedules.filter(status='Pending').count()
        adherence_percentage = 100.0
        if total_doses > 0:
            relevant_doses = taken_doses + missed_doses + skipped_doses
            if relevant_doses > 0:
                adherence_percentage = round((taken_doses / relevant_doses) * 100, 1)
            else:
                adherence_percentage = 100.0
        adherence_label = 'Excellent'
        if adherence_percentage < 50.0:
            adherence_label = 'Needs Improvement'
        elif adherence_percentage < 85.0:
            adherence_label = 'Good'
        return Response({
            'total_scheduled_doses': total_doses,
            'taken_doses': taken_doses,
            'missed_doses': missed_doses,
            'skipped_doses': skipped_doses,
            'pending_doses': pending_doses,
            'adherence_percentage': adherence_percentage,
            'adherence_label': adherence_label
        })

class MedicationScheduleViewSet(viewsets.ModelViewSet):
    queryset = MedicationSchedule.objects.all()
    serializer_class = MedicationScheduleSerializer

    def get_queryset(self):
        queryset = self.queryset
        patient_id = self.request.query_params.get('patient')
        date = self.request.query_params.get('date')
        if patient_id:
            queryset = queryset.filter(medicine__patient_id=patient_id)
        if date:
            queryset = queryset.filter(scheduled_date=date)
        return queryset

    @action(detail=True, methods=['post'], url_path='take')
    def mark_taken(self, request, pk=None):
        schedule = self.get_object()
        schedule.status = 'Taken'
        schedule.taken_at = datetime.datetime.now()
        schedule.save()
        
        # Trigger clinical alert check
        try:
            check_patient_adherence_alerts(schedule.medicine.patient, schedule.medicine.doctor)
        except Exception as e:
            print("Adherence check failed:", e)

        return Response(self.get_serializer(schedule).data)

    @action(detail=True, methods=['post'], url_path='undo')
    def undo_taken(self, request, pk=None):
        schedule = self.get_object()
        schedule.status = 'Pending'
        schedule.taken_at = None
        schedule.save()
        
        try:
            check_patient_adherence_alerts(schedule.medicine.patient, schedule.medicine.doctor)
        except Exception as e:
            print("Adherence check failed:", e)

        return Response(self.get_serializer(schedule).data)

class MedicalReportViewSet(viewsets.ModelViewSet):
    queryset = MedicalReport.objects.all()
    serializer_class = MedicalReportSerializer

    @action(detail=True, methods=['post'])
    def process_ocr(self, request, pk=None):
        report = self.get_object()
        file_path = report.file_url # Assume absolute path or relative path accessible on disk
        # Call OCR analyzer
        analysis = analyze_medical_report(file_path)
        report.ocr_results = analysis['ocr_results']
        report.summary = analysis['summary']
        report.doctor_summary = analysis['doctor_summary']
        report.explanation = analysis['explanation']
        report.recommendations = analysis['recommendations']
        report.save()
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

class SymptomLogViewSet(viewsets.ModelViewSet):
    queryset = SymptomLog.objects.all()
    serializer_class = SymptomLogSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer



def check_patient_adherence_alerts(patient, doctor):
    medicines = PrescribedMedicine.objects.filter(patient=patient)
    total_doses = 0
    taken_doses = 0
    missed_doses = 0
    skipped_doses = 0
    for med in medicines:
        total_doses += med.schedules.count()
        taken_doses += med.schedules.filter(status='Taken').count()
        missed_doses += med.schedules.filter(status='Missed').count()
        skipped_doses += med.schedules.filter(status='Skipped').count()
    
    adherence_percentage = 100.0
    relevant_doses = taken_doses + missed_doses + skipped_doses
    if relevant_doses > 0:
        adherence_percentage = round((taken_doses / relevant_doses) * 100, 1)

    schedules = MedicationSchedule.objects.filter(medicine__patient=patient).order_by('-scheduled_date')[:5]
    consecutive_missed = 0
    for s in schedules:
        if s.status in ['Missed', 'Skipped']:
            consecutive_missed += 1
        elif s.status == 'Taken':
            break

    if (adherence_percentage < 80.0 and relevant_doses >= 5) or consecutive_missed >= 3:
        msg = f"[Clinical Concern] Patient {patient.user.username} has low medication adherence ({adherence_percentage}%). Missed doses: {consecutive_missed} consecutive."
        exists = Notification.objects.filter(user=doctor.user, message__contains=f"Patient {patient.user.username} has low medication adherence").exists()
        if not exists:
            Notification.objects.create(
                user=doctor.user,
                message=msg,
                type='clinical_alert'
            )

class HealthMetricViewSet(viewsets.ModelViewSet):
    queryset = HealthMetric.objects.all()
    serializer_class = HealthMetricSerializer

    def get_queryset(self):
        queryset = self.queryset
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset.order_by('date')

    def perform_create(self, serializer):
        metric = serializer.save()
        patient = metric.patient
        
        doctor = None
        # Find doctor from active prescribed medicines or appointments
        med = PrescribedMedicine.objects.filter(patient=patient).first()
        if med:
            doctor = med.doctor
        else:
            appt = Appointment.objects.filter(patient=patient).first()
            if appt:
                doctor = appt.doctor
        
        if doctor:
            warning_messages = []
            if metric.blood_sugar and metric.blood_sugar > 140:
                warning_messages.append(f"Elevated blood sugar ({metric.blood_sugar} mg/dL)")
            if metric.systolic and metric.systolic > 140:
                warning_messages.append(f"Elevated blood pressure ({metric.systolic}/{metric.diastolic} mmHg)")
            
            if warning_messages:
                msg = f"[Clinical Warning] Patient {patient.user.username} logged abnormal metrics: {', '.join(warning_messages)}."
                Notification.objects.create(
                    user=doctor.user,
                    message=msg,
                    type='clinical_alert'
                )

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        queryset = self.queryset
        user_id = self.request.query_params.get('user')
        partner_id = self.request.query_params.get('partner')
        if user_id and partner_id:
            queryset = queryset.filter(
                Q(sender_id=user_id, receiver_id=partner_id) |
                Q(sender_id=partner_id, receiver_id=user_id)
            )
        return queryset.order_by('created_at')

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        sender_id = request.data.get('sender')
        receiver_id = request.data.get('receiver')
        if sender_id and receiver_id:
            ChatMessage.objects.filter(sender_id=sender_id, receiver_id=receiver_id, is_read=False).update(is_read=True)
            return Response({'status': 'messages marked read'})
        return Response({'error': 'sender and receiver required'}, status=status.HTTP_400_BAD_REQUEST)

class PredictDiseaseView(views.APIView):
    def post(self, request):
        symptoms = request.data.get('symptoms', [])
        prediction = predict_disease(symptoms)
        return Response(prediction)

class PredictHealthRiskView(views.APIView):
    def post(self, request):
        history = request.data.get('history', [])
        prediction = predict_health_risk_trend(history)
        return Response(prediction)

class SymptomsListView(views.APIView):
    def get(self, request):
        from .ml_engine import SYMPTOMS
        return Response(SYMPTOMS)

