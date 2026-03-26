import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoEmbed } from "@/components/VideoEmbed";

const LessonDetail = () => {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, module:modules(title, space:spaces(title)), lesson_blocks(*)")
        .eq("id", lessonId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const { data: progressData } = useQuery({
    queryKey: ["lesson-progress", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!lessonId,
  });

  const isCompleted = progressData?.completed || false;

  const toggleComplete = useMutation({
    mutationFn: async () => {
      if (isCompleted) {
        await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user!.id)
          .eq("lesson_id", lessonId!);
      } else {
        await supabase.from("user_progress").upsert({
          user_id: user!.id,
          lesson_id: lessonId!,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
    },
  });

  const blocks = lesson?.lesson_blocks?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  if (!lesson) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {(lesson as any).module?.space?.title} › {(lesson as any).module?.title}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-6">
        {blocks.map((block: any) => (
          <LessonBlock key={block.id} block={block} />
        ))}
      </div>

      {/* Mark Complete */}
      <div className="pt-6 border-t border-border flex justify-center">
        <Button
          variant={isCompleted ? "secondary" : "gold"}
          size="lg"
          onClick={() => toggleComplete.mutate()}
          disabled={toggleComplete.isPending}
          className="gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          {isCompleted ? "Marquer comme non terminé" : "Marquer comme terminé"}
        </Button>
      </div>
    </div>
  );
};

const LessonBlock = ({ block }: { block: any }) => {
  const content = block.content as any;

  switch (block.block_type) {
    case "video":
      return <VideoEmbed url={content.url || ""} />;
    case "text":
      return (
        <div
          className="prose prose-invert max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: content.html || "" }}
        />
      );
    case "image":
      return (
        <div className="rounded-lg overflow-hidden">
          <img
            src={content.url || ""}
            alt={content.alt || ""}
            className="w-full object-contain max-h-[500px]"
          />
        </div>
      );
    case "link":
      return (
        <a
          href={content.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-lg bg-card border border-border hover:border-accent/50 transition-colors"
        >
          <p className="font-medium text-accent">{content.title || content.url}</p>
          {content.description && (
            <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
          )}
        </a>
      );
    case "file":
      return (
        <a
          href={content.url || "#"}
          download
          className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:border-accent/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-foreground">
            {content.filename?.split(".").pop()?.toUpperCase() || "DOC"}
          </div>
          <div>
            <p className="font-medium text-foreground">{content.filename || "Télécharger le fichier"}</p>
            <p className="text-sm text-muted-foreground">Cliquez pour télécharger</p>
          </div>
        </a>
      );
    default:
      return null;
  }
};

export default LessonDetail;
