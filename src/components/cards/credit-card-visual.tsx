"use client";

import { useRef, useState } from "react";
import { getCardGradient, maskCardNumber } from "@/lib/utils";
import type { CreditCard } from "@/lib/types/database";
import { Wifi } from "lucide-react";

interface CreditCardVisualProps {
  card: CreditCard;
  index?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onClick?: () => void;
}

const networkLogos: Record<string, React.ReactNode> = {
  visa: (
    <span className="font-bold tracking-widest text-[#1a1f71] text-lg">VISA</span>
  ),
  mastercard: (
    <div className="flex -space-x-2">
      <div className="w-6 h-6 rounded-full bg-red-500/90 mix-blend-multiply" />
      <div className="w-6 h-6 rounded-full bg-yellow-400/90 mix-blend-multiply" />
    </div>
  ),
  rupay: (
    <span className="font-bold tracking-tight text-[#f16322] text-sm">RuPay</span>
  ),
  amex: (
    <span className="font-bold tracking-tighter text-[#016fd0] text-sm">AMEX</span>
  ),
};

export function CreditCardVisual({
  card,
  index = 0,
  size = "md",
  interactive = true,
  onClick,
}: CreditCardVisualProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotation({
      x: (y - 0.5) * -12,
      y: (x - 0.5) * 12,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const sizeClasses = {
    sm: "w-56 h-36 p-4 text-xs rounded-2xl",
    md: "w-72 h-44 p-5 text-sm rounded-[1.25rem]",
    lg: "w-80 h-48 p-6 text-base rounded-[1.5rem]",
  };

  return (
    <div
      className="perspective-[1000px]"
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className={`
          ${sizeClasses[size]} ${getCardGradient(index)}
          relative overflow-hidden
          flex flex-col justify-between
          text-white select-none
          
          transition-transform duration-300 ease-out
          ${interactive ? "cursor-pointer" : ""}
          ${isHovered ? "" : ""}
        `}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Shine overlay */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: isHovered ? 0.3 : 0,
            background: `radial-gradient(circle at ${
              ((rotation.y + 6) / 12) * 100
            }% ${((rotation.x + 6) / 12) * 100}%, rgba(255,255,255,0.8), transparent 60%)`,
          }}
        />

        {/* Top row: Bank & Network */}
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="font-semibold text-white/90 tracking-wide uppercase text-[0.65rem]">
              {card.bank_name}
            </p>
            {card.card_name && (
              <p className="text-[0.65rem] font-medium text-white/70 mt-0.5">{card.card_name}</p>
            )}
          </div>
          <Wifi className="w-5 h-5 text-white/60 rotate-90" />
        </div>

        {/* Card chip */}
        <div className="relative z-10 mt-auto mb-2">
          <div className="w-9 h-6 rounded bg-gradient-to-br from-yellow-200/90 to-yellow-400/80 border border-yellow-500/20" />
        </div>

        {/* Bottom: Number & Network */}
        <div className="flex justify-between items-end relative z-10 mt-2">
          <p className="font-mono tracking-[0.15em] text-white/90 text-sm font-semibold">
            {maskCardNumber(card.last_four_digits)}
          </p>
          <div className="flex-shrink-0">
            {networkLogos[card.card_network?.toLowerCase() ?? ""] ?? (
              <span className="text-[0.6rem] text-white/70 uppercase font-bold">
                {card.card_network ?? "CARD"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
