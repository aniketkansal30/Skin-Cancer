import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { User, UserRole } from "./types";

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    medicalLicense?: string
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapProfile = (data: any): User => ({
  id: data.id,
  email: data.email,
  role: data.role,
  name: data.name,
  medicalLicense: data.medical_license || undefined,
  isVerified: data.is_verified || false,
  registrationDate: data.registration_date,
  age: data.age ?? undefined,
  gender: data.gender ?? undefined,
  phone: data.phone ?? undefined,
  emergencyContact: data.emergency_contact ?? undefined,
  medicalHistory: data.medical_history ?? undefined,
  specialty: data.specialty ?? undefined,
  clinicName: data.clinic_name ?? undefined,
  dob: data.dob ?? undefined,
  avatarUrl: data.avatar_url ?? undefined
});

// The profile row is created by a DB trigger on signup, so retry briefly if it isn't visible yet.
const fetchProfile = async (userId: string, retries = 2): Promise<User | null> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data && !error) return mapProfile(data);
    if (attempt < retries) await new Promise((r) => setTimeout(r, 600));
    else console.error("Failed to fetch profile", error);
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // onAuthStateChange also fires INITIAL_SESSION on mount, so no separate getSession() needed.
    const { data: listener } = supabase.auth.onAuthStateChange((event: string, newSession: Session | null) => {
      setSession(newSession);

      if (!newSession?.user) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // Hourly token refresh doesn't change the profile - skip the refetch.
      if (event === "TOKEN_REFRESHED") return;

      // Never await other supabase calls directly inside this callback (can deadlock) - defer it.
      setTimeout(async () => {
        const profile = await fetchProfile(newSession.user.id);
        if (!active) return;
        setCurrentUser(profile);
        setLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    medicalLicense?: string
  ) => {
    // Admin accounts are never self-registered - promote them manually in Supabase.
    const safeRole: UserRole = role === "doctor" ? "doctor" : "patient";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        // Both key spellings are sent so whichever one your handle_new_user() trigger reads will work.
        data: {
          name,
          role: safeRole,
          medicalLicense: medicalLicense || null,
          medical_license: medicalLicense || null
        }
      }
    });

    if (error) return { error: error.message };
    if (!data.user) return { error: "Signup failed. Please try again." };

    // With email confirmation ON, Supabase returns a fake user (no identities) for an existing email.
    if (data.user.identities && data.user.identities.length === 0) {
      return { error: "This email is already registered. Please log in instead." };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;

    // Explicit whitelist -> snake_case. role / is_verified are deliberately NOT editable from the client.
    const dbUpdates: Record<string, any> = {
      name: updates.name,
      age: updates.age,
      gender: updates.gender,
      dob: updates.dob === "" ? null : updates.dob,
      phone: updates.phone,
      emergency_contact: updates.emergencyContact,
      medical_history: updates.medicalHistory,
      specialty: updates.specialty,
      clinic_name: updates.clinicName,
      medical_license: updates.medicalLicense,
      avatar_url: updates.avatarUrl
    };

    Object.keys(dbUpdates).forEach((key) => {
      if (dbUpdates[key] === undefined) delete dbUpdates[key];
    });

    const { error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", currentUser.id);

    if (error) {
      console.error("Failed to update profile", error);
      throw new Error(error.message);
    }

    const profile = await fetchProfile(currentUser.id, 0);
    if (profile) setCurrentUser(profile);
  };

  return (
    <AuthContext.Provider value={{ currentUser, session, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
