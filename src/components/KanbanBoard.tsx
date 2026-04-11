import React from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  DragOverlay,
  defaultDropAnimation,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  closestCorners
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Workflow } from '../types';
import { db, doc, updateDoc } from '../firebase';
import { cn } from '../lib/utils';
import { Zap, Clock, AlertCircle, MoreVertical, GripVertical, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface KanbanBoardProps {
  workflows: Workflow[];
  onSelectWorkflow: (workflow: Workflow) => void;
}

const COLUMNS = [
  { id: 'Pending', title: 'Pending' },
  { id: 'In Progress', title: 'In Progress' },
  { id: 'Completed', title: 'Completed' }
] as const;

export default function KanbanBoard({ workflows, onSelectWorkflow }: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const collisionDetectionStrategy = React.useCallback((args: any) => {
    // First, try pointerWithin
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    
    // Fallback to closestCorners which is better for Kanban than rectIntersection
    return closestCorners(args);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // If dropped over a column or an item in a column
    let newStatus: Workflow['status'] = undefined;
    
    if (overId === 'Pending' || overId === 'In Progress' || overId === 'Completed') {
      newStatus = overId as Workflow['status'];
    } else {
      // Find the status of the item we dropped over
      const overItem = workflows.find(w => w.id === overId);
      if (overItem) {
        newStatus = overItem.status || 'Pending';
      }
    }

    const activeItem = workflows.find(w => w.id === activeId);
    if (activeItem && newStatus && activeItem.status !== newStatus) {
      try {
        const workflowRef = doc(db, 'workflows', activeId);
        await updateDoc(workflowRef, { status: newStatus });
      } catch (error) {
        console.error("Failed to update workflow status:", error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext 
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          {COLUMNS.map((column) => (
            <KanbanColumn 
              key={column.id} 
              id={column.id} 
              title={column.title} 
              workflows={workflows.filter(w => (w.status || 'Pending') === column.id)}
              onSelectWorkflow={onSelectWorkflow}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <div className="w-[300px]">
              <SortableKanbanCard 
                workflow={workflows.find(w => w.id === activeId)!} 
                onClick={() => {}} 
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface KanbanColumnProps {
  id: string;
  title: string;
  workflows: Workflow[];
  onSelectWorkflow: (workflow: Workflow) => void;
}

function KanbanColumn({ id, title, workflows, onSelectWorkflow }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col bg-aec-card/20 rounded-xl border border-aec-border overflow-hidden"
    >
      <div className="p-4 border-b border-aec-border bg-aec-card/40 flex items-center justify-between">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <span className={cn(
            "w-2 h-2 rounded-full",
            id === 'Pending' ? "bg-slate-500" : id === 'In Progress' ? "bg-aec-accent" : "bg-emerald-500"
          )} />
          {title}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
            {workflows.length}
          </span>
        </h3>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <SortableContext 
          id={id}
          items={workflows.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          {workflows.map((workflow) => (
            <SortableKanbanCard 
              key={workflow.id} 
              workflow={workflow} 
              onClick={() => onSelectWorkflow(workflow)}
            />
          ))}
          {workflows.length === 0 && (
            <div className="border-2 border-dashed border-aec-border/50 rounded-xl p-8 text-center">
              <p className="text-xs text-slate-500">Drop items here</p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

interface SortableKanbanCardProps {
  workflow: Workflow;
  onClick: () => void;
  isOverlay?: boolean;
}

function SortableKanbanCard({ workflow, onClick, isOverlay }: SortableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: workflow.id, disabled: isOverlay });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative bg-aec-card border border-aec-border rounded-xl p-4 hover:border-aec-accent/50 transition-all cursor-pointer shadow-sm touch-none",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "shadow-2xl border-aec-accent ring-2 ring-aec-accent/20 cursor-grabbing rotate-2 scale-105"
      )}
      onClick={(e) => {
        // Prevent click if we were dragging
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) {
          return;
        }
        onClick();
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
          workflow.category === 'Architecture' ? "bg-blue-500/10 text-blue-400" :
          workflow.category === 'BIM' ? "bg-aec-accent/10 text-aec-accent" :
          workflow.category === 'Structural' ? "bg-orange-500/10 text-orange-400" :
          workflow.category === 'MEP' ? "bg-purple-500/10 text-purple-400" :
          "bg-slate-500/10 text-slate-400"
        )}>
          {workflow.category}
        </span>
        <div className="flex items-center gap-2">
          {workflow.isPublic && (
            <div className="p-1 bg-blue-500/10 rounded text-blue-400" title="Public Workflow">
              <Globe className="w-3 h-3" />
            </div>
          )}
          <div className="p-1 hover:bg-slate-800 rounded text-slate-500">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
      </div>

      <h4 className="font-bold text-slate-200 text-sm mb-2 line-clamp-1">{workflow.title}</h4>
      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
        {workflow.description}
      </p>

      <div className="flex items-center justify-between pt-3 border-t border-aec-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-aec-accent" />
            <span className="text-[10px] font-bold text-slate-300">{workflow.automationPotential}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-400">{workflow.estimatedEffort || 'N/A'}</span>
          </div>
        </div>
        <div className={cn(
          "w-2 h-2 rounded-full",
          workflow.priority === 'P0' ? "bg-red-500" :
          workflow.priority === 'P1' ? "bg-orange-500" :
          workflow.priority === 'P2' ? "bg-blue-500" :
          "bg-slate-500"
        )} />
      </div>
    </div>
  );
}
