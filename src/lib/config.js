// Public config for the hosted backend. These values are safe to ship in the app:
// the anon key only allows what Row Level Security allows. Never put the
// service-role key, the server secret or any provider key here.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wwdwbnhswynjcxeerdgz.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHdibmhzd3luamN4ZWVyZGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNjIyMjEsImV4cCI6MjEwODYzODIyMX0.f6eeihQmytwgDiJOFZjgHLeKq5GGFRZ0X9RqgP7bu_Q';
export const API_BASE = (import.meta.env.VITE_API_BASE || 'https://lonekeem-studios-api.vercel.app').replace(/\/$/, '');

// Where the magic link sends people back to.
export const WEB_HOME = 'https://lonekeem.github.io/lonekeem-studios/';
export const NATIVE_AUTH_CALLBACK = 'com.lonekeemstudios.app://auth-callback';
