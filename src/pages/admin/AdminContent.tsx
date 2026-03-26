import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight, FolderOpen, BookOpen, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminContent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [spaceDialog, setSpaceDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [lessonDialog, setLessonDialog] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [spaceForm, setSpaceForm] = useState({ title: "", description: "", is_general: false, pole_ids: [] as string[] });
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "" });

  const { data: poles } = useQuery({
    queryKey: ["poles"],
    queryFn: async () => {
      const { data } = await supabase.from("poles").select("*");
      return data || [];
    },
  });

  const { data: spaces } = useQuery({
    queryKey: ["admin-spaces"],
    queryFn: async () => {
      const { data } = await supabase
        .from("spaces")
        .select("*, space_poles(pole_id, pole:poles(name)), modules(*, lessons(*))")
        .order("order_index");
      return data;
    },
  });

  const createSpace = useMutation({
    mutationFn: async () => {
      const { data: space, error } = await supabase.from("spaces").insert({
        title: spaceForm.title,
        description: spaceForm.description,
        is_general: spaceForm.is_general,
        status: "draft" as const,
      }).select().single();
      if (error) throw error;

      if (!spaceForm.is_general && spaceForm.pole_ids.length > 0) {
        await supabase.from("space_poles").insert(
          spaceForm.pole_ids.map((pid) => ({ space_id: space.id, pole_id: pid }))
        );
      }
    },
    onSuccess: () => {
      toast({ title: "Espace créé" });
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      setSpaceDialog(false);
      setSpaceForm({ title: "", description: "", is_general: false, pole_ids: [] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const createModule = useMutation({
    mutationFn: async () => {
      if (!selectedSpaceId) return;
      const { error } = await supabase.from("modules").insert({
        space_id: selectedSpaceId,
        title: moduleForm.title,
        description: moduleForm.description,
        status: "draft" as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Module créé" });
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      setModuleDialog(false);
      setModuleForm({ title: "", description: "" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      if (!selectedModuleId) return;
      const { error } = await supabase.from("lessons").insert({
        module_id: selectedModuleId,
        title: lessonForm.title,
        status: "draft" as const,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Leçon créée" });
      queryClient.invalidateQueries({ queryKey: ["admin-spaces"] });
      setLessonDialog(false);
      setLessonForm({ title: "" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erreur", description: e.message }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ table, id, currentStatus }: { table: string; id: string; currentStatus: string }) => {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const { error } = await supabase
        .from(table as any)
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-spaces"] }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion du contenu</h1>
        <Dialog open={spaceDialog} onOpenChange={setSpaceDialog}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2">
              <Plus className="h-4 w-4" /> Nouvel espace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Créer un espace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-foreground">Titre</Label>
                <Input value={spaceForm.title} onChange={(e) => setSpaceForm({ ...spaceForm, title: e.target.value })} className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Description</Label>
                <Textarea value={spaceForm.description} onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })} className="bg-secondary" />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={spaceForm.is_general} onCheckedChange={(v) => setSpaceForm({ ...spaceForm, is_general: !!v })} />
                Espace général (visible par tous)
              </label>
              {!spaceForm.is_general && (
                <div className="space-y-2">
                  <Label className="text-foreground">Pôles concernés</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {poles?.map((pole) => (
                      <label key={pole.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <Checkbox
                          checked={spaceForm.pole_ids.includes(pole.id)}
                          onCheckedChange={() =>
                            setSpaceForm((prev) => ({
                              ...prev,
                              pole_ids: prev.pole_ids.includes(pole.id)
                                ? prev.pole_ids.filter((p) => p !== pole.id)
                                : [...prev.pole_ids, pole.id],
                            }))
                          }
                        />
                        {pole.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="gold" className="w-full" onClick={() => createSpace.mutate()} disabled={createSpace.isPending}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tree view */}
      <div className="space-y-3">
        {spaces?.map((space: any) => (
          <div key={space.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium text-foreground">{space.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${space.status === "published" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      {space.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                    {space.is_general && <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">Général</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePublish.mutate({ table: "spaces", id: space.id, currentStatus: space.status })}
                  className="text-xs"
                >
                  {space.status === "published" ? "Dépublier" : "Publier"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedSpaceId(space.id); setModuleDialog(true); }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3 w-3" /> Module
                </Button>
              </div>
            </div>

            {space.modules?.sort((a: any, b: any) => a.order_index - b.order_index).map((mod: any) => (
              <div key={mod.id} className="border-t border-border">
                <div className="flex items-center justify-between p-3 pl-10">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{mod.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${mod.status === "published" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                      {mod.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublish.mutate({ table: "modules", id: mod.id, currentStatus: mod.status })}
                      className="text-xs"
                    >
                      {mod.status === "published" ? "Dépublier" : "Publier"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedModuleId(mod.id); setLessonDialog(true); }}
                      className="gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" /> Leçon
                    </Button>
                  </div>
                </div>

                {mod.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => (
                  <div key={lesson.id} className="flex items-center justify-between p-2 pl-16 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground">{lesson.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                        className="text-xs"
                      >
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish.mutate({ table: "lessons", id: lesson.id, currentStatus: lesson.status })}
                        className="text-xs"
                      >
                        {lesson.status === "published" ? "Dépublier" : "Publier"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Module Dialog */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Créer un module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-foreground">Titre</Label>
              <Input value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} className="bg-secondary" />
            </div>
            <div className="space-y-1">
              <Label className="text-foreground">Description</Label>
              <Textarea value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} className="bg-secondary" />
            </div>
            <Button variant="gold" className="w-full" onClick={() => createModule.mutate()} disabled={createModule.isPending}>
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Créer une leçon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-foreground">Titre</Label>
              <Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="bg-secondary" />
            </div>
            <Button variant="gold" className="w-full" onClick={() => createLesson.mutate()} disabled={createLesson.isPending}>
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContent;
