import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Globe, Clock } from "lucide-react";

interface AnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyticsModal({ open, onOpenChange }: AnalyticsModalProps) {
  const analyticsData = [
    { month: "Jan", generations: 45, downloads: 32 },
    { month: "Feb", generations: 52, downloads: 41 },
    { month: "Mar", generations: 61, downloads: 48 },
    { month: "Apr", generations: 58, downloads: 45 },
    { month: "May", generations: 70, downloads: 55 },
    { month: "Jun", generations: 82, downloads: 68 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-green-600 font-semibold">+12%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">368</p>
              <p className="text-xs text-gray-600">Total Generations</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-green-600 font-semibold">+8%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">289</p>
              <p className="text-xs text-gray-600">Total Downloads</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <Globe className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-600 font-semibold">+15%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-xs text-gray-600">Active Projects</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-xs text-gray-600">Avg</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">24s</p>
              <p className="text-xs text-gray-600">Generation Time</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Generation & Download Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="generations" fill="#9333ea" name="Generations" />
                <Bar dataKey="downloads" fill="#3b82f6" name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
