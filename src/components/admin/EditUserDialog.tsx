import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface EditUserDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditUserDialog = ({ user, open, onOpenChange }: EditUserDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    role: "user" as "admin" | "user",
    poles: [] as string[],
    is_active: true,
  });

  const { data: poles } = useQuery({
    queryKey: ["poles"],
    queryFn: async () => {
      const { data } = await supabase.from("poles").select("*");
      return data || [];
    },
  });

  useEffect(() => {
    if (user && open) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.user_roles?.[0]?.role || "user",
        poles: user.user_poles?.map((up: any) => up.pole_id) || [],
        is_active: user.is_active ?? true,
      });
    }
  }, [user, open]);

  const updateUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("update-user", {
        body: {
          user_id: user.user_id,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          pole_ids: form.poles,
          is_active: form.is_active,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Utilisateur mis à jour avec succès" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    },
  });

  const togglePole = (poleId: string) => {
    setForm((prev) => ({
      ...prev,
      poles: prev.poles.includes(poleId)
        ? prev.poles.filter((p) => p !== poleId)
        : [...prev.poles, poleId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-foreground">Prénom</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="bg-secondary" />
            </div>
            <div className="space-y-1">
              <Label className="text-foreground">Nom</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="bg-secondary" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-foreground">Rôle</Label>
            <Select value={form.role} onValueChange={(v: "admin" | "user") => setForm({ ...form, role: v })}>
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Pôles (détermine l'accès aux espaces)</Label>
            <div className="grid grid-cols-2 gap-2">
              {poles?.map((pole) => (
                <label key={pole.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    checked={form.poles.includes(pole.id)}
                    onCheckedChange={() => togglePole(pole.id)}
                  />
                  {pole.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Compte actif</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>
          <Button
            variant="gold"
            className="w-full"
            onClick={() => updateUser.mutate()}
            disabled={updateUser.isPending}
          >
            {updateUser.isPending ? "Mise à jour..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
