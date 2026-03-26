import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const SpaceDetail = () => {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: space } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*, modules(*, lessons(id))")
        .eq("id", spaceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
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

  const completedIds = new Set(progress?.map((p) => p.lesson_id) || []);

  const modules = space?.modules
    ?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = modules.reduce(
    (acc: number, m: any) =>
      acc + (m.lessons?.filter((l: any) => completedIds.has(l.id))?.length || 0),
    0
  );
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (!space) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{space.title}</h1>
          {space.description && (
            <p className="text-muted-foreground mt-1">{space.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent">{overallProgress}%</p>
          <p className="text-xs text-muted-foreground">{completedLessons}/{totalLessons} leçons</p>
        </div>
      </div>

      <Progress value={overallProgress} className="h-2" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod: any) => {
          const modTotal = mod.lessons?.length || 0;
          const modCompleted = mod.lessons?.filter((l: any) => completedIds.has(l.id))?.length || 0;
          const modProg = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;

          return (
            <Card
              key={mod.id}
              className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/modules/${mod.id}`)}
            >
              {mod.cover_image_url && (
                <div className="h-28 overflow-hidden rounded-t-lg">
                  <img src={mod.cover_image_url} alt={mod.title} className="w-full h-full object-cover" />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground group-hover:text-accent transition-colors">
                  {mod.title}
                </CardTitle>
                {mod.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{mod.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>{modTotal} leçon{modTotal > 1 ? "s" : ""}</span>
                  <span className="text-accent font-medium">{modProg}%</span>
                </div>
                <Progress value={modProg} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
        {modules.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun module dans cet espace</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpaceDetail;
