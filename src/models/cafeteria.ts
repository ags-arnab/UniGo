import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Base properties for all menu items
interface BaseMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens?: string[];
  ingredients?: string[];
  imagePath?: string | null; // Path in Supabase storage
  available: boolean;
  counterId: string; // FK to counters table
  stock?: number;
  // Optional: Include related counter data if fetched via join
  counters?: {
    vendor_id: string;
  } | null;
}

// Interface for diet food items where nutritional info and calories are required
export interface DietFoodItem extends BaseMenuItem {
  isDietFood: true;
  calories: number;
  nutritionalInfo: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Interface for non-diet food items where nutritional info is optional and calories are absent
export interface NonDietFoodItem extends BaseMenuItem {
  isDietFood?: false; // Optional or explicitly false
  nutritionalInfo?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

// Union type for MenuItem
export type MenuItem = DietFoodItem | NonDietFoodItem;

// Type for time slots (can be refined later)
export type TimeSlot = string;

// Define the possible statuses for an order
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'partially_ready' | 'partially_delivered' | 'partially_completed' | 'completed' | 'cancelled';

// Define order interface (as stored or fetched initially)
export interface Order {
  id: string;
  userId: string;
  // Added fields returned directly by the RPC function
  student_full_name?: string | null;
  student_reg_id?: string | null;
  items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    priceAtOrder: number;
    counterId: string;
    specialInstructions?: string;
    status: 'pending' | 'preparing' | 'ready' | 'delivered';
    counterName?: string | null;
    // Optional menu item details joined from menu_items table
    menuItem?: {
      name: string;
    };
  }>;
  totalPrice: number;
  subtotal?: number;
  tax?: number;
  status: OrderStatus; // Use the exported OrderStatus type
  createdAt: Date;
  updatedAt?: Date;
  pickupTime?: Date;
  payment_method?: 'online' | 'cash';
  ready_at?: Date | string | null; // Timestamp when the order became ready
}

// Export the correct type for an item within an order
export type OrderLineItem = Order['items'][number];

// Define cafeteria store state (Refactored: Student cart logic moved)
interface CafeteriaState {
  menuItems: MenuItem[]; // Keep for general menu display?
  currentOrder: Order | null; // Keep for potential immediate order confirmation?
  loading: boolean;
  error: string | null;

  // Menu actions
  fetchMenuItems: () => Promise<void>;

  // --- Admin/Vendor State ---
  adminMenuItems: MenuItem[]; // All items for admin management
  allOrders: Order[]; // All orders for admin view

  // --- Admin/Vendor Actions ---
  fetchAdminMenuItems: () => Promise<void>;
  addMenuItem: (newItemData: Omit<MenuItem, 'id'>) => Promise<MenuItem>;
  updateMenuItem: (itemId: string, updatedItemData: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  updateItemStock: (itemId: string, newStock: number) => Promise<void>;
}

// Create cafeteria store with dev tools (Refactored: Student cart logic moved)
export const useCafeteriaStore = create<CafeteriaState>()(
  devtools(
    (set, get) => ({
      // Initial state
      menuItems: [],
      currentOrder: null,
      loading: false,
      error: null,

      // --- Admin/Vendor State Initialization ---
      adminMenuItems: [],
      allOrders: [],

      // Fetch menu items (Placeholder - actual logic in controller)
      fetchMenuItems: async () => {
        set({ loading: true, error: null });
        try {
          console.warn("fetchMenuItems in Zustand store is using mock delay, should be replaced by API call.");
          await new Promise(resolve => setTimeout(resolve, 10));
          set({ menuItems: [], loading: false }); // Clear mock data
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch menu items', menuItems: [], loading: false });
        }
      },

      // --- Admin/Vendor Actions Implementation (Placeholders/Mocks) ---

      fetchAdminMenuItems: async () => {
        set({ loading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          const allItems = get().menuItems.length > 0 ? get().menuItems : (await get().fetchMenuItems(), get().menuItems);
          set({ adminMenuItems: allItems, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch admin menu items', loading: false });
        }
      },

      addMenuItem: async (newItemData: Omit<MenuItem, 'id'>) => {
        set({ loading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 700));
          const baseNewItem = { ...newItemData, id: `item-${Math.floor(Math.random() * 10000)}` };
          const newItem = (baseNewItem.isDietFood ? baseNewItem : { ...baseNewItem, isDietFood: false }) as MenuItem;
          set(state => ({
            adminMenuItems: [...state.adminMenuItems, newItem],
            menuItems: newItem.available ? [...state.menuItems, newItem] : state.menuItems,
            loading: false
          }));
          return newItem;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add menu item', loading: false });
          throw error;
        }
      },

      updateMenuItem: async (itemId: string, updatedItemData: Partial<MenuItem>) => {
        set({ loading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 600));
          let updatedItem: MenuItem | undefined = undefined;
          set(state => {
            const newAdminItems = state.adminMenuItems.map(item => {
              if (item.id === itemId) {
                 updatedItem = { ...item, ...updatedItemData } as MenuItem;
                 return updatedItem;
              }
              return item;
            });
            let newMenuItems = state.menuItems
              .map(item => (item.id === itemId && updatedItem ? updatedItem : item))
              .filter(item => item.available);
            if (updatedItem && updatedItem.available && !newMenuItems.some(i => i.id === itemId)) {
               newMenuItems.push(updatedItem);
            }
            const finalAdminItems = newAdminItems.filter(item => item !== undefined) as MenuItem[];
            return {
              adminMenuItems: finalAdminItems,
              menuItems: newMenuItems,
              loading: false
            };
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update menu item', loading: false });
          throw error;
        }
      },

      deleteMenuItem: async (itemId: string) => {
        set({ loading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          set(state => ({
            adminMenuItems: state.adminMenuItems.filter(item => item.id !== itemId),
            menuItems: state.menuItems.filter(item => item.id !== itemId),
            loading: false
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete menu item', loading: false });
          throw error;
        }
      },

      fetchAllOrders: async () => {
        set({ loading: true, error: null });
        try {
          console.warn("fetchAllOrders in Zustand store is using mock delay, should be replaced by API call.");
          await new Promise(resolve => setTimeout(resolve, 10));
          set({ allOrders: [], loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch all orders', allOrders: [], loading: false });
        }
      },

      updateOrderStatus: async (orderId: string, newStatus: Order['status']) => {
        set({ loading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 400));
          set(state => ({
            allOrders: state.allOrders.map(order =>
              order.id === orderId ? { ...order, status: newStatus } : order
            ),
            loading: false
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update order status', loading: false });
          throw error;
        }
      },

      updateItemStock: async (itemId: string, newStock: number) => {
        set({ loading: true, error: null });
        if (newStock < 0) {
           set({ error: 'Stock cannot be negative', loading: false });
           throw new Error('Stock cannot be negative');
        }
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          set(state => ({
            adminMenuItems: state.adminMenuItems.map(item =>
              item.id === itemId ? { ...item, stock: newStock } : item
            ),
            menuItems: state.menuItems.map(item =>
              item.id === itemId ? { ...item, stock: newStock } : item
            ),
            loading: false
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update item stock', loading: false });
          throw error;
        }
      },

    }),
    { name: 'CafeteriaStore (Admin/Vendor)' }
  )
);
