from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, DoctorProfileViewSet, PatientProfileViewSet,
    AppointmentViewSet, PrescriptionViewSet, MedicalReportViewSet,
    PaymentViewSet, SymptomLogViewSet, NotificationViewSet,
    PredictDiseaseView, PredictHealthRiskView, SymptomsListView,
    PrescribedMedicineViewSet, MedicationScheduleViewSet,
    HealthMetricViewSet, ChatMessageViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'doctors', DoctorProfileViewSet)
router.register(r'patients', PatientProfileViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'prescriptions', PrescriptionViewSet)
router.register(r'reports', MedicalReportViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'symptom-logs', SymptomLogViewSet)
router.register(r'notifications', NotificationViewSet)
router.register(r'prescribed-medicines', PrescribedMedicineViewSet)
router.register(r'medication-schedules', MedicationScheduleViewSet)
router.register(r'health-metrics', HealthMetricViewSet)
router.register(r'chat-messages', ChatMessageViewSet)



urlpatterns = [
    path('', include(router.urls)),
    path('symptoms/', SymptomsListView.as_view(), name='symptoms-list'),
    path('predict/disease/', PredictDiseaseView.as_view(), name='predict-disease'),
    path('predict/health-risk/', PredictHealthRiskView.as_view(), name='predict-health-risk'),
]

