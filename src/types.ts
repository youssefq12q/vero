export interface Product {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  price: number;
  image: string;
  secondaryImages: string[];
  description: string;
  tagline: string;
  isNew?: boolean;
  materialOptions?: string[]; // hex codes or names
  sizeOptions?: string[];
  details?: string[];
  craftsmanship?: string;
  stock?: number; // Stock quantity (undefined or null or a positive number)
}

export interface CartItem {
  id: string; // unique cart item id (e.g., prod_id + size + material)
  product: Product;
  quantity: number;
  selectedMaterial: string; // hex or name
  selectedSize: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  provider: "google" | "facebook" | "apple" | "email";
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  loyaltyPoints: number;
  totalSpent?: number; // Lifetime total spending in EGP
  joinedDate: string;
  redeemedRewards?: string[];
}

export function getTierFromSpent(
  spent: number,
): "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" {
  if (spent >= 150000) return "Diamond";
  if (spent >= 70000) return "Platinum";
  if (spent >= 30000) return "Gold";
  if (spent >= 10000) return "Silver";
  return "Bronze";
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  total: number;
  status: string;
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingPhone?: string;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
      image: string;
      categoryName: string;
    };
    quantity: number;
    selectedMaterial: string;
    selectedSize: string;
  }[];
}

export interface Reward {
  id: string;
  title: string;
  titleEn: string;
  cost: number;
  code: string;
  description: string;
  descriptionEn: string;
  discountPercent: number;
}

export interface Promo {
  id: string;
  code: string;
  discountPercent: number;
}
