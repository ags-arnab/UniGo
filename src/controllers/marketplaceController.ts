import { MarketplaceOrder, Product, Review, useMarketplaceStore } from "@/models/marketplace";

/**
 * Marketplace Controller - Handles all marketplace business logic
 * Acts as an intermediary between the UI components and the marketplace store
 */
export class MarketplaceController {
  /**
   * Fetches all products in the marketplace
   * @returns Promise that resolves when products are loaded
   */
  static async fetchProducts(): Promise<Product[]> {
    try {
      await useMarketplaceStore.getState().fetchProducts();
      return useMarketplaceStore.getState().products;
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  /**
   * Gets the featured products
   * @returns Array of featured products
   */
  static getFeaturedProducts(): Product[] {
    return useMarketplaceStore.getState().featuredProducts;
  }

  /**
   * Gets the recently viewed products
   * @returns Array of recently viewed products
   */
  static getRecentlyViewedProducts(): Product[] {
    return useMarketplaceStore.getState().recentlyViewed;
  }

  /**
   * Applies filtering to products based on criteria
   * @param category Category to filter by, or 'All' for all categories
   * @param searchQuery Text search query
   * @param vendorId Optional vendor ID to filter by
   * @returns Filtered products array
   */
  static filterProducts(category: string, searchQuery: string, vendorId?: string): Product[] {
    useMarketplaceStore.getState().setFilter(category, searchQuery, vendorId);
    return useMarketplaceStore.getState().filteredProducts;
  }

  /**
   * Fetches a specific product by ID
   * @param id Product ID to fetch
   * @returns Promise that resolves with the product data
   */
  static async getProductById(id: string): Promise<Product> {
    if (!id) {
      throw new Error('Product ID is required');
    }

    try {
      return await useMarketplaceStore.getState().fetchProductById(id);
    } catch (error) {
      console.error(`Failed to fetch product with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Fetches reviews for a specific product
   * @param productId Product ID to fetch reviews for
   * @returns Promise that resolves with array of reviews
   */
  static async getProductReviews(productId: string): Promise<Review[]> {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    try {
      return await useMarketplaceStore.getState().fetchProductReviews(productId);
    } catch (error) {
      console.error('Failed to fetch product reviews:', error);
      throw error;
    }
  }

  /**
   * Adds a review for a product
   * @param productId ID of the product to review
   * @param rating Review rating (1-5)
   * @param comment Review comment text
   * @returns Promise that resolves with the added review
   */
  static async addProductReview(
    productId: string,
    rating: number,
    comment: string
  ): Promise<Review> {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (!comment || comment.trim() === '') {
      throw new Error('Review comment is required');
    }

    try {
      return await useMarketplaceStore.getState().addProductReview(productId, rating, comment);
    } catch (error) {
      console.error('Failed to add product review:', error);
      throw error;
    }
  }

  /**
   * Adds a product to the shopping cart
   * @param product Product to add to cart
   * @param quantity Quantity to add
   * @param selectedAttributes Optional product attributes (color, size, etc.)
   */
  static addToCart(
    product: Product,
    quantity: number,
    selectedAttributes?: Record<string, string | number | boolean>
  ): void {
    if (!product) {
      throw new Error('Product is required');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be at least 1');
    }

    try {
      useMarketplaceStore.getState().addToCart(product, quantity, selectedAttributes);
    } catch (error) {
      console.error('Failed to add product to cart:', error);
      throw error;
    }
  }

  /**
   * Removes a product from the shopping cart
   * @param productId ID of the product to remove
   */
  static removeFromCart(productId: string): void {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    try {
      useMarketplaceStore.getState().removeFromCart(productId);
    } catch (error) {
      console.error('Failed to remove product from cart:', error);
      throw error;
    }
  }

  /**
   * Updates the quantity of a product in the cart
   * @param productId ID of the product to update
   * @param quantity New quantity
   */
  static updateCartItemQuantity(productId: string, quantity: number): void {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    try {
      useMarketplaceStore.getState().updateCartItemQuantity(productId, quantity);
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
    return useMarketplaceStore.getState().cartItems;
  }

  /**
   * Calculates the total price of the current cart
   * @returns Total price of items in cart
   */
  static getCartTotal(): number {
    const cartItems = useMarketplaceStore.getState().cartItems;
    return cartItems.reduce((total, item) => {
      const price = item.product.discountPrice || item.product.price;
      return total + (price * item.quantity);
    }, 0);
  }

  /**
   * Clears the shopping cart
   */
  static clearCart(): void {
    useMarketplaceStore.getState().clearCart();
  }

  /**
   * Places an order for items in the cart
   * @param shippingAddress Shipping address for the order
   * @returns Promise that resolves with the order ID when the order is placed
   */
  static async placeOrder(shippingAddress: MarketplaceOrder['shippingAddress']): Promise<string> {
    const cartItems = useMarketplaceStore.getState().cartItems;

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city ||
        !shippingAddress.state || !shippingAddress.zipCode || !shippingAddress.country) {
      throw new Error('Complete shipping address is required');
    }

    try {
      return await useMarketplaceStore.getState().placeOrder(shippingAddress);
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  /**
   * Fetches order history for the current user
   * @returns Promise that resolves with the user's order history
   */
  static async getOrderHistory(): Promise<MarketplaceOrder[]> {
    try {
      await useMarketplaceStore.getState().fetchOrders();
      return useMarketplaceStore.getState().orders;
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      throw error;
    }
  }
}