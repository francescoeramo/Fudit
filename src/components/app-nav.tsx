import {
  CalendarDays,
  ChefHat,
  CircleDollarSign,
  FileHeart,
  Settings,
  ShoppingBasket,
} from "lucide-react";
import { AppTab } from "@/hooks/use-fudit-store";

const items = [
  ["plan", CalendarDays, "Pianifica"],
  ["shop", ShoppingBasket, "Spesa"],
  ["recipes", ChefHat, "Ricette"],
  ["diet", FileHeart, "Dieta"],
  ["prices", CircleDollarSign, "Prezzi"],
  ["settings", Settings, "Impostazioni"],
] as const;

export default function AppNav({
  active,
  onChange,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  return (
    <nav className="nav" aria-label="Sezioni principali">
      {items.map(([id, Icon, label]) => (
        <button
          key={id}
          className={`tab ${active === id ? "active" : ""}`}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={18} />
          <br />
          {label}
        </button>
      ))}
    </nav>
  );
}
