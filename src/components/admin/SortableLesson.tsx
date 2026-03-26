import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableLessonProps {
  lesson: any;
  onEdit: (lessonId: string) => void;
  onTogglePublish: (id: string, currentStatus: string) => void;
}

const SortableLesson = ({ lesson, onEdit, onTogglePublish }: SortableLessonProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: "lesson", moduleId: lesson.module_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-2 pl-12 border-t border-border/50">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-foreground">{lesson.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(lesson.id)} className="text-xs">
          Éditer
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onTogglePublish(lesson.id, lesson.status)} className="text-xs">
          {lesson.status === "published" ? "Dépublier" : "Publier"}
        </Button>
      </div>
    </div>
  );
};

export default SortableLesson;
