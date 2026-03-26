import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil } from "lucide-react";
import EditUserDialog from "@/components/admin/EditUserDialog";

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "user" as "admin" | "user",
    poles: [] as string[],
  });

  const { data: poles } = useQuery({
    queryKey: ["poles"],
    queryFn: async () => {
      const { data } = await supabase.from("poles").select("*");
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes, polesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_poles").select("user_id, pole_id, pole:poles(name, slug)"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      const roles = rolesRes.data || [];
      const userPoles = polesRes.data || [];
      return (profilesRes.data || []).map((p) => ({
        ...p,
        user_roles: roles.filter((r) => r.user_id === p.user_id),
        user_poles: userPoles.filter((up) => up.user_id === p.user_id),
      }));
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          pole_ids: form.poles,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Utilisateur créé avec succès" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setForm({ email: "", password: "", first_name: "", last_name: "", role: "user", poles: [] });
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

  const [editUser, setEditUser] = useState<any>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" className="gap-2">
              <Plus className="h-4 w-4" /> Nouveau
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Créer un utilisateur</DialogTitle>
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
                <Label className="text-foreground">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary" />
              </div>
              <div className="space-y-1">
                <Label className="text-foreground">Mot de passe</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-secondary" />
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
                <Label className="text-foreground">Pôles</Label>
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
              <Button
                variant="gold"
                className="w-full"
                onClick={() => createUser.mutate()}
                disabled={createUser.isPending}
              >
                {createUser.isPending ? "Création..." : "Créer l'utilisateur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Nom</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Rôle</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Pôles</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Statut</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <td className="p-3">
                  <p className="text-foreground font-medium">{u.first_name} {u.last_name}</p>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    u.user_roles?.[0]?.role === "admin" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary-foreground"
                  }`}>
                    {u.user_roles?.[0]?.role || "user"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {u.user_poles?.map((up: any) => (
                      <span key={up.pole_id} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {up.pole?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    u.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  }`}>
                    {u.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
