import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Extraction, Tag } from 'db/schema';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

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

// User authentication utilities
export async function signInWithEmail(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
}

// User session management
export function onAuthStateChange(
  callback: (session: any | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}

// Data fetching utilities
export async function fetchUserExtractions(userId: number) {
  const { data, error } = await supabase
    .from('extractions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchExtractionTags(extractionId: number) {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('extraction_id', extractionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

// Helper function to check if user is authenticated
export function isAuthenticated(): boolean {
  return !!supabase.auth.getSession();
}

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw error;
  }
  
  return user;
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
