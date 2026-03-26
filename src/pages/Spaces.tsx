import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const Spaces = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: spaces } = useQuery({
    queryKey: ["user-spaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*, modules(id, lessons(id))")
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
        .select("lesson_id")
        .eq("user_id", user!.id)
        .eq("completed", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completedIds = new Set(progress?.map((p) => p.lesson_id) || []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Espaces de formation</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces?.map((space) => {
          const total = space.modules?.reduce(
            (acc: number, m: any) => acc + (m.lessons?.length || 0), 0
          ) || 0;
          const done = space.modules?.reduce(
            (acc: number, m: any) =>
              acc + (m.lessons?.filter((l: any) => completedIds.has(l.id))?.length || 0), 0
          ) || 0;
          const prog = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Card
              key={space.id}
              className="bg-card border-border hover:border-accent/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/spaces/${space.id}`)}
            >
              {space.cover_image_url && (
                <div className="h-32 overflow-hidden rounded-t-lg">
                  <img src={space.cover_image_url} alt={space.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground group-hover:text-accent transition-colors">
                  {space.title}
                </CardTitle>
                {space.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>{space.modules?.length || 0} modules</span>
                  <span className="text-accent font-medium">{prog}%</span>
                </div>
                <Progress value={prog} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
        {spaces?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun espace disponible</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Spaces;
