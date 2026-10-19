export type Platform = "web" | "android" | "ios" | "desktop";
// Will gradually move Supabase types here

export type Listing = {
  id: string;
  title: string;
  price: number;
  city: string;
  status: string;
  listing_images?: { url: string }[];
};

export type CartItem = { id: string; quantity: number; listings: Listing; };
