import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    },
  });

  const hasUnread = notifications?.some((n) => !n.is_read);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications?.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 rounded-lg border transition-colors cursor-pointer ${
              notif.is_read
                ? "bg-card border-border"
                : "bg-primary/5 border-accent/30"
            }`}
            onClick={() => {
              if (!notif.is_read) markRead.mutate(notif.id);
              if (notif.link) navigate(notif.link);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-foreground">{notif.title}</p>
                {notif.message && (
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              {!notif.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    markRead.mutate(notif.id);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {notifications?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune notification</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
