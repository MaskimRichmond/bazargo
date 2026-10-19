export type Platform = "web" | "android" | "ios" | "desktop";

export type RfqCategoryTag =
  | "packaging"
  | "cups"
  | "syrups"
  | "food"
  | "cleaning"
  | "textiles"
  | "printing"
  | "equipment"
  | "coffee"
  | "other";

export type ParsedRfqResponse = {
  title: string;
  category_tag: RfqCategoryTag;
  specs: string;
  quantity: number;
  unit: string;
  max_price: number | null;
  total_budget?: number | null;
  city: string;
  deadline_days: number;
  raw_ai_prompt?: string;
  parsed_by?: "gemini" | "fallback";
};

export type RfqRequest = {
  id: string;
  title: string;
  quantity: number;
  unit: string;
  specs: string;
  max_price: number | null;
  budget?: number | null;
  total_budget?: number | null;
  city: string;
  deadline_days: number;
  raw_ai_prompt?: string | null;
  category_tag: RfqCategoryTag;
  category_id?: string | null;
  buyer_id?: string | null;
  user_id?: string | null;
  status: "OPEN" | "CLOSED" | "CANCELLED" | string;
  description?: string | null;
  created_at?: string;
  expires_at?: string | null;
  profiles?: {
    id?: string;
    full_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
  offers_count?: number;
  offers?: RfqOffer[];
};

export type RfqOffer = {
  id: string;
  request_id: string;
  supplier_id: string;
  unit_price: number;
  offered_quantity: number;
  moq: number;
  delivery_cost: number;
  lead_time_days: number;
  total_cost: number;
  message?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  created_at?: string;
  profiles?: {
    id?: string;
    full_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
};

export type SupplierApplication = {
  id: string;
  user_id: string;
  company_name: string;
  inn?: string | null;
  categories: string[];
  contact_person: string;
  phone: string;
  email?: string | null;
  telegram_username?: string | null;
  website?: string | null;
  comment?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  created_at?: string;
};

export type SupplierProduct = {
  id: string;
  supplier_id: string;
  company_name: string;
  title: string;
  category_tag: RfqCategoryTag | string;
  specs?: string | null;
  unit: string;
  unit_price: number;
  moq: number;
  delivery_cost: number;
  lead_time_days: number;
  city?: string | null;
  phone?: string | null;
  telegram_username?: string | null;
  in_stock?: boolean;
  created_at?: string;
};

export type Listing = {
  id: string;
  title: string;
  price: number;
  city: string;
  status: string;
  listing_images?: { url: string }[];
};

export type CartItem = { id: string; quantity: number; listings: Listing; };
