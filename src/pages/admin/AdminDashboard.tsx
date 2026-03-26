import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const { data: usersCount } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: spacesCount } = useQuery({
    queryKey: ["admin-spaces-count"],
    queryFn: async () => {
      const { count } = await supabase.from("spaces").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: lessonsCount } = useQuery({
    queryKey: ["admin-lessons-count"],
    queryFn: async () => {
      const { count } = await supabase.from("lessons").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["admin-progress-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("user_progress").select("*").eq("completed", true);
      return data?.length || 0;
    },
  });

  const stats = [
    { label: "Utilisateurs", value: usersCount || 0, icon: Users, color: "bg-primary/20" },
    { label: "Espaces", value: spacesCount || 0, icon: BookOpen, color: "bg-accent/20" },
    { label: "Leçons", value: lessonsCount || 0, icon: GraduationCap, color: "bg-success/20" },
    { label: "Leçons complétées", value: progressData || 0, icon: TrendingUp, color: "bg-gold/20" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User progress table */}
      <UserProgressTable />
    </div>
  );
};

const UserProgressTable = () => {
  const { data: users } = useQuery({
    queryKey: ["admin-users-progress"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*, user_roles(role), user_poles(pole:poles(name))");
      
      const { data: progress } = await supabase
        .from("user_progress")
        .select("user_id, completed")
        .eq("completed", true);

      const { count: totalLessons } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true });

      const progressMap: Record<string, number> = {};
      progress?.forEach((p) => {
        progressMap[p.user_id] = (progressMap[p.user_id] || 0) + 1;
      });

      return profiles?.map((p) => ({
        ...p,
        completedLessons: progressMap[p.user_id] || 0,
        totalLessons: totalLessons || 0,
        poles: (p as any).user_poles?.map((up: any) => up.pole?.name).filter(Boolean) || [],
        role: (p as any).user_roles?.[0]?.role || "user",
      }));
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">Progression des utilisateurs</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rôle</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Pôles</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Progression</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <td className="p-3 text-foreground">{u.first_name} {u.last_name}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    u.role === "admin" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary-foreground"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.poles.map((p: string) => (
                      <span key={p} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-sm">
                  {u.completedLessons}/{u.totalLessons} leçons
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
