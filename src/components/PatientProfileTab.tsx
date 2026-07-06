import React, { useState } from "react";
import { User as UserIcon, Phone, Heart, FileText, CheckCircle, ShieldAlert, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../AuthContext";
import { User } from "../types";

interface PatientProfileTabProps {
  user: User;
}

const AVATAR_PRESETS = [
  { id: "patient-m1", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Male Style 1" },
  { id: "patient-f1", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Female Style 1" },
  { id: "patient-m2", url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Male Style 2" },
  { id: "patient-f2", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Female Style 2" },
  { id: "patient-m3", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Male Style 3" },
  { id: "patient-f3", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80", label: "Female Style 3" },
];

export default function PatientProfileTab({ user }: PatientProfileTabProps) {
  const { updateProfile } = useAuth();
  
  // Profile Editable States
  const [name, setName] = useState(user.name || "");
  const [age, setAge] = useState(user.age?.toString() || "24");
  const [gender, setGender] = useState(user.gender || "Male");
  const [dob, setDob] = useState(user.dob || "2002-07-30");
  const [phone, setPhone] = useState(user.phone || "");
  const [emergencyContact, setEmergencyContact] = useState(user.emergencyContact || "");
  const [medicalHistory, setMedicalHistory] = useState(user.medicalHistory || "");
  const [skinType, setSkinType] = useState<string>("type3"); // default to Fitzpatrick type III
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || AVATAR_PRESETS[0].url);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        age: parseInt(age) || undefined,
        gender,
        dob,
        phone,
        emergencyContact,
        medicalHistory,
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

  const fitzpatrickScales = [
    { value: "type1", label: "Type I (Highly sensitive, always burns, never tans)" },
    { value: "type2", label: "Type II (Very sensitive, burns easily, tans minimally)" },
    { value: "type3", label: "Type III (Sensitive, burns moderately, tans gradually)" },
    { value: "type4", label: "Type IV (Moderately sensitive, burns minimally, tans well)" },
    { value: "type5", label: "Type V (Minimal sensitivity, rarely burns, tans deeply)" },
    { value: "type6", label: "Type VI (Not sensitive, never burns, deeply pigmented)" }
  ];

  return (
    <div className="space-y-6" id="patient-profile-form-container">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-teal-600" />
            My Personal & Clinical Profile Settings
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Configure emergency points of contact, age, biological sex, and Fitzpatrick skin phototype vectors to calibrate explainable AI models.
          </p>
        </div>

        <form onSubmit={handleSubmitProfile} className="p-6 sm:p-8 space-y-8">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Dermal Clinical Profile updated and synchronized securely in cloud vault database logs!</span>
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
                  Active
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-[10px] text-slate-500 block">Choose an illustrative profile photograph placeholder below:</span>
                <div className="flex flex-wrap gap-2.5">
                  {AVATAR_PRESETS.map((preset) => {
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
            {/* Left Block: Demographics */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                1. Basic Demographics
              </h4>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email (Immutable Credentials)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Biological Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Non-binary</option>
                  </select>
                </div>
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

            {/* Right Block: Communication & Emergency */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                2. Contact & Clinical Emergency
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Emergency Contact Person & Phone</label>
                <input
                  type="text"
                  placeholder="E.g., Sarah Kansal (Spouse) - +1 (555) 012-3456"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fitzpatrick Skin Phototype (Model Calibration)</label>
                <select
                  value={skinType}
                  onChange={(e) => setSkinType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {fitzpatrickScales.map(scale => (
                    <option key={scale.value} value={scale.value}>{scale.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dermal Medical History */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              3. Historic Pathology & Clinical Medical Context
            </h4>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Personal or Family History of Cutaneous Lesions</label>
              <textarea
                rows={3}
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="Detail history of melanoma, atypical nevi, organ transplants, high UV exposure, or regular biopsies."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              {isSaving ? "Synchronizing secure records..." : "Save Profile Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
