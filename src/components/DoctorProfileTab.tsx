import React, { useState } from "react";
import { User as UserIcon, Phone, Clipboard, CheckCircle, Award, Building, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../AuthContext";
import { User } from "../types";

interface DoctorProfileTabProps {
  user: User;
}

const DOCTOR_AVATARS = [
  { id: "doc-f1", url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Female Doctor 1" },
  { id: "doc-m1", url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Male Doctor 1" },
  { id: "doc-f2", url: "https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Female Doctor 2" },
  { id: "doc-m2", url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Male Doctor 2" },
];

export default function DoctorProfileTab({ user }: DoctorProfileTabProps) {
  const { updateProfile } = useAuth();

  // Clinician Profile Editable States
  const [name, setName] = useState(user.name || "");
  const [specialty, setSpecialty] = useState(user.specialty || "Clinical Dermatology");
  const [clinicName, setClinicName] = useState(user.clinicName || "DermShield Central Hospital");
  const [phone, setPhone] = useState(user.phone || "");
  const [medicalLicense, setMedicalLicense] = useState(user.medicalLicense || "");
  const [age, setAge] = useState(user.age?.toString() || "38");
  const [gender, setGender] = useState(user.gender || "Female");
  const [dob, setDob] = useState(user.dob || "1988-04-12");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || DOCTOR_AVATARS[0].url);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        specialty,
        clinicName,
        phone,
        medicalLicense,
        age: parseInt(age) || undefined,
        gender,
        dob,
        avatarUrl
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const specialities = [
    "Clinical Dermatology",
    "Oncological Dermatology",
    "Mohs Micrographic Surgery",
    "Pediatric Dermatology",
    "Cosmetic & Laser Dermatology",
    "Pathological Cutaneous Analysis"
  ];

  return (
    <div className="space-y-6" id="doctor-profile-form-container">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-teal-600" />
            My Clinician & Licensing Profile Settings
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Configure clinical specialties, medical board licensing codes, consulting department parameters, and triage contacts.
          </p>
        </div>

        <form onSubmit={handleSubmitProfile} className="p-6 sm:p-8 space-y-8">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Dermatologist Clinician Credentials updated and verified securely in our active registry!</span>
            </div>
          )}

          {/* Avatar Picker Section */}
          <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-teal-600" />
              Select Clinician Identity Avatar
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <img 
                  src={avatarUrl} 
                  alt="Current Avatar" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-teal-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 bg-teal-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                  Verified
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-[10px] text-slate-500 block">Choose an official professional photograph for verification badges:</span>
                <div className="flex flex-wrap gap-2.5">
                  {DOCTOR_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? "border-teal-600 scale-110 shadow-sm" 
                            : "border-transparent hover:border-slate-300 hover:scale-105"
                        }`}
                        title={preset.label}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.label} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Grid section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinician Profile details */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                1. Professional Credentials
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clinician Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Medical Board License ID</label>
                <input
                  type="text"
                  placeholder="E.g., LIC-8293-Derm"
                  value={medicalLicense}
                  onChange={(e) => setMedicalLicense(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialty Board Designation</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {specialities.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date of Birth (DOB)</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
            </div>

            {/* Department & Contact details */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" />
                2. Department & Communication
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Affiliated Clinic / Hospital</label>
                <input
                  type="text"
                  placeholder="E.g., Mayo Clinic, Oncology Ward"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Clinic Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 103-9248"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              {isSaving ? "Verifying board registry..." : "Save Professional Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
