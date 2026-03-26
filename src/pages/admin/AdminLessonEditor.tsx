import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type BlockType = Database["public"]["Enums"]["block_type"];

const AdminLessonEditor = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lesson } = useQuery({
    queryKey: ["admin-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, lesson_blocks(*)")
        .eq("id", lessonId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const blocks = lesson?.lesson_blocks?.sort((a, b) => a.order_index - b.order_index) || [];

  const addBlock = useMutation({
    mutationFn: async (blockType: BlockType) => {
      const { error } = await supabase.from("lesson_blocks").insert({
        lesson_id: lessonId!,
        block_type: blockType,
        content: getDefaultContent(blockType),
        order_index: blocks.length,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-lesson", lessonId] }),
  });

  const updateBlock = useMutation({
    mutationFn: async ({ blockId, content }: { blockId: string; content: any }) => {
      const { error } = await supabase
        .from("lesson_blocks")
        .update({ content })
        .eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lesson", lessonId] });
      toast({ title: "Bloc sauvegardé" });
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase.from("lesson_blocks").delete().eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-lesson", lessonId] }),
  });

  if (!lesson) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Éditer : {lesson.title}</h1>
      </div>

      {/* Blocks */}
      <div className="space-y-4">
        {blocks.map((block) => (
          <BlockEditor
            key={block.id}
            block={block}
            onSave={(content) => updateBlock.mutate({ blockId: block.id, content })}
            onDelete={() => deleteBlock.mutate(block.id)}
          />
        ))}
      </div>

      {/* Add block */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Ajouter :</span>
        {(["video", "text", "image", "link", "file"] as BlockType[]).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => addBlock.mutate(type)}
            className="capitalize"
          >
            <Plus className="h-3 w-3 mr-1" /> {blockTypeLabel(type)}
          </Button>
        ))}
      </div>
    </div>
  );
};

const BlockEditor = ({
  block,
  onSave,
  onDelete,
}: {
  block: any;
  onSave: (content: any) => void;
  onDelete: () => void;
}) => {
  const [content, setContent] = useState<any>(block.content || {});

  const renderEditor = () => {
    switch (block.block_type) {
      case "video":
        return (
          <div className="space-y-2">
            <Label className="text-foreground">URL de la vidéo</Label>
            <Input
              value={content.url || ""}
              onChange={(e) => setContent({ ...content, url: e.target.value })}
              placeholder="https://vimeo.com/..."
              className="bg-secondary"
            />
          </div>
        );
      case "text":
        return (
          <div className="space-y-2">
            <Label className="text-foreground">Contenu HTML</Label>
            <Textarea
              value={content.html || ""}
              onChange={(e) => setContent({ ...content, html: e.target.value })}
              rows={6}
              placeholder="<p>Votre contenu ici...</p>"
              className="bg-secondary font-mono text-sm"
            />
          </div>
        );
      case "image":
        return (
          <div className="space-y-2">
            <Label className="text-foreground">URL de l'image</Label>
            <Input
              value={content.url || ""}
              onChange={(e) => setContent({ ...content, url: e.target.value })}
              placeholder="https://..."
              className="bg-secondary"
            />
            <Label className="text-foreground">Texte alternatif</Label>
            <Input
              value={content.alt || ""}
              onChange={(e) => setContent({ ...content, alt: e.target.value })}
              className="bg-secondary"
            />
          </div>
        );
      case "link":
        return (
          <div className="space-y-2">
            <Label className="text-foreground">URL</Label>
            <Input value={content.url || ""} onChange={(e) => setContent({ ...content, url: e.target.value })} className="bg-secondary" />
            <Label className="text-foreground">Titre</Label>
            <Input value={content.title || ""} onChange={(e) => setContent({ ...content, title: e.target.value })} className="bg-secondary" />
            <Label className="text-foreground">Description</Label>
            <Textarea value={content.description || ""} onChange={(e) => setContent({ ...content, description: e.target.value })} className="bg-secondary" />
          </div>
        );
      case "file":
        return (
          <div className="space-y-2">
            <Label className="text-foreground">URL du fichier</Label>
            <Input value={content.url || ""} onChange={(e) => setContent({ ...content, url: e.target.value })} className="bg-secondary" />
            <Label className="text-foreground">Nom du fichier</Label>
            <Input value={content.filename || ""} onChange={(e) => setContent({ ...content, filename: e.target.value })} className="bg-secondary" />
          </div>
        );
      default:
        return <p className="text-muted-foreground text-sm">Type de bloc non supporté</p>;
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase text-accent">{blockTypeLabel(block.block_type)}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {renderEditor()}
      <Button variant="premium" size="sm" onClick={() => onSave(content)}>
        Sauvegarder
      </Button>
    </div>
  );
};

function getDefaultContent(type: BlockType): any {
  switch (type) {
    case "video": return { url: "" };
    case "text": return { html: "" };
    case "image": return { url: "", alt: "" };
    case "link": return { url: "", title: "", description: "" };
    case "file": return { url: "", filename: "" };
    default: return {};
  }
}

function blockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: "Vidéo",
    text: "Texte",
    image: "Image",
    link: "Lien",
    file: "Fichier",
    quiz: "Quiz",
  };
  return labels[type] || type;
}

export default AdminLessonEditor;
