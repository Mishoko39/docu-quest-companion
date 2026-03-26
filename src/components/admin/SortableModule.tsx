import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, FileText, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableLesson from "./SortableLesson";

interface SortableModuleProps {
  mod: any;
  onTogglePublish: (table: string, id: string, currentStatus: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onToggleLessonPublish: (id: string, currentStatus: string) => void;
}

const SortableModule = ({ mod, onTogglePublish, onAddLesson, onEditLesson, onToggleLessonPublish }: SortableModuleProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mod.id,
    data: { type: "module" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sortedLessons = [...(mod.lessons || [])].sort((a: any, b: any) => a.order_index - b.order_index);

  return (
    <div ref={setNodeRef} style={style} className="border-t border-border">
      <div className="flex items-center justify-between p-3 pl-6">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
            <GripVertical className="h-4 w-4" />
          </button>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{mod.title}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${mod.status === "published" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
            {mod.status === "published" ? "Publié" : "Brouillon"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onTogglePublish("modules", mod.id, mod.status)} className="text-xs">
            {mod.status === "published" ? "Dépublier" : "Publier"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAddLesson(mod.id)} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Leçon
          </Button>
        </div>
      </div>

      <SortableContext items={sortedLessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
        {sortedLessons.map((lesson: any) => (
          <SortableLesson
            key={lesson.id}
            lesson={lesson}
            onEdit={onEditLesson}
            onTogglePublish={onToggleLessonPublish}
          />
        ))}
      </SortableContext>
    </div>
  );
};

export default SortableModule;
