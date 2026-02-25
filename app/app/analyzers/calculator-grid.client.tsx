"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";

export interface CalculatorCard {
  id: string;
  href: string;
  emoji: string;
  title: string;
  description: string;
  footerText: string;
  footerCount?: number;
  footerCountLabel?: string;
  background?: string;
}

const STORAGE_KEY = "calculator-card-order";

function getStoredOrder(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function storeOrder(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export default function CalculatorGrid({ cards }: { cards: CalculatorCard[] }) {
  const [orderedCards, setOrderedCards] = useState<CalculatorCard[]>(cards);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  // On mount, restore saved order
  useEffect(() => {
    const storedOrder = getStoredOrder();
    if (storedOrder) {
      const cardMap = new Map(cards.map((c) => [c.id, c]));
      const reordered: CalculatorCard[] = [];
      for (const id of storedOrder) {
        const card = cardMap.get(id);
        if (card) {
          reordered.push(card);
          cardMap.delete(id);
        }
      }
      // Append any new cards not in stored order
      for (const card of cardMap.values()) {
        reordered.push(card);
      }
      setOrderedCards(reordered);
    }
  }, [cards]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDragIndex(index);
      dragNode.current = e.currentTarget;
      e.dataTransfer.effectAllowed = "move";
      // Make the drag image slightly transparent
      requestAnimationFrame(() => {
        if (dragNode.current) {
          dragNode.current.style.opacity = "0.4";
        }
      });
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) {
      dragNode.current.style.opacity = "1";
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragIndex === null || dragIndex === index) return;
      setDragOverIndex(index);
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) return;
      setOrderedCards((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(dropIndex, 0, moved);
        storeOrder(updated.map((c) => c.id));
        return updated;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex]
  );

  const handleResetOrder = useCallback(() => {
    setOrderedCards(cards);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [cards]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <button
          onClick={handleResetOrder}
          style={{
            background: "none",
            border: "1px solid #e6e6e6",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 12,
            cursor: "pointer",
            opacity: 0.6,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          title="Reset to default order"
        >
          Reset Order
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {orderedCards.map((card, index) => (
          <div
            key={card.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragLeave={() => setDragOverIndex(null)}
            style={{
              cursor: "grab",
              position: "relative",
              borderRadius: 14,
              outline:
                dragOverIndex === index
                  ? "2px dashed #3b82f6"
                  : "2px solid transparent",
              outlineOffset: -2,
              transition: "outline 0.15s, transform 0.15s",
              transform:
                dragOverIndex === index ? "scale(1.02)" : "scale(1)",
            }}
          >
            <Link
              href={card.href}
              style={{
                padding: 24,
                border: "1px solid #e6e6e6",
                borderRadius: 12,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "border-color 0.2s",
                background: card.background || undefined,
              }}
              draggable={false}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {card.emoji}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    opacity: 0.25,
                    cursor: "grab",
                    userSelect: "none",
                  }}
                  title="Drag to reorder"
                >
                  ⠿
                </div>
              </div>
              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {card.title}
              </h2>
              <p
                style={{
                  margin: "0 0 16px 0",
                  opacity: 0.7,
                  fontSize: 14,
                }}
              >
                {card.description}
              </p>
              <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                {card.footerCount !== undefined ? (
                  <div>
                    <span style={{ fontWeight: 700 }}>{card.footerCount}</span>{" "}
                    <span style={{ opacity: 0.7 }}>{card.footerCountLabel}</span>
                  </div>
                ) : (
                  <div>
                    <span style={{ opacity: 0.7 }}>{card.footerText}</span>
                  </div>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
