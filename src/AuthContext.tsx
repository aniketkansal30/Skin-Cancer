import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { User, UserRole } from "./types";

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the profile row (name, role, etc.) linked to the auth user
  const fetchProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("Failed to fetch profile", error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      name: data.name,
      medicalLicense: data.medical_license || undefined,
      isVerified: data.is_verified || false,
      registrationDate: data.registration_date,
      age: data.age,
      gender: data.gender,
      phone: data.phone,
      emergencyContact: data.emergency_contact,
      medicalHistory: data.medical_history,
      specialty: data.specialty,
      clinicName: data.clinic_name,
      dob: data.dob,
      avatarUrl: data.avatar_url
    };
  };

  useEffect(() => {
    // Load existing session on first mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setCurrentUser(profile);
      }
      setLoading(false);
    });

    // Listen for login/logout/token-refresh events
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role } // picked up by the handle_new_user() trigger in Supabase
      }
    });

    if (error) return { error: error.message };
    if (!data.user) return { error: "Signup failed. Please try again." };

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
    
    // Map properties to match profiles snake_case keys in DB if needed
    const dbUpdates: any = {
      ...updates,
      medical_license: updates.medicalLicense,
      is_verified: updates.isVerified,
      emergency_contact: updates.emergencyContact,
      medical_history: updates.medicalHistory,
      clinic_name: updates.clinicName,
      avatar_url: updates.avatarUrl
    };
    
    // Clean undefined keys
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });

    const { error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", currentUser.id);

    if (!error) {
      const profile = await fetchProfile(currentUser.id);
      setCurrentUser(profile);
    } else {
      console.error("Failed to update profile", error);
    }
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
