import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UsageData {
  generationsUsed: number;
  generationsLimit: number;
  monthYear: string;
  canGenerate: boolean;
}

export const useUsageTracking = (userId: string | undefined) => {
  const [usage, setUsage] = useState<UsageData>({
    generationsUsed: 0,
    generationsLimit: 10,
    monthYear: new Date().toISOString().slice(0, 7),
    canGenerate: true
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsage = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching usage:', error);
      }

      if (data) {
        setUsage({
          generationsUsed: data.generations_used,
          generationsLimit: 10,
          monthYear: currentMonth,
          canGenerate: data.generations_used < 10
        });
      } else {
        setUsage({
          generationsUsed: 0,
          generationsLimit: 10,
          monthYear: currentMonth,
          canGenerate: true
        });
      }
    } catch (error) {
      console.error('Error in fetchUsage:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async () => {
    if (!userId) return false;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: existing, error: fetchError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching usage:', fetchError);
        return false;
      }

      if (existing) {
        const { error } = await supabase
          .from('usage_tracking')
          .update({ 
            generations_used: existing.generations_used + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('month_year', currentMonth);

        if (error) {
          console.error('Error updating usage:', error);
          return false;
        }

        setUsage(prev => ({
          ...prev,
          generationsUsed: existing.generations_used + 1,
          canGenerate: existing.generations_used + 1 < 10
        }));
      } else {
        const { error } = await supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            generations_used: 1,
            month_year: currentMonth
          });

        if (error) {
          console.error('Error inserting usage:', error);
          return false;
        }

        setUsage(prev => ({
          ...prev,
          generationsUsed: 1,
          canGenerate: true
        }));
      }

      return true;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [userId]);

  return {
    usage,
    loading,
    incrementUsage,
    refreshUsage: fetchUsage
  };
};
