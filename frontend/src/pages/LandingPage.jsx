import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Stethoscope, FileClock, Shield, Activity, ArrowRight, BrainCircuit } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchSpec, setSearchSpec] = useState('');
  const [searchLoc, setSearchLoc] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/patient/search?specialization=${searchSpec}&location=${searchLoc}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md sticky top-0 bg-white/70 dark:bg-slate-900/70 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
            MedIntel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="text-sm font-bold bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl transition-all shadow-md shadow-primary-500/10"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center py-20 px-6 max-w-6xl mx-auto relative z-10 text-center">
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary-400/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl -z-10"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/40 text-primary-700 dark:text-primary-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-bounce">
          <BrainCircuit className="w-4 h-4" /> Next-Gen AI Healthcare Assistant
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight max-w-4xl">
          Complete Smart Health Management Platform Powered by <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">AI & ML</span>
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 text-lg sm:text-xl mt-6 max-w-3xl">
          MedIntel unites patients, certified doctors, and intelligent diagnostics in a secure ecosystem. 
          Predict health risks, transcribe medical reports using OCR, and schedule slots seamlessly.
        </p>

        {/* Doctor Search Widget */}
        <form onSubmit={handleSearch} className="w-full max-w-3xl mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl sm:rounded-full shadow-lg flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center px-4 gap-2 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800 pb-3 sm:pb-0">
            <Stethoscope className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by specialization (e.g. Cardiologist)..." 
              value={searchSpec}
              onChange={(e) => setSearchSpec(e.target.value)}
              className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex-1 flex items-center px-4 gap-2 pb-3 sm:pb-0">
            <span className="text-slate-400 font-bold text-sm">@</span>
            <input 
              type="text" 
              placeholder="City location (e.g. New York)..." 
              value={searchLoc}
              onChange={(e) => setSearchLoc(e.target.value)}
              className="w-full bg-transparent border-0 focus:ring-0 text-sm focus:outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
          <button 
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl sm:rounded-full shadow-md shadow-primary-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            Find Doctor <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full mt-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-8 rounded-3xl text-left hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-6">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">AI Disease Prediction</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Log symptoms, BP, glucose, and family history. Our Random Forest and KNN models diagnose potential risks with confidence reports.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-8 rounded-3xl text-left hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
              <FileClock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Report OCR Scan</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Upload blood chemistry PDFs or scans. MedIntel OCR parses hemoglobin, WBC, RBC, platelets, vitamins and flags health anomalies.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-8 rounded-3xl text-left hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Certified & Secure</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Role-based authorization and end-to-end audit pathways secure medical files. Only uploader, concerned patient, and admin can access reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">
        <p>© {new Date().getFullYear()} MedIntel Healthcare Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
