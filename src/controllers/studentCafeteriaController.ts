import { supabase } from "@/lib/supabaseClient";
import { MenuItem, Order, DietFoodItem, NonDietFoodItem } from "@/models/cafeteria"; // Added DietFoodItem, NonDietFoodItem
import { useStudentCartStore } from '@/store/studentCartStore'; // Import the new cart store
import { PostgrestSingleResponse } from "@supabase/supabase-js";


/**
 * Student Cafeteria Controller - Handles cafeteria business logic specific to students
 * Acts as an intermediary between the student-facing UI components and the database/store
 */
export class CafeteriaController {
  /**
   * Fetches all available menu items from the database.
   * @returns Promise resolving to an array of available MenuItem objects.
   */
  static async fetchMenuItems(): Promise<MenuItem[]> {
    try {
      // Join with counters table to get vendor_id
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          counters ( vendor_id )
        `)
        .eq('available', true);

      if (error) {
        console.error('Supabase error fetching menu items:', error);
        throw error;
      }

      // Explicitly map raw data to MenuItem type to ensure correct structure and casing
      const menuItems: MenuItem[] = data.map((rawItem: any) => {
        const baseItem = {
          id: rawItem.id,
          name: rawItem.name,
          description: rawItem.description,
          price: rawItem.price,
          category: rawItem.category,
          allergens: rawItem.allergens,
          ingredients: rawItem.ingredients,
          imagePath: rawItem.image_path,
          available: rawItem.available,
          counterId: rawItem.counter_id, // Explicitly map counter_id
          stock: rawItem.stock,
          // Include nested counter data if needed, though it's optional in BaseMenuItem
          counters: rawItem.counters ? { vendor_id: rawItem.counters.vendor_id } : null,
        };

        if (rawItem.is_diet_food) {
          return {
            ...baseItem,
            isDietFood: true,
            calories: rawItem.calories, // Required for DietFoodItem
            nutritionalInfo: { // Required for DietFoodItem
              protein: rawItem.protein,
              carbs: rawItem.carbs,
              fat: rawItem.fat,
            },
          } as DietFoodItem;
        } else {
          return {
            ...baseItem,
            isDietFood: false, // Explicitly set to false
            // Nutritional info is optional for NonDietFoodItem
            nutritionalInfo: (rawItem.protein || rawItem.carbs || rawItem.fat) ? {
              protein: rawItem.protein,
              carbs: rawItem.carbs,
              fat: rawItem.fat,
            } : undefined,
          } as NonDietFoodItem;
        }
      });

      return menuItems;
    } catch (error) {
      console.error('Failed to fetch and map menu items:', error);
      throw error; // Re-throw for UI handling
    }
  }

  /**
   * Fetches data needed for the main student menu page, including items,
   * categories, ingredients, and price range.
   * @returns Promise resolving to an object containing menu data.
   */
  static async getMenuPageData(): Promise<{
    menuItems: MenuItem[];
    categories: string[];
    ingredients: string[];
    minMaxPrice: [number, number];
  }> {
    try {
      const items = await this.fetchMenuItems(); // Fetch available items

      // Process data
      const uniqueCategories = ['All', ...new Set(items.map(item => item.category))];
      const uniqueIngredients = [
        ...new Set(
          items.flatMap(item => item.ingredients || [])
               .map(ing => ing.toLowerCase())
        )
      ].sort();

      let minMax: [number, number] = [0, 0];
      if (items.length > 0) {
        const prices = items.map(item => item.price);
        minMax = [Math.min(...prices), Math.max(...prices)];
      }

      return {
        menuItems: items,
        categories: uniqueCategories,
        ingredients: uniqueIngredients,
        minMaxPrice: minMax,
      };
    } catch (error) {
      console.error('Failed to fetch or process menu page data:', error);
      throw error; // Re-throw for UI handling
    }
  }


  /**
   * Fetches a single menu item by its ID.
   * @param itemId The ID of the menu item to fetch.
   * @returns Promise resolving to the MenuItem object or null if not found.
   */
  static async fetchMenuItemById(itemId: string): Promise<MenuItem | null> {
    if (!itemId) {
      console.error('Item ID is required to fetch menu item details.');
      return null;
    }
    try {
      // Fetch all items first (assuming no dedicated endpoint for single item)
      // In a real backend, you'd fetch only the specific item:
      // const { data, error } = await supabase.from('menu_items').select('*').eq('id', itemId).single();
      const allItems = await this.fetchMenuItems(); // Reuse existing fetch logic
      const foundItem = allItems.find(item => item.id === itemId);
      return foundItem || null;
    } catch (error) {
      console.error(`Failed to fetch menu item with ID ${itemId}:`, error);
      throw error; // Re-throw for UI handling
    }
  }

  /**
   * Applies filtering to menu items based on criteria
   * @param items The full list of menu items to filter
   * @param category Category to filter by, or 'All' for all categories
   * @param searchQuery Text search query
   * @param excludedIngredients Array of ingredients to exclude
   * @param priceRange Optional tuple [minPrice, maxPrice] to filter by price
   * @param filterDietOnly Boolean flag to filter only diet food items.
   * @returns Filtered menu items array
   */
  static filterMenuItems(
    items: MenuItem[],
    category: string,
    searchQuery: string,
    excludedIngredients: string[] = [],
    priceRange?: [number, number], // Added priceRange parameter
    filterDietOnly: boolean = false // Added diet filter parameter
  ): MenuItem[] {
    // Perform filtering directly
    const filtered = items.filter(item => {
      // Basic filters: category, search query, availability
      const basicFilterPass = (category === 'All' || item.category === category) &&
                              item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                              item.available;

      if (!basicFilterPass) {
        return false; // Fails basic filters
      }

      // Price filter: Check if item price is within the selected range
      if (priceRange && (item.price < priceRange[0] || item.price > priceRange[1])) {
        return false; // Fails price filter
      }

      // Ingredient filter: Check if item contains any excluded ingredients
      if (excludedIngredients.length > 0 && item.ingredients) {
        const hasExcludedIngredient = item.ingredients.some(ingredient =>
          excludedIngredients.includes(ingredient.toLowerCase())
        );
        if (hasExcludedIngredient) {
          return false; // Contains an excluded ingredient
        }
      }
      
      // Diet food filter: Check if the filter is active and if the item is diet food
      if (filterDietOnly && !item.isDietFood) {
        return false; // Fails diet filter (filter is on, but item is not diet food)
      }

      return true; // Passes all filters
    });
    return filtered;
  }

  /**
   * Adds a menu item to the user's cart
   * @param menuItem Menu item to add
   * @param quantity Quantity to add
   * @param specialInstructions Optional special instructions for the item
   */
  static addToCart(menuItem: MenuItem, quantity: number, specialInstructions?: string): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be at least 1');
    }

    try {
      useStudentCartStore.getState().addToCart(menuItem, quantity, specialInstructions);
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Removes a menu item from the user's cart
   * @param menuItemId ID of the menu item to remove
   */
  static removeFromCart(menuItemId: string): void {
    if (!menuItemId) {
      throw new Error('Menu item ID is required');
    }

    try {
      useStudentCartStore.getState().removeFromCart(menuItemId);
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  /**
   * Updates the quantity of a menu item in the cart
   * @param menuItemId ID of the menu item to update
   * @param quantity New quantity
   */
  static updateCartItemQuantity(menuItemId: string, quantity: number): void {
    if (!menuItemId) {
      throw new Error('Menu item ID is required');
    }

    try {
      useStudentCartStore.getState().updateCartItemQuantity(menuItemId, quantity);
    } catch (error) {
      console.error('Failed to update cart item quantity:', error);
      throw error;
    }
  }

  /**
   * Gets the current cart items
   * @returns Array of cart items
   */
  static getCartItems() {
    return useStudentCartStore.getState().cartItems;
  }

  /**
   * Calculates the total price of the current cart
   * @returns Total price of items in cart
   */
  static getCartTotal(): number {
    const cartItems = useStudentCartStore.getState().cartItems;
    return cartItems.reduce((total, item) => {
      return total + (item.menuItem.price * item.quantity);
    }, 0);
  }

  /**
   * Clears the cart
   */
  static clearCart(): void {
    useStudentCartStore.getState().clearCart();
  }

  /**
   * Places an order for items in the cart by inserting into Supabase tables.
   * @param pickupTime When the user wants to pick up their order.
   * @param userId The ID of the student placing the order.
   * @returns Promise that resolves with the new order ID when the order is placed successfully.
   */
  static async placeOrder(pickupTime: Date, userId: string): Promise<string> {
    const cartItems = useStudentCartStore.getState().cartItems;

    if (!userId) {
      throw new Error('User ID is required to place an order.');
    }
    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // 1. Calculate totals (still needed to pass to the function)
    const { subtotal, tax, total: totalPrice } = await this.calculateOrderTotals(cartItems);

    // 2. Prepare items in the format expected by the SQL function
    const formattedItems = cartItems.map(item => ({
      menu_item_id: item.menuItem.id,
      quantity: item.quantity,
      special_instructions: item.specialInstructions || null,
    }));

    // 3. Call the new atomic SQL function
    const { data: newOrderId, error: rpcError } = await supabase.rpc('create_student_order', {
      p_student_user_id: userId,
      p_items: formattedItems,
      p_pickup_time: pickupTime.toISOString(),
      p_subtotal: subtotal,
      p_tax: tax,
      p_total_price: totalPrice
    });

    if (rpcError) {
      console.error('Error calling create_student_order RPC:', rpcError);
      // Provide more specific error messages based on potential exceptions from the function
      if (rpcError.message.includes('Insufficient student balance')) {
          throw new Error('Insufficient student balance.');
      } else if (rpcError.message.includes('Insufficient stock')) {
          throw new Error('Insufficient stock for one or more items.');
      } else if (rpcError.message.includes('not available')) {
          throw new Error('One or more items are currently unavailable.');
      } else if (rpcError.message.includes('not found')) {
          // Could be item or profile not found
          throw new Error('Order creation failed: Required item or profile not found.');
      }
      // Generic fallback
      throw new Error(`Failed to place order. ${rpcError.message || ''}`);
    }

    if (!newOrderId) {
        throw new Error('Database function did not return an order ID.');
    }

    console.log("Successfully created Student Order via RPC:", newOrderId);

    // 4. Clear the cart in the store (balance deduction and stock update are now handled by the RPC)
    useStudentCartStore.getState().clearCart();

    // 5. Return the new order ID
    return newOrderId;
  }


  /**
   * Fetches the order history for a specific user from Supabase.
   * @param userId The ID of the user whose order history to fetch.
   * @returns Promise resolving to an array of Order objects.
   */
  static async getOrderHistory(userId: string): Promise<Order[]> {
    if (!userId) {
      console.error('User ID is required to fetch order history.');
      return []; // Return empty array if no user ID
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items ( name, image_path ),
            counters ( name )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching order history:', error);
        throw error;
      }

      // Fetch profile data separately - Select 'student_id' instead of 'student_reg_id'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, student_id') // Corrected column name
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // Ignore 'Not Found' error for profile
        console.error('Supabase error fetching profile for order history:', profileError);
        // Decide if you want to throw or proceed without profile data
        // throw profileError;
      }

      // Map orders and merge profile data
      const formattedOrders = data.map(order => ({
        id: order.id,
        userId: order.user_id,
        student_full_name: profileData?.full_name || null,
        student_reg_id: profileData?.student_id || null, // Map fetched 'student_id' to 'student_reg_id'
        totalPrice: order.total_price,
        subtotal: order.subtotal,
        tax: order.tax,
        status: order.status,
        createdAt: new Date(order.created_at), // Convert string dates to Date objects
        updatedAt: order.updated_at ? new Date(order.updated_at) : undefined,
        pickupTime: order.pickup_time ? new Date(order.pickup_time) : undefined,
        ready_at: order.ready_at ? new Date(order.ready_at) : null, // Add ready_at mapping
        payment_method: order.payment_method,
        // Map nested items
        items: order.order_items.map((item: any) => ({ // Cast item to any for nested access
          id: item.id,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          priceAtOrder: item.price_at_order,
          counterId: item.counter_id,
          specialInstructions: item.special_instructions,
          status: item.status,
          counterName: item.counters?.name || null,
          // Safely access nested menu_items properties
          menuItem: item.menu_items ? {
             name: item.menu_items.name,
             imagePath: item.menu_items.image_path // Include image path if needed by UI
          } : undefined // Handle case where menu_item might not be joined/found
        }))
      }));

      return formattedOrders as Order[]; // Assuming direct mapping after formatting

    } catch (error) {
      console.error('Failed to fetch order history:', error);
      throw error; // Re-throw for UI handling
    }
  }

  /**
   * Gets allergen information for a menu item
   * @param menuItem Menu item to get allergens for
   * @returns List of allergens in the menu item
   */
  static getAllergens(menuItem: MenuItem): string[] {
    return menuItem.allergens || [];
  }

  /**
   * Fetches details for a specific order for a given user from Supabase.
   * @param orderId The ID of the order to fetch.
   * @param userId The ID of the user who owns the order.
   * @returns Promise resolving to the Order object or null if not found/authorized.
   */
  static async getOrderDetails(orderId: string, userId: string): Promise<Order | null> {
     if (!orderId || !userId) {
      console.error('Order ID and User ID are required to fetch order details.');
      return null;
    }
    try {
       const { data, error }: PostgrestSingleResponse<any> = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items ( name, image_path )
          )
        `)
        .eq('id', orderId)
        .eq('user_id', userId) // Ensure user owns the order
        .single(); // Expect only one result

      if (error) {
        if (error.code === 'PGRST116') { // PostgREST code for "Not Found"
          console.log(`Order ${orderId} not found for user ${userId}.`);
          return null;
        }
        console.error('Supabase error fetching order details:', error);
        throw error;
      }

      if (!data) return null; // Should be handled by .single() error, but belt-and-suspenders

       // Fetch profile data separately for this specific order's user
       const { data: profileData, error: profileError } = await supabase
         .from('profiles')
         .select('full_name, student_reg_id')
         .eq('id', data.user_id) // Use the user_id from the fetched order data
         .single();

       if (profileError && profileError.code !== 'PGRST116') {
         console.error(`Supabase error fetching profile for order ${orderId}:`, profileError);
         // Decide whether to throw or proceed without profile data
         // throw profileError;
       }

       // Format the single order and merge profile data
      const formattedOrder = {
        id: data.id,
        userId: data.user_id,
        student_full_name: profileData?.full_name || null, // Add profile data
        student_reg_id: profileData?.student_reg_id || null, // Add profile data
        totalPrice: data.total_price,
        subtotal: data.subtotal,
        tax: data.tax,
        status: data.status,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
        pickupTime: data.pickup_time ? new Date(data.pickup_time) : undefined,
        payment_method: data.payment_method,
        // student_full_name and student_reg_id will be added after separate profile fetch
        items: data.order_items.map((item: any) => ({
          id: item.id,
          orderId: item.order_id, // Keep reference back to order
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          priceAtOrder: item.price_at_order,
          counterId: item.counter_id,
          specialInstructions: item.special_instructions,
          status: item.status,
          menuItem: item.menu_items ? {
             name: item.menu_items.name,
             imagePath: item.menu_items.image_path
          } : undefined
        }))
      };

      return formattedOrder as Order;

    } catch (error) {
      console.error(`Failed to fetch details for order ${orderId}:`, error);
      throw error; // Re-throw for UI handling
    }
  }

  /**
   * Fetches available time slots for pickup or delivery.
   * TODO: Implement actual logic based on current time, capacity, etc.
   * @param orderType The type of order ('pickup' or 'delivery').
   * @returns Promise resolving to an array of available time slot strings.
   */
  static async getAvailableTimeSlots(orderType: 'pickup' | 'delivery'): Promise<string[]> {
    console.log(`Fetching available ${orderType} time slots.`);
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    // Return different slots based on type for demonstration
    if (orderType === 'pickup') {
      return [
        '12:00 PM - 12:30 PM',
        '12:30 PM - 01:00 PM',
        '01:00 PM - 01:30 PM',
      ];
    } else { // delivery
      return [
        '05:00 PM - 05:30 PM',
        '05:30 PM - 06:00 PM',
        '06:00 PM - 06:30 PM',
      ];
    }
  }

  /**
   * Confirms an order with the selected options.
   * TODO: Implement actual API call to confirm order and trigger payment.
   * @param orderId The ID of the order to confirm.
   * @param options The selected options (time slot, order type).
   * @returns Promise resolving when the order is confirmed.
   */
  static async confirmOrder(orderId: string, options: { timeSlot: string; type: 'pickup' | 'delivery' }): Promise<void> {
    console.log(`Confirming order ${orderId} with options:`, options);
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate confirmation delay
    // In a real app, this would interact with the backend/store
    console.log(`Order ${orderId} confirmed successfully.`);
    // Potentially clear cart or update order status in the store here
    // useCafeteriaStore.getState().clearCart(); // Example
  }

  /**
   * Calculates order totals including subtotal, tax (fetched from DB), and total.
   * Assumes all items in the cart belong to the same vendor via their counter.
   * @param cartItems Array of cart items (must include menuItem with counterId).
   * @returns Promise resolving to an object containing subtotal, tax, and total values.
   */
  static async calculateOrderTotals(cartItems: Array<{ menuItem: MenuItem; quantity: number }>): Promise<{ subtotal: number; tax: number; total: number }> {
    if (!cartItems || cartItems.length === 0) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    // Determine Vendor ID from the first item's counter
    // Ensure cartItems[0] and menuItem exist before accessing counterId
    const firstItemCounterId = cartItems[0]?.menuItem?.counterId;
    let taxRate = 0;

    if (firstItemCounterId) {
      try {
        // Fetch the counter to get the vendor_id
        const { data: counterData, error: counterError } = await supabase
          .from('counters')
          .select('vendor_id')
          .eq('id', firstItemCounterId)
          .single();

        // Throw error if counter not found or other error occurred
        if (counterError) {
           console.error(`Error fetching counter ${firstItemCounterId}:`, counterError);
           throw counterError;
        }
        const vendorId = counterData?.vendor_id;

        if (vendorId) {
          // Fetch the active tax rate for this vendor
          const { data: taxData, error: taxError } = await supabase
            .from('tax_rates')
            .select('rate')
            .eq('vendor_id', vendorId)
            .eq('is_active', true)
            .maybeSingle(); // Use maybeSingle as vendor might not have a tax rate

          if (taxError) {
            console.error(`Error fetching tax rate for vendor ${vendorId}:`, taxError);
            throw taxError; // Rethrow tax fetch error
          }

          if (taxData?.rate) {
            // Ensure rate is treated as a number and convert percentage
            const rateValue = parseFloat(taxData.rate as any); // Cast to any if type is complex
            if (!isNaN(rateValue)) {
               taxRate = rateValue / 100; // Assuming rate is stored as percentage (e.g., 5 for 5%)
            } else {
               console.warn(`Invalid tax rate value found for vendor ${vendorId}: ${taxData.rate}`);
            }
          }
        } else {
           console.warn(`Vendor ID not found for counter ${firstItemCounterId}`);
        }
      } catch (error) {
        // Log the error but proceed with 0 tax if fetching fails for any reason
        console.error("Error determining tax rate, defaulting to 0:", error);
        taxRate = 0;
      }
    } else {
       console.warn("Could not determine counter ID from cart items to fetch tax rate.");
    }

    // Calculate tax
    const tax = subtotal * taxRate;

    // Calculate total
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }

  /**
   * Maps raw cart items to a format suitable for display in the UI
   * @param cartItems Raw cart items from the store
   * @returns Formatted cart items for UI display
   */
  static formatCartItemsForDisplay(cartItems: any[]) {
    if (!cartItems || cartItems.length === 0) {
      return [];
    }

    // Map cart items to the OrderItem structure for display
    // Map cart items to the OrderItem structure for display, including counterId
    return cartItems.map(cartItem => ({
      id: cartItem.menuItem.id,
      name: cartItem.menuItem.name,
      quantity: cartItem.quantity,
      price: cartItem.menuItem.price,
      counterId: cartItem.menuItem.counterId, // Added counterId
      customizations: cartItem.specialInstructions ? [cartItem.specialInstructions] : [],
    }));
  }

  /**
   * Checks if student has sufficient balance for an order
   * @param studentBalance Current balance of the student
   * @param orderTotal Total amount of the order
   * @returns Boolean indicating if balance is sufficient
   */
  static hassufficientBalance(studentBalance: number, orderTotal: number): boolean {
    return studentBalance >= orderTotal;
  }

  /**
   * Validates the cart before proceeding with order
   * @returns Error message if validation fails, null otherwise
   */
  static validateCart(): string | null {
    const cartItems = this.getCartItems();

    if (!cartItems || cartItems.length === 0) {
      return "Your cart is empty.";
    }

    return null;
  }

  /**
   * Gets profile information (name, student ID, balance) for a given user ID.
   * @param userId The Supabase auth user ID.
   * @returns Promise resolving to student info object or null if not found.
   */
  static async getStudentInfo(userId: string): Promise<{ name: string | null; studentId: string | null; balance: number } | null> {
     if (!userId) {
      console.error('User ID is required to fetch student info.');
      return null;
    }
    try {
      const { data, error }: PostgrestSingleResponse<{ full_name: string | null; student_id: string | null; balance: number | null }> = await supabase
        .from('profiles')
        .select('full_name, student_id, balance')
        .eq('id', userId)
        .single();

      if (error) {
         if (error.code === 'PGRST116') {
          console.log(`Profile not found for user ${userId}.`);
          return null;
        }
        console.error('Supabase error fetching student info:', error);
        throw error;
      }

      if (!data) return null;

      return {
        name: data.full_name,
        studentId: data.student_id, // Matches 'student_id' column in profiles table
        balance: data.balance ?? 0 // Default balance to 0 if null
      };

    } catch (error) {
      console.error(`Failed to fetch info for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Starts the order placement process
   * @returns Initial state for the order placement process
   */
  static initializeOrderPlacement() {
    // Initialize order state with default values
    return {
      orderType: 'instant' as 'instant' | 'later',
      error: null as string | null,
      isPlacingOrder: false,
      isOrderSuccessful: false,
    };
  }

  /**
   * Handles the order placement process
   * @param orderType The type of order (instant or later)
   * @param studentBalance Student's current balance
   * @param orderTotal Total cost of the order
   * @param userId The ID of the student placing the order.
   * @returns Promise resolving with order result
   */
  static async handleOrderPlacement(
    orderType: 'instant' | 'later',
    studentBalance: number,
    orderTotal: number,
    userId: string // Added userId parameter
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    // Validate sufficient balance
    if (!this.hassufficientBalance(studentBalance, orderTotal)) {
      return {
        success: false,
        error: 'Insufficient balance to place this order.'
      };
    }

    try {
      // Determine pickupDate based on orderType
      let pickupDate: Date;
      const now = new Date();

      if (orderType === 'later') {
        // For 'later', set pickup time to 30 mins from now
        pickupDate = new Date(now.getTime() + 30 * 60 * 1000);
      } else {
        // For 'instant', set pickup time to 1 min from now
        pickupDate = new Date(now.getTime() + 1 * 60 * 1000);
      }

      // Call controller's placeOrder method, passing userId
      const newOrderId = await this.placeOrder(pickupDate, userId);

      return {
        success: true,
        orderId: newOrderId
      };
    } catch (err) {
      console.error('Error placing order:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place order. Please try again.'
      };
    }
  }

  /**
   * Fetches all counters from the database.
   * @returns Promise resolving to an array of Counter objects.
   */
  static async fetchAllCounters(): Promise<Array<{ id: string; name: string }>> {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('id, name'); // Only fetch ID and name

      if (error) {
        console.error('Supabase error fetching all counters:', error);
        throw error;
      }
      // Basic mapping, assuming 'id' and 'name' exist and are correct types
      return data || [];
    } catch (error) {
      console.error('Failed to fetch all counters:', error);
      throw error;
    }
  }

  // Admin/Vendor specific methods have been moved to src/controllers/vendor/cafeteriaController.ts
}
