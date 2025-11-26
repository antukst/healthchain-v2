// Supabase Configuration - Auto-setup
// This file automatically configures Supabase credentials

(function() {
  console.log('🔧 Auto-configuring Supabase...');
  
  const SUPABASE_URL = 'https://ttiwzienmbvioxyenzfv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aXd6aWVubWJ2aW94eWVuemZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMzI2MTgsImV4cCI6MjA3OTcwODYxOH0.1vnZj1NIwZVLZQeHzKyy3T8mGfcCbJgCM1R65_6ymXY';
  
  // Check if already configured
  const currentUrl = localStorage.getItem('healthchain_supabase_url');
  const currentKey = localStorage.getItem('healthchain_supabase_key');
  
  if (currentUrl !== SUPABASE_URL || currentKey !== SUPABASE_KEY) {
    console.log('📝 Updating Supabase credentials...');
    localStorage.setItem('healthchain_supabase_url', SUPABASE_URL);
    localStorage.setItem('healthchain_supabase_key', SUPABASE_KEY);
    console.log('✅ Supabase credentials configured');
  } else {
    console.log('✅ Supabase credentials already configured');
  }
  
  console.log('🌐 Supabase URL:', SUPABASE_URL);
  console.log('🔑 API Key:', SUPABASE_KEY.substring(0, 20) + '...');
})();
