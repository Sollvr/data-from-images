import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Extraction, Tag } from 'db/schema';

// Initialize Supabase client with error handling
console.log('Starting Supabase initialization...');

// Check environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verify environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', {
    url: !supabaseUrl ? 'Missing VITE_SUPABASE_URL' : 'OK',
    key: !supabaseKey ? 'Missing VITE_SUPABASE_ANON_KEY' : 'OK'
  });
  throw new Error('Missing required Supabase configuration');
}

console.log('Supabase environment variables verified');

let supabaseInstance: ReturnType<typeof createClient>;

try {
  console.log('Creating Supabase client...');
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  throw error;
}

export const supabase = supabaseInstance;

// Realtime subscription utilities
interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export function subscribeToUserExtractions(
  userId: number,
  onUpdate: (extraction: Extraction) => void
): RealtimeSubscription {
  const channel = supabase
    .channel(`extractions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'extractions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const extraction = payload.new as Extraction;
        onUpdate(extraction);
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

export function subscribeToExtractionTags(
  extractionId: number,
  onUpdate: (tag: Tag) => void
): RealtimeSubscription {
  const channel = supabase
    .channel(`tags:${extractionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tags',
        filter: `extraction_id=eq.${extractionId}`,
      },
      (payload) => {
        const tag = payload.new as Tag;
        onUpdate(tag);
      }
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

// Storage utilities
export async function uploadImage(
  userId: number,
  file: File
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading image:', error);
    return null;
  }

  // Get public URL for the uploaded file
  const { data: { publicUrl } } = supabase.storage
    .from('screenshots')
    .getPublicUrl(data.path);

  return publicUrl;
}

// Initialize Supabase storage bucket for screenshots
export async function initializeStorage() {
  const { data: bucket, error } = await supabase.storage.getBucket('screenshots');
  
  if (!bucket && !error) {
    await supabase.storage.createBucket('screenshots', {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880, // 5MB
    });
  }
}

// User authentication utilities
export async function signInWithEmail(
  email: string,
  password: string
) {
  console.log('Attempting email sign in...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Email sign in error:', error);
      throw error;
    }

    console.log('Email sign in successful');
    return data;
  } catch (error) {
    console.error('Unexpected error during email sign in:', error);
    throw error;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string
) {
  console.log('Attempting email sign up...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Email sign up error:', error);
      throw error;
    }

    console.log('Email sign up successful');
    return data;
  } catch (error) {
    console.error('Unexpected error during email sign up:', error);
    throw error;
  }
}

export async function signInWithGoogle() {
  console.log('Attempting Google sign in...');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }

    console.log('Google sign in initiated');
    return data;
  } catch (error) {
    console.error('Unexpected error during Google sign in:', error);
    throw error;
  }
}

export async function signOut() {
  console.log('Attempting sign out...');
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }

    console.log('Sign out successful');
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    throw error;
  }
}

// User session management with error handling
export function onAuthStateChange(
  callback: (session: any | null) => void
) {
  console.log('Setting up auth state change listener...');
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    callback(session);
  });
}

// Helper function to check if user is authenticated
export function isAuthenticated(): boolean {
  try {
    const session = supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}

// Helper function to get current user with error handling
export async function getCurrentUser() {
  console.log('Fetching current user...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }

    console.log('Current user fetched successfully');
    return user;
  } catch (error) {
    console.error('Unexpected error fetching current user:', error);
    throw error;
  }
}