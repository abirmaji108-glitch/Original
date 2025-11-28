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
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
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
      console.error('Error fetching usage:', error);
      toast({
        title: "Error",
        description: "Failed to fetch usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async () => {
    if (!userId) return false;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: existing } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_usage')
          .update({ 
            generations_used: existing.generations_used + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('month_year', currentMonth);

        if (error) throw error;

        setUsage(prev => ({
          ...prev,
          generationsUsed: existing.generations_used + 1,
          canGenerate: existing.generations_used + 1 < 10
        }));
      } else {
        const { error } = await supabase
          .from('user_usage')
          .insert({
            user_id: userId,
            generations_used: 1,
            month_year: currentMonth
          });

        if (error) throw error;

        setUsage(prev => ({
          ...prev,
          generationsUsed: 1,
          canGenerate: true
        }));
      }

      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      toast({
        title: "Error",
        description: "Failed to update usage tracking",
        variant: "destructive"
      });
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
