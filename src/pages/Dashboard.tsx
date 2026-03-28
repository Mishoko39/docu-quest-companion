import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: spaces } = useQuery({
    queryKey: ["user-spaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*, modules(id, title, lessons(id))")
        .eq("status", "published")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("completed", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completedLessonIds = new Set(progress?.map((p) => p.lesson_id) || []);

  const getSpaceProgress = (space: any) => {
    const totalLessons = space.modules?.reduce(
      (acc: number, m: any) => acc + (m.lessons?.length || 0),
      0
    ) || 0;
    if (totalLessons === 0) return 0;
    const completedLessons = space.modules?.reduce(
      (acc: number, m: any) =>
        acc + (m.lessons?.filter((l: any) => completedLessonIds.has(l.id))?.length || 0),
      0
    ) || 0;
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const totalLessons = spaces?.reduce(
    (acc, s) =>
      acc + (s.modules?.reduce((a: number, m: any) => a + (m.lessons?.length || 0), 0) || 0),
    0
  ) || 0;

  const totalCompleted = completedLessonIds.size;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with logo */}
      <div className="flex items-center gap-4">
        <img src="/logo-mpi.png" alt="Mon Plan Immo" className="h-10" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue sur votre plateforme d'onboarding
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{spaces?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Espaces accessibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
                <p className="text-sm text-muted-foreground">Leçons terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Progression globale</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spaces */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Vos espaces de formation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces?.map((space) => {
            const prog = getSpaceProgress(space);
            const moduleCount = space.modules?.length || 0;
            return (
              <Card
                key={space.id}
                className="bg-card border-border shadow-card hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={() => navigate(`/spaces/${space.id}`)}
              >
                {space.cover_image_url && (
                  <div className="h-32 overflow-hidden rounded-t-lg">
                    <img
                      src={space.cover_image_url}
                      alt={space.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                    {space.title}
                  </CardTitle>
                  {space.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>{moduleCount} module{moduleCount > 1 ? "s" : ""}</span>
                    <span className="text-primary font-medium">{prog}%</span>
                  </div>
                  <Progress value={prog} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
          {spaces?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun espace de formation disponible pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
