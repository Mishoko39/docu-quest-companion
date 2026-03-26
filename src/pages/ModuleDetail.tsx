import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: module } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*, space:spaces(title), lessons(*)")
        .eq("id", moduleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
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
  const lessons = module?.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const total = lessons.length;
  const completed = lessons.filter((l: any) => completedIds.has(l.id)).length;
  const prog = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!module) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{(module as any).space?.title}</p>
          <h1 className="text-2xl font-bold text-foreground">{module.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-accent">{prog}%</p>
          <p className="text-xs text-muted-foreground">{completed}/{total}</p>
        </div>
      </div>

      <Progress value={prog} className="h-2" />

      <div className="space-y-2">
        {lessons.map((lesson: any, index: number) => {
          const isCompleted = completedIds.has(lesson.id);
          return (
            <div
              key={lesson.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-accent/50 cursor-pointer transition-colors group"
              onClick={() => navigate(`/lessons/${lesson.id}`)}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-accent transition-colors">
                  {index + 1}. {lesson.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleDetail;
