import { supabase } from '@/lib/supabaseClient';
import { MenuItem, Order } from "@/models/cafeteria";
import { Counter } from "@/models/vendor/counter";

// Basic types for new entities (consider moving to models later)

// Category Type
export interface Category {
    id: string;
    vendorId: string;
    name: string;
    description?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorSettings {
    id: string;
    vendorId: string;
    shopName?: string | null;
    workingHours?: any | null; // JSONB - structure TBD
    isOpen: boolean;
    orderLimit?: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TaxRate {
    id: string;
    vendorId: string;
    name: string;
    rate: number;
    description?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}


// Helper function to map DB snake_case to frontend camelCase (basic example)
const mapMenuItemFromDb = (dbItem: any): MenuItem => {
  const baseItem = {
    id: dbItem.id,
    counterId: dbItem.counter_id,
    name: dbItem.name,
    description: dbItem.description,
    price: dbItem.price,
    category: dbItem.category,
    allergens: dbItem.allergens || [],
    ingredients: dbItem.ingredients || [],
    imagePath: dbItem.image_path,
    available: dbItem.available,
    stock: dbItem.stock,
  };

  if (dbItem.is_diet_food) {
    return {
      ...baseItem,
      isDietFood: true,
      calories: dbItem.calories,
      nutritionalInfo: {
        protein: dbItem.protein,
        carbs: dbItem.carbs,
        fat: dbItem.fat,
      },
    };
  } else {
    return {
      ...baseItem,
      isDietFood: false,
      nutritionalInfo: {
        protein: dbItem.protein,
        carbs: dbItem.carbs,
        fat: dbItem.fat,
      },
    };
  }
};


const mapCounterFromDb = (dbCounter: any): Counter => ({
    id: dbCounter.id,
    vendorId: dbCounter.vendor_id,
    name: dbCounter.name,
    location: dbCounter.location,
    isActive: dbCounter.is_active,
});

const mapVendorSettingsFromDb = (dbSettings: any): VendorSettings => ({
    id: dbSettings.id,
    vendorId: dbSettings.vendor_id,
    shopName: dbSettings.shop_name,
    workingHours: dbSettings.working_hours,
    isOpen: dbSettings.is_open,
    orderLimit: dbSettings.order_limit,
    createdAt: new Date(dbSettings.created_at),
    updatedAt: new Date(dbSettings.updated_at),
});

const mapTaxRateFromDb = (dbRate: any): TaxRate => ({
    id: dbRate.id,
    vendorId: dbRate.vendor_id,
    name: dbRate.name,
    rate: dbRate.rate,
    description: dbRate.description,
    isActive: dbRate.is_active,
    createdAt: new Date(dbRate.created_at),
    updatedAt: new Date(dbRate.updated_at),
});

const mapCategoryFromDb = (dbCategory: any): Category => ({
    id: dbCategory.id,
    vendorId: dbCategory.vendor_id,
    name: dbCategory.name,
    description: dbCategory.description,
    createdAt: new Date(dbCategory.created_at),
    updatedAt: new Date(dbCategory.updated_at),
});


// Map Order base data from RPC function result
const mapOrderFromRpcResult = (rpcResult: any): Omit<Order, 'items'> => ({
    id: rpcResult.id,
    userId: rpcResult.user_id,
    student_full_name: rpcResult.student_full_name,
    student_reg_id: rpcResult.student_reg_id,
    totalPrice: rpcResult.total_price,
    subtotal: rpcResult.subtotal,
    tax: rpcResult.tax,
    status: rpcResult.status as Order['status'],
    payment_method: rpcResult.payment_method as 'online' | 'cash' | undefined,
    pickupTime: rpcResult.pickup_time ? new Date(rpcResult.pickup_time) : undefined,
    createdAt: new Date(rpcResult.created_at),
});

/**
 * Vendor Cafeteria Controller - Handles cafeteria business logic for Vendors using Supabase.
 */
export class VendorCafeteriaController {

  /**
   * Fetches menu items associated with the logged-in vendor's counters.
   */
  static async getVendorMenuItems(counterId?: string): Promise<MenuItem[]> {
    let query = supabase
      .from('menu_items')
      .select('*');

    if (counterId) {
      query = query.eq('counter_id', counterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching vendor menu items (counterId: ${counterId}):`, error);
      throw error;
    }
    return data?.map(mapMenuItemFromDb) || [];
  }

  /**
   * Fetches details for a single menu item by its ID.
   */
  static async getMenuItemDetails(itemId: string): Promise<MenuItem | null> {
    if (!itemId) {
        console.warn("getMenuItemDetails called with no itemId");
        return null;
    }
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle(); // Use maybeSingle as the item might not exist

    if (error) {
        console.error(`Error fetching menu item details for ID ${itemId}:`, error);
        // Don't throw, return null, let caller handle
        return null;
    }
    return data ? mapMenuItemFromDb(data) : null;
  }


  /**
   * Creates a new menu item for one of the vendor's counters.
   */
  static async createMenuItem(newItemData: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    if (!newItemData.name || newItemData.price <= 0 || !newItemData.counterId) {
      throw new Error('Invalid menu item data: Name, positive price, and counter ID are required.');
    }

    const dbData = {
        counter_id: newItemData.counterId,
        name: newItemData.name,
        description: newItemData.description,
        price: newItemData.price,
        category: newItemData.category,
        allergens: newItemData.allergens,
        ingredients: newItemData.ingredients,
        image_path: newItemData.imagePath,
        available: newItemData.available,
        stock: newItemData.stock,
        is_diet_food: newItemData.isDietFood ?? false,
        calories: newItemData.isDietFood ? (newItemData as any).calories : null,
        protein: newItemData.nutritionalInfo?.protein,
        carbs: newItemData.nutritionalInfo?.carbs,
        fat: newItemData.nutritionalInfo?.fat,
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
    if (!data) {
        throw new Error('Failed to create menu item, no data returned.');
    }
    return mapMenuItemFromDb(data);
  }

  /**
   * Updates an existing menu item belonging to the vendor.
   */
  static async editMenuItem(itemId: string, updatedItemData: Partial<MenuItem>): Promise<void> {
    if (!itemId) {
      throw new Error('Menu item ID is required for update');
    }

    const dbUpdateData: { [key: string]: any } = {};
    if (updatedItemData.counterId !== undefined) dbUpdateData.counter_id = updatedItemData.counterId;
    if (updatedItemData.name !== undefined) dbUpdateData.name = updatedItemData.name;
    if (updatedItemData.description !== undefined) dbUpdateData.description = updatedItemData.description;
    if (updatedItemData.price !== undefined) dbUpdateData.price = updatedItemData.price;
    if (updatedItemData.category !== undefined) dbUpdateData.category = updatedItemData.category;
    if (updatedItemData.allergens !== undefined) dbUpdateData.allergens = updatedItemData.allergens;
    if (updatedItemData.ingredients !== undefined) dbUpdateData.ingredients = updatedItemData.ingredients;
    if (updatedItemData.imagePath !== undefined) dbUpdateData.image_path = updatedItemData.imagePath;
    if (updatedItemData.available !== undefined) dbUpdateData.available = updatedItemData.available;
    if (updatedItemData.stock !== undefined) dbUpdateData.stock = updatedItemData.stock;
    if (updatedItemData.isDietFood !== undefined) dbUpdateData.is_diet_food = updatedItemData.isDietFood;

    if ('calories' in updatedItemData && updatedItemData.calories !== undefined) {
        const isDiet = updatedItemData.isDietFood ?? dbUpdateData.is_diet_food;
        dbUpdateData.calories = isDiet ? updatedItemData.calories : null;
    } else if (updatedItemData.isDietFood === false) {
        dbUpdateData.calories = null;
    }

    if (updatedItemData.nutritionalInfo !== undefined) {
        dbUpdateData.protein = updatedItemData.nutritionalInfo.protein;
        dbUpdateData.carbs = updatedItemData.nutritionalInfo.carbs;
        dbUpdateData.fat = updatedItemData.nutritionalInfo.fat;
    } else if (updatedItemData.isDietFood === false) {
         // Optionally nullify
    }

     if (Object.keys(dbUpdateData).length === 0) {
        console.warn("editMenuItem called with no data to update.");
        return;
     }

    const { error } = await supabase
      .from('menu_items')
      .update(dbUpdateData)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  /**
   * Deletes a menu item belonging to the vendor.
   */
  static async removeMenuItem(itemId: string): Promise<void> {
    if (!itemId) {
      throw new Error('Menu item ID is required for deletion');
    }
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting menu item:', error);
      if (error.code === '23503') {
          throw new Error('Cannot delete menu item as it is part of an existing order.');
      }
      throw error;
    }
  }

  /**
   * Fetches all orders associated with the logged-in vendor's counters, including student details and items.
   */
  static async getVendorOrders(): Promise<Order[]> {
    // Call the database function to get base order details + student info
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_vendor_orders_with_student_details');

    if (rpcError) {
      console.error('Error calling get_vendor_orders_with_student_details RPC:', rpcError);
      throw rpcError;
    }
    if (!rpcData) {
        return []; // No orders found or RPC returned null/empty
    }

    // Map the basic order data returned by the RPC function
    const ordersBase: Array<Omit<Order, 'items'>> = rpcData.map(mapOrderFromRpcResult);

    // Fetch all relevant order items in one go
    const orderIds = ordersBase.map((o) => o.id);
    let allItems: any[] = [];

    if (orderIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
                id,
                order_id,
                menu_item_id,
                quantity,
                price_at_order,
                counter_id,
                special_instructions,
                status,
                menu_items ( name )
            `)
            .in('order_id', orderIds);

        if (itemsError) {
            console.error('Error fetching order items separately:', itemsError);
            // Return orders without items in case of error
        } else if (itemsData) {
            allItems = itemsData;
        }
    }

    // Combine base order data with fetched items
    const finalOrders: Order[] = ordersBase.map((orderBase): Order => {
        const orderItems = allItems
            .filter(item => item.order_id === orderBase.id)
            .map((item: any) => ({
                id: item.id,
                orderId: item.order_id,
                menuItemId: item.menu_item_id,
                quantity: item.quantity,
                priceAtOrder: item.price_at_order,
                counterId: item.counter_id,
                specialInstructions: item.special_instructions,
                status: item.status as 'pending' | 'delivered',
                menuItem: item.menu_items ? { name: item.menu_items.name } : undefined,
            }));

        return {
            ...orderBase,
            items: orderItems,
        };
    });

    return finalOrders;
  }

  /**
   * Updates the stock level for a specific menu item belonging to the vendor.
   */
  static async setItemStock(itemId: string, newStock: number): Promise<void> {
    if (!itemId || newStock < 0) {
      throw new Error('Item ID and a non-negative stock value are required');
    }
    const { error } = await supabase
      .from('menu_items')
      .update({ stock: newStock })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating item stock:', error);
      throw error;
    }
  }

  // --- Vendor Settings Management ---

  /**
   * Fetches the settings for the logged-in vendor.
   */
  static async getVendorSettings(): Promise<VendorSettings | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('vendor_settings')
      .select('*')
      .eq('vendor_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vendor settings:', error);
      throw error;
    }
    return data ? mapVendorSettingsFromDb(data) : null;
  }

  /**
   * Updates the settings for the logged-in vendor.
   */
  static async updateVendorSettings(updatedSettingsData: Partial<Omit<VendorSettings, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const dbUpdateData: { [key: string]: any } = {};
    if (updatedSettingsData.shopName !== undefined) dbUpdateData.shop_name = updatedSettingsData.shopName;
    if (updatedSettingsData.workingHours !== undefined) dbUpdateData.working_hours = updatedSettingsData.workingHours;
    if (updatedSettingsData.isOpen !== undefined) dbUpdateData.is_open = updatedSettingsData.isOpen;
    if (updatedSettingsData.orderLimit !== undefined) dbUpdateData.order_limit = updatedSettingsData.orderLimit;

    if (Object.keys(dbUpdateData).length === 0) {
      console.warn("updateVendorSettings called with no data to update.");
      return;
    }

    const { error } = await supabase
      .from('vendor_settings')
      .update(dbUpdateData)
      .eq('vendor_id', user.id);

    if (error) {
      console.error('Error updating vendor settings:', error);
      throw error;
    }
  }

  // --- Vendor Tax Rate Management ---

  /**
   * Fetches all tax rates configured by the logged-in vendor.
   */
  static async getVendorTaxRates(): Promise<TaxRate[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching vendor tax rates:', error);
      throw error;
    }
    return data?.map(mapTaxRateFromDb) || [];
  }

  /**
   * Creates a new tax rate for the logged-in vendor.
   */
  static async createTaxRate(newTaxRateData: Omit<TaxRate, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>): Promise<TaxRate> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (!newTaxRateData.name || newTaxRateData.rate < 0 || newTaxRateData.rate > 1) {
      throw new Error('Invalid tax rate data: Name and rate (0-1) are required.');
    }

    const dbData = {
      vendor_id: user.id,
      name: newTaxRateData.name,
      rate: newTaxRateData.rate,
      description: newTaxRateData.description,
      is_active: newTaxRateData.isActive,
    };

    const { data, error } = await supabase
      .from('tax_rates')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating tax rate:', error);
      throw error;
    }
     if (!data) {
         throw new Error('Failed to create tax rate, no data returned.');
     }
    return mapTaxRateFromDb(data);
  }

  /**
   * Updates an existing tax rate belonging to the vendor.
   */
  static async updateTaxRate(taxRateId: string, updatedTaxRateData: Partial<Omit<TaxRate, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!taxRateId) {
      throw new Error('Tax rate ID is required for update');
    }

    const dbUpdateData: { [key: string]: any } = {};
    if (updatedTaxRateData.name !== undefined) dbUpdateData.name = updatedTaxRateData.name;
    if (updatedTaxRateData.rate !== undefined) {
        if (updatedTaxRateData.rate < 0 || updatedTaxRateData.rate > 1) throw new Error('Rate must be between 0 and 1.');
        dbUpdateData.rate = updatedTaxRateData.rate;
    }
    if (updatedTaxRateData.description !== undefined) dbUpdateData.description = updatedTaxRateData.description;
    if (updatedTaxRateData.isActive !== undefined) dbUpdateData.is_active = updatedTaxRateData.isActive;

    if (Object.keys(dbUpdateData).length === 0) {
      console.warn("updateTaxRate called with no data to update.");
      return;
    }

    const { error } = await supabase
      .from('tax_rates')
      .update(dbUpdateData)
      .eq('id', taxRateId);

    if (error) {
      console.error('Error updating tax rate:', error);
      throw error;
    }
  }

  /**
   * Deletes a tax rate belonging to the vendor.
   */
  static async deleteTaxRate(taxRateId: string): Promise<void> {
    if (!taxRateId) {
      throw new Error('Tax rate ID is required for deletion');
    }
    const { error } = await supabase
      .from('tax_rates')
      .delete()
      .eq('id', taxRateId);

    if (error) {
      console.error('Error deleting tax rate:', error);
      throw error;
    }
  }


  // --- Vendor Counter Management ---

  /**
   * Creates a new counter for the currently logged-in vendor.
   */
  static async createCounter(counterData: Omit<Counter, 'id' | 'vendorId'>): Promise<Counter> {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) throw new Error("User not authenticated");

     const dbData = {
        vendor_id: user.id,
        name: counterData.name,
        location: counterData.location,
        is_active: counterData.isActive,
     };

    const { data, error } = await supabase
        .from('counters')
        .insert(dbData)
        .select()
        .single();

    if (error) {
        console.error('Error creating counter:', error);
        throw error;
    }
     if (!data) {
         throw new Error('Failed to create counter, no data returned.');
     }
    return mapCounterFromDb(data);
  }

  /**
   * Fetches counters belonging to the logged-in vendor.
   */
  static async getVendorCounters(): Promise<Counter[]> {
    const { data, error } = await supabase
      .from('counters')
      .select('*');

    if (error) {
      console.error('Error fetching vendor counters:', error);
      throw error;
    }
    return data?.map(mapCounterFromDb) || [];
  }

  /**
   * Updates a counter belonging to the vendor.
   */
  static async updateCounter(counterId: string, updateData: Partial<Omit<Counter, 'id' | 'vendorId'>>): Promise<void> {
     const dbUpdateData: { [key: string]: any } = {};
     if (updateData.name !== undefined) dbUpdateData.name = updateData.name;
     if (updateData.location !== undefined) dbUpdateData.location = updateData.location;
     if (updateData.isActive !== undefined) dbUpdateData.is_active = updateData.isActive;

     if (Object.keys(dbUpdateData).length === 0) {
         console.warn("updateCounter called with no data to update.");
         return;
     }

    const { error } = await supabase
      .from('counters')
      .update(dbUpdateData)
      .eq('id', counterId);

    if (error) {
      console.error('Error updating counter:', error);
      throw error;
    }
  }

  /**
   * Deletes a counter belonging to the vendor.
   */
  static async deleteCounter(counterId: string): Promise<void> {
    const { error } = await supabase
      .from('counters')
      .delete()
      .eq('id', counterId);

    if (error) {
      console.error('Error deleting counter:', error);
       if (error.code === '23503') {
           throw new Error('Cannot delete counter as it still has menu items associated with it.');
       }
      throw error;
    }
  }


  // --- Analytics Methods (Placeholders - Require Implementation) ---

  /**
   * Fetches sales trend data for the vendor.
   */
  static async getSalesTrends(period: 'daily' | 'weekly' | 'monthly'): Promise<any> {
      console.warn(`getSalesTrends(${period}) - Placeholder implementation.`);
      return Promise.resolve([]);
  }

  /**
   * Fetches top-selling items for the vendor.
   */
  static async getTopSellingItems(limit: number = 5): Promise<any> {
      console.warn(`getTopSellingItems(${limit}) - Placeholder implementation.`);
      return Promise.resolve([]);
  }


  // --- POS and Item Status ---

  /**
   * Creates an order placed in person (POS) using an RPC function for atomicity.
   */
  static async createInPersonOrder(
    items: Array<{ menuItemId: string; quantity: number; specialInstructions?: string }>,
    counterId: string,
    paymentMethod: 'cash' | 'online',
    studentId?: string | null
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (!items || items.length === 0) throw new Error("Cannot create an empty order.");
    if (!counterId) throw new Error("Counter ID is required.");
    if (!paymentMethod) throw new Error("Payment method is required.");
    if (paymentMethod === 'online' && !studentId) throw new Error("Student ID is required for online payments.");

    const formattedItems = items.map(item => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    const rpcParams = {
      p_vendor_user_id: user.id,
      p_counter_id: counterId,
      p_items: formattedItems,
      p_payment_method: paymentMethod,
      p_student_user_id: paymentMethod === 'online' ? studentId : null
    };

    const { data: newOrderId, error } = await supabase.rpc('create_pos_order', rpcParams);

    if (error) {
      console.error('Error calling create_pos_order RPC:', error, 'with params:', rpcParams);
      if (error.message.includes('Insufficient student balance')) {
          throw new Error('Insufficient student balance.');
      } else if (error.message.includes('Student profile') && error.message.includes('not found')) {
          throw new Error('Invalid Student ID.');
      } else if (error.message.includes('Insufficient stock')) {
          throw new Error('Insufficient stock for one or more items.');
      } else if (error.message.includes('not available')) {
          throw new Error('One or more items are currently unavailable.');
      } else if (error.message.includes('does not belong to counter')) {
          throw new Error('Internal error: Item does not belong to this counter.');
      }
      throw new Error(`Failed to create POS order. ${error.message || ''}`);
    }

    if (!newOrderId) {
        throw new Error('Database function did not return an order ID.');
    }
    console.log("Successfully created POS Order via RPC:", newOrderId);
    return newOrderId;
  }

  /**
   * Updates the status of an individual order item and triggers an update
   * of the overall order status based on all items.
   * Assumes 'order_item_status' enum includes 'pending', 'preparing', 'ready', 'delivered'.
   */
  static async updateOrderItemStatus(orderItemId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'delivered'): Promise<void> {
    if (!orderItemId || !newStatus) {
      throw new Error('Order Item ID and new status (pending/preparing/ready/delivered) are required.');
    }

    // 1. Update the specific item's status
    const { data: updatedItem, error: updateError } = await supabase
      .from('order_items')
      .update({ status: newStatus })
      .eq('id', orderItemId)
      .select('order_id') // Select the order_id for the next step
      .single();

    if (updateError) {
      console.error(`Error updating status for order item ${orderItemId} to ${newStatus}:`, updateError);
      throw new Error(`Failed to update item status: ${updateError.message}`);
    }

    if (!updatedItem || !updatedItem.order_id) {
        console.error(`Order item ${orderItemId} not found or order_id missing after update.`);
        throw new Error('Failed to retrieve order ID after updating item status.');
    }

    console.log(`Order item ${orderItemId} status updated to ${newStatus}.`);

    // 2. Trigger the RPC function to recalculate and update the overall order status
    // This RPC function needs to be created separately and handle the logic
    // of checking all items in the order and setting the appropriate orders.status
    // (pending, partially_ready, ready, partially_delivered, delivered, completed etc.)
    // It should likely run with SECURITY DEFINER privileges to bypass RLS.
    const { error: rpcError } = await supabase.rpc('update_order_status_based_on_items', {
      p_order_id: updatedItem.order_id
    });

    if (rpcError) {
      // Throw the error so the frontend knows the full operation didn't complete successfully.
      console.error(`Error triggering order status update via RPC for order ${updatedItem.order_id} after updating item ${orderItemId}:`, rpcError);
      throw new Error(`Failed to update overall order status: ${rpcError.message}`);
    } else {
      console.log(`Successfully triggered overall status update for order ${updatedItem.order_id}.`);
    }
  }

  /**
   * Directly updates the status of an entire order using an RPC function.
   * This is intended for direct vendor actions like moving an order on a Kanban board.
   */
  static async updateOrderStatusDirect(orderId: string, newStatus: Order['status']): Promise<void> {
    if (!orderId || !newStatus) {
      throw new Error('Order ID and new status are required for direct update.');
    }

    // Validate if the newStatus is actually part of the Order['status'] type if needed,
    // though TypeScript should help here.

    console.log(`Attempting to directly update order ${orderId} to status ${newStatus}`);

    const { error: rpcError } = await supabase.rpc('update_order_status_direct', {
      p_order_id: orderId,
      p_new_status: newStatus
    });

    if (rpcError) {
      console.error(`Error calling update_order_status_direct RPC for order ${orderId} to ${newStatus}:`, rpcError);
      // Check for specific permission error message if needed
      if (rpcError.message.includes('Permission denied')) {
          throw new Error(`Permission denied: You may not be associated with order ${orderId}.`);
      }
      throw new Error(`Failed to directly update order status: ${rpcError.message}`);
    } else {
      console.log(`Successfully called RPC to update order ${orderId} status to ${newStatus}.`);
    }
  }


  // --- Vendor Category Management ---

  /**
   * Fetches all categories created by the logged-in vendor.
   */
  static async getVendorCategories(): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('vendor_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching vendor categories:', error);
      throw error;
    }
    return data?.map(mapCategoryFromDb) || [];
  }

  /**
   * Creates a new category for the logged-in vendor.
   */
  static async createCategory(newCategoryData: Omit<Category, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (!newCategoryData.name || newCategoryData.name.trim() === '') {
      throw new Error('Category name is required.');
    }

    const dbData = {
      vendor_id: user.id,
      name: newCategoryData.name.trim(),
      description: newCategoryData.description?.trim(),
    };

    const { data, error } = await supabase
      .from('categories')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Category "${dbData.name}" already exists.`);
      }
      console.error('Error creating category:', error);
      throw error;
    }
     if (!data) {
         throw new Error('Failed to create category, no data returned.');
     }
    return mapCategoryFromDb(data);
  }

  /**
   * Updates an existing category belonging to the vendor.
   */
  static async updateCategory(categoryId: string, updatedCategoryData: Partial<Omit<Category, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!categoryId) {
      throw new Error('Category ID is required for update');
    }

    const dbUpdateData: { [key: string]: any } = {};
    if (updatedCategoryData.name !== undefined) {
        const trimmedName = updatedCategoryData.name.trim();
        if (trimmedName === '') throw new Error('Category name cannot be empty.');
        dbUpdateData.name = trimmedName;
    }
    if (updatedCategoryData.description !== undefined) {
        dbUpdateData.description = updatedCategoryData.description === null ? null : updatedCategoryData.description.trim();
    }

    if (Object.keys(dbUpdateData).length === 0) {
      console.warn("updateCategory called with no data to update.");
      return;
    }

    const { error } = await supabase
      .from('categories')
      .update(dbUpdateData)
      .eq('id', categoryId);

    if (error) {
       if (error.code === '23505') {
         throw new Error(`Category "${dbUpdateData.name}" already exists.`);
       }
      console.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Deletes a category belonging to the vendor.
   */
  static async deleteCategory(categoryId: string): Promise<void> {
    if (!categoryId) {
      throw new Error('Category ID is required for deletion');
    }
    console.warn(`Deleting category ${categoryId}. Consider adding logic to handle menu items using this category.`);

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // --- Storage Helper Methods ---

  /**
   * Uploads a menu item image to Supabase Storage.
   */
  static async uploadMenuItemImage(file: File, vendorId: string): Promise<string> {
    if (!file) throw new Error("No file provided for upload.");
    if (!vendorId) throw new Error("Vendor ID is required for upload path.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${vendorId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-item-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }
    return filePath;
  }

  /**
   * Deletes an image from Supabase Storage.
   */
  static async deleteMenuItemImage(imagePath: string): Promise<void> {
    if (!imagePath) {
      console.warn("No image path provided for deletion.");
      return;
    }
    const { error: deleteError } = await supabase.storage
      .from('menu-item-images')
      .remove([imagePath]);

    if (deleteError) {
      console.error(`Failed to delete old image (${imagePath}):`, deleteError);
    } else {
      console.log(`Successfully deleted image: ${imagePath}`);
    }
  }

  /**
    * Gets the public URL for a stored image.
    */
   static getMenuItemImageUrl(imagePath: string | null | undefined): string | null {
       if (!imagePath) {
           return null;
       }
       const { data } = supabase.storage
           .from('menu-item-images')
           .getPublicUrl(imagePath);

       return data?.publicUrl || null;
   }

  /**
   * Finds a student's user ID (UUID) based on their student ID (registration/roll number).
   */
  static async findStudentUserIdByRegNumber(studentRegNumber: string): Promise<string | null> {
    const trimmedStudentId = studentRegNumber?.trim();
    if (!trimmedStudentId) {
      throw new Error("Student ID cannot be empty.");
    }

    const { data: userId, error } = await supabase.rpc('get_user_id_by_student_id', {
      p_student_id: trimmedStudentId
    });

    if (error) {
      console.error(`Error calling get_user_id_by_student_id RPC for ${trimmedStudentId}:`, error);
      throw new Error(`Failed to look up student ID. Reason: ${error.message || 'Unknown RPC error'}`);
    }
     return userId || null;
   }

  /**
   * Fetches and filters orders relevant for the vendor's delivery/pickup view.
   * Only includes orders with items belonging to the vendor's counters
   * and having statuses like 'ready', 'partially_ready', etc.
   * @returns Promise resolving to an array of filtered Order objects.
   */
  static async getOrdersForDeliveryView(): Promise<Order[]> {

    try {
      // Fetch vendor's counters first
      const counters = await this.getVendorCounters();
      const counterIds = new Set(counters.map(c => c.id)); // Use Set for efficient lookup

      if (counterIds.size === 0) {
        return []; // No counters, so no relevant orders
      }

      // Fetch all vendor orders (already filtered by RLS/RPC for the vendor)
      const allOrders = await this.getVendorOrders();

      // Filter orders to include any order containing at least one 'ready' item belonging to this vendor's counters
      const relevantOrders = allOrders.filter(order =>
        order.items.some(item => counterIds.has(item.counterId) && item.status === 'ready')
      );

      // Map the relevant orders, keeping only the items that belong to this vendor's counters
      // The component will handle filtering for display based on item.status === 'ready'
      return relevantOrders.map(order => ({
        ...order,
        items: order.items.filter(item => counterIds.has(item.counterId))
      })).filter(order => order.items.length > 0); // Ensure we don't return orders with no relevant items after filtering

    } catch (error) {
      console.error("Error fetching orders for delivery view:", error);
      throw error; // Re-throw for the component to handle
    }
  }
 }
