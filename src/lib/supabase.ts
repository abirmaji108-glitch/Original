import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
// ✅ Better error messages for production
const ENV = import.meta.env.MODE || 'development';
const IS_PRODUCTION = ENV === 'production';
// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Helper function to create mock client
const createMockClient = (): SupabaseClient => {
 if (!IS_PRODUCTION) {
  console.error('⚠️ Supabase running in MOCK MODE - check environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
 }
 const mockError = (operation: string, table?: string) =>
 new Error(`Supabase not configured. Check environment variables.${table ? ` Attempted ${operation} on: ${table}` : ` Attempted: ${operation}`}`);
 return {
 // Database operations
 from: (table: string) => ({
 select: (columns?: string) => ({
 eq: (col: string, val: any) => ({
 single: () => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 maybeSingle: () => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 order: (col: string, opts?: any) => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 }),
 order: (col: string, opts?: any) => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 maybeSingle: () => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 single: () => Promise.reject(mockError(`select${columns ? ` (${columns})` : ''}`, table)),
 }),
 insert: (values: any) => ({
 select: () => ({ single: () => Promise.reject(mockError('insert', table)) }),
 }),
 update: (values: any) => ({
 eq: (col: string, val: any) => Promise.reject(mockError('update', table)),
 match: () => ({ select: () => ({ single: () => Promise.reject(mockError('update', table)) }) }),
 }),
 delete: () => ({
 eq: (col: string, val: any) => Promise.reject(mockError('delete', table)),
 match: () => Promise.reject(mockError('delete', table)),
 }),
 upsert: (values: any) => Promise.reject(mockError('upsert', table)),
 }),
 // Authentication
 auth: {
 getSession: () => Promise.reject(mockError('getSession')),
 getUser: () => Promise.reject(mockError('getUser')),
 signInWithPassword: (credentials: any) => Promise.reject(mockError('signInWithPassword')),
 signUp: (credentials: any) => Promise.reject(mockError('signUp')),
 signOut: () => Promise.reject(mockError('signOut')),
 resetPasswordForEmail: (email: string) => Promise.reject(mockError('resetPasswordForEmail')),
 onAuthStateChange: (callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
 },
 // Storage
 storage: {
 from: (bucket: string) => ({
 upload: (path: string, file: File) => Promise.reject(mockError('upload', bucket)),
 download: (path: string) => Promise.reject(mockError('download', bucket)),
 list: (path?: string) => Promise.reject(mockError('list', bucket)),
 remove: (paths: string[]) => Promise.reject(mockError('remove', bucket)),
 createSignedUrl: (path: string, expiresIn: number) => Promise.reject(mockError('createSignedUrl', bucket)),
 getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
 }),
 },
 // Realtime
 channel: (name: string) => ({
 on: () => ({ subscribe: () => Promise.reject(mockError('realtime subscribe')) }),
 subscribe: () => Promise.reject(mockError('realtime channel')),
 }),
 // Functions
 rpc: (fn: string, params?: any) => Promise.reject(mockError(`rpc: ${fn}`)),
 // Remove auth header for edge cases
 removeAllChannels: () => {},
 } as unknown as SupabaseClient;
};
// Create actual or mock client based on environment variables
const createSupabaseClient = (): SupabaseClient => {
 if (!supabaseUrl || !supabaseKey) {
 return createMockClient();
 }
 try {
 return createClient(supabaseUrl, supabaseKey, {
 auth: {
 persistSession: true,
 autoRefreshToken: true,
 detectSessionInUrl: true,
 storage: localStorage,
 storageKey: 'supabase.auth.token',
 },
 global: {
 headers: {
 'x-client-info': 'sento-ai-website-builder',
 'x-application-name': 'sento-ai',
 },
 },
 db: {
 schema: 'public',
 },
 realtime: {
 params: {
 eventsPerSecond: 10,
 },
 },
 });
 } catch (error) {
 console.error('Failed to create Supabase client:', error);
 return createMockClient();
 }
};
// Export the client instance
export const supabase = createSupabaseClient();
// ============================================================================
// SUPABASE SERVICE UTILITIES
// ============================================================================
export interface ConnectionStatus {
 connected: boolean;
 error?: string;
 details?: any;
 timestamp: Date;
}
export interface ConfigStatus {
 urlConfigured: boolean;
 keyConfigured: boolean;
 fullyConfigured: boolean;
}
/**
 * Enhanced error handling wrapper for Supabase operations
 */
export class SupabaseService {
 private static userMessages: Record<string, string> = {
 '23505': 'This record already exists.',
 '23503': 'Cannot delete this record as it is referenced by other records.',
 '42501': 'You do not have permission to perform this action.',
 'PGRST301': 'Database connection failed. Please try again.',
 'ADMIN_ONLY': 'This action requires administrator privileges.',
 '42P01': 'Database table does not exist.',
 'PGRST116': 'Resource not found.',
 '57014': 'Query timeout. Please try again.',
 '08P01': 'Connection failure.',
 '28000': 'Invalid authentication credentials.',
 '28P01': 'Invalid password.',
 '42703': 'Column does not exist.',
 };
 /**
 * Handle errors with user-friendly messages
 */
 private static handleError(error: any, context: string): never {
 console.error(`❌ Supabase Error (${context}):`, error);
 const errorMessage = error?.message || 'Unknown database error';
 const errorCode = error?.code || 'UNKNOWN';
 // Check if this is our mock client error
 if (errorMessage.includes('Supabase not configured')) {
 throw new Error('Database is not configured. Please contact support.');
 }
 // Provide user-friendly error messages
 const userMessage = this.userMessages[errorCode] ||
 `Database error in ${context}: ${errorMessage}`;
 throw new Error(userMessage);
 }
 /**
 * Safe query execution with error handling and retry logic
 */
static async safeQuery<T>(
  query: any,
  context: string,
  maxRetries: number = 2
): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await query;
    
      if (error) {
        // Check if error is retryable (network issues, timeouts)
        const isRetryable = error.message?.includes('timeout') ||
                          error.message?.includes('network') ||
                          error.message?.includes('connection');
      
        if (isRetryable && attempt < maxRetries) {
          console.warn(`⚠️ Retrying ${context} (attempt ${attempt}/${maxRetries})`);
          lastError = error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      
        return this.handleError(error, context);
      }
    
      if (data === null) {
        throw new Error(`No data returned from ${context}`);
      }
    
      return data;
    } catch (error) {
      lastError = error;
    
      // Retry on network errors
      const isNetworkError = error instanceof TypeError &&
                           error.message?.includes('fetch');
    
      if (isNetworkError && attempt < maxRetries) {
        console.warn(`⚠️ Network error, retrying ${context} (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    
      return this.handleError(error, context);
    }
  }
  return this.handleError(lastError, context);
}
/**
 * Safe insert with error handling
 */
static async safeInsert<T>(
  table: string,
  data: any,
  context: string = `insert into ${table}`
): Promise<T> {
  return this.safeQuery(supabase.from(table).insert(data).select().single(), context);
}
/**
 * Safe update with error handling
 */
static async safeUpdate<T>(
  table: string,
  data: any,
  match: Record<string, any>,
  context: string = `update ${table}`
): Promise<T> {
  const query = supabase.from(table).update(data).match(match).select().single() as any;
  return this.safeQuery(query, context);
}
/**
 * Safe delete with error handling
 */
static async safeDelete(
  table: string,
  match: Record<string, any>,
  context: string = `delete from ${table}`
): Promise<void> {
  const query = supabase.from(table).delete().match(match) as any;
  await this.safeQuery(query, context);
}
/**
 * Safe select with error handling
 */
static async safeSelect<T>(
  table: string,
  columns: string = '*',
  filters?: Record<string, any>,
  context: string = `select from ${table}`
): Promise<T[]> {
  let query: any = supabase.from(table).select(columns);
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }
  const result = await this.safeQuery(query as any, context);
  return (result as any) || [];
}
/**
 * Safe RPC function call with error handling
 */
static async safeRPC<T>(
  functionName: string,
  params?: Record<string, any>,
  context: string = `RPC call: ${functionName}`
): Promise<T> {
  const query = supabase.rpc(functionName, params) as any;
  return this.safeQuery(query, context);
}
// ============================================================================
// DOWNLOAD TRACKING HELPERS
// ============================================================================
/**
 * Track a website download
 */
static async trackDownload(
  userId: string,
  userTier: string
): Promise<void> {
  try {
    const query = supabase.from('download_tracking')
      .insert({
        user_id: userId,
        downloaded_at: new Date().toISOString(),
        user_tier: userTier
      })
      .select()
      .single() as any;
    await this.safeQuery(query, 'track download');
  } catch (error) {
    // Log but don't fail - download tracking is non-critical
    console.error('Failed to track download:', error);
  }
}
/**
 * Get user's download count for current month
 */
static async getMonthlyDownloadCount(userId: string): Promise<{
  count: number;
  limit: number;
  remaining: number;
}> {
  const currentMonth = new Date().toISOString().slice(0, 7);
 
  const query1 = supabase.from('download_tracking')
    .select('id, downloaded_at')
    .eq('user_id', userId) as any;
  const downloads = await this.safeQuery<any[]>(query1, 'get monthly downloads');
 
  // Filter by current month (done client-side since filter is complex)
  const monthlyDownloads = downloads.filter((d: any) =>
    d.downloaded_at && d.downloaded_at.startsWith(currentMonth)
  );
 
  // Get user tier to determine limit
  const query2 = supabase.from('profiles')
    .select('user_tier')
    .eq('id', userId)
    .single() as any;
  const profile = await this.safeQuery(query2, 'get user tier');
  const limits: Record<string, number> = {
    'free': 0,
    'basic': 10,
    'pro': 50,
    'business': 200
  };
  const limit = limits[(profile as any).user_tier] || 0;
  const count = monthlyDownloads.length;
  return {
    count,
    limit,
    remaining: Math.max(0, limit - count)
  };
}
/**
 * Check if user can download (has remaining downloads)
 */
static async canDownload(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const { count, limit, remaining } = await this.getMonthlyDownloadCount(userId);
  if (limit === 0) {
    return {
      allowed: false,
      reason: 'Download feature requires upgrade to Basic, Pro, or Business plan'
    };
  }
  if (count >= limit) {
    return {
      allowed: false,
      reason: `Monthly download limit reached (${count}/${limit})`
    };
  }
  return {
    allowed: true,
    remaining
  };
}
 /**
 * Check if Supabase is properly configured
 */
 static isConfigured(): boolean {
 return !!(supabaseUrl && supabaseKey);
 }
 /**
 * Get configuration status
 */
 static getConfigStatus(): ConfigStatus {
 return {
 urlConfigured: !!supabaseUrl,
 keyConfigured: !!supabaseKey,
 fullyConfigured: !!(supabaseUrl && supabaseKey),
 };
 }
 /**
 * Check if we're using the mock client
 */
 static isMockMode(): boolean {
 return !(supabaseUrl && supabaseKey);
 }
}
// ============================================================================
// CONNECTION HEALTH CHECK
// ============================================================================
/**
 * Check Supabase connection status
 */
export const checkSupabaseConnection = async (): Promise<ConnectionStatus> => {
 const timestamp = new Date();
 // Check environment variables first
 if (!supabaseUrl || !supabaseKey) {
 return {
 connected: false,
 error: 'Missing environment variables',
 details: {
 VITE_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
 VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing',
 },
 timestamp,
 };
 }
 try {
 // Try to fetch from the health endpoint
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
 try {
 const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
 headers: {
 'apikey': supabaseKey,
 'Authorization': `Bearer ${supabaseKey}`,
 'Content-Type': 'application/json',
 },
 signal: controller.signal,
 });
 clearTimeout(timeoutId);
 if (healthCheck.ok) {
 return {
 connected: true,
 details: {
 health: 'API endpoint reachable',
 responseTime: Date.now() - timestamp.getTime(),
 status: healthCheck.status,
 },
 timestamp,
 };
 }
 return {
 connected: false,
 error: `HTTP ${healthCheck.status}: ${healthCheck.statusText}`,
 details: {
 status: healthCheck.status,
 statusText: healthCheck.statusText,
 },
 timestamp,
 };
 } catch (fetchError) {
 clearTimeout(timeoutId);
 throw fetchError;
 }
 } catch (error) {
 console.error('Supabase connection test failed:', error);
 return {
 connected: false,
 error: error instanceof Error ? error.message : 'Unknown connection error',
 details: {
 error: error instanceof Error ? {
 name: error.name,
 message: error.message,
 stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
 } : error,
 url: supabaseUrl,
 timestamp: timestamp.toISOString(),
 },
 timestamp,
 };
 }
};
/**
 * Monitor connection health with retries
 */
export const monitorConnection = async (
 maxRetries: number = 3,
 retryDelay: number = 1000
): Promise<ConnectionStatus> => {
 let lastError: ConnectionStatus | null = null;
 for (let attempt = 1; attempt <= maxRetries; attempt++) {
 try {
 const status = await checkSupabaseConnection();
 if (status.connected) {
 return status;
 }
 lastError = status;
 if (attempt < maxRetries) {
 await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
 }
 } catch (error) {
 lastError = {
 connected: false,
 error: error instanceof Error ? error.message : 'Connection check failed',
 timestamp: new Date(),
 };
 }
 }
 return lastError!;
};
// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================
/**
 * Get a friendly status message for display
 */
export const getConnectionStatusMessage = (status: ConnectionStatus): string => {
 if (status.connected) return 'Connected to database';
 if (status.error?.includes('Missing environment variables')) {
 return 'Database configuration missing. Please check environment variables.';
 }
 if (status.error?.includes('timeout') || status.error?.includes('abort')) {
 return 'Database connection timeout. Please check your network.';
 }
 return `Database connection issue: ${status.error}`;
};
/**
 * Log connection status for debugging
 */
export const logConnectionStatus = (status: ConnectionStatus): void => {
 const emoji = status.connected ? '✅' : '❌';
 const time = status.timestamp.toLocaleTimeString();
 console.group(`${emoji} Supabase Connection Status - ${time}`);
 console.log('Connected:', status.connected);
 if (status.error) {
 console.error('Error:', status.error);
 }
 if (status.details) {
 console.log('Details:', status.details);
 }
 console.groupEnd();
};
// ============================================================================
// TYPE EXPORTS FOR CONVENIENCE
// ============================================================================
export type {
 SupabaseClient,
 PostgrestError,
 Session,
 User,
 AuthError,
} from '@supabase/supabase-js';
// Export the default instance as default for convenience
export default supabase;
