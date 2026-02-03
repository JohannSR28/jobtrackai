"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

interface Props {
  id: string;
  children: ReactNode;
}

export function DraggableAppCard({ id, children }: Props) {
  // 1. Configurer l'élément comme DRAGGABLE (Source)
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: id,
    data: { type: "APP_CARD", id }, // Metadonnées utiles
  });

  // 2. Configurer l'élément comme DROPPABLE (Target)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: id,
    data: { type: "APP_CARD", id },
  });

  // Style pour le mouvement
  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : undefined,
    position: "relative" as const,
    opacity: isDragging ? 0.8 : 1,
    touchAction: "none", // Important pour éviter le scroll pendant le drag tactile
  };

  return (
    <div
      ref={(node) => {
        // On combine les refs : cet élément est à la fois draggable et droppable
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={`transition-all duration-200 rounded-2xl ${
        isOver && !isDragging
          ? "ring-4 ring-green-400 bg-green-50 scale-105"
          : ""
      }`}
    >
      {/* Si on drag, on peut ajouter un effet visuel (shadow, rotate).
         L'élément enfant (ta carte actuelle) sera rendu ici.
      */}
      {children}
    </div>
  );
}
