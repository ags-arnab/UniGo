import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Define product interface
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  vendor: {
    id: string;
    name: string;
  };
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity: number;
  images: string[];
  attributes?: Record<string, string[] | number[] | boolean>;
  createdAt: Date;
}

// Define review interface
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

// Define order interface
export interface MarketplaceOrder {
  id: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    selectedAttributes?: Record<string, string | number | boolean>;
  }>;
  totalPrice: number;
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

// Define marketplace store state
interface MarketplaceState {
  products: Product[];
  filteredProducts: Product[];
  featuredProducts: Product[];
  selectedProduct: Product | null;
  recentlyViewed: Product[];
  cartItems: Array<{
    product: Product;
    quantity: number;
    selectedAttributes?: Record<string, string | number | boolean>;
  }>;
  orders: MarketplaceOrder[];
  reviews: Record<string, Review[]>; // Key: productId
  loading: boolean;
  error: string | null;
  
  // Filter actions
  setFilter: (category: string, searchQuery: string, vendorId?: string) => void;
  
  // Product actions
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product>;
  fetchProductReviews: (productId: string) => Promise<Review[]>;
  addProductReview: (productId: string, rating: number, comment: string) => Promise<Review>;
  viewProduct: (product: Product) => void;
  
  // Cart actions
  addToCart: (product: Product, quantity: number, selectedAttributes?: Record<string, string | number | boolean>) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Order actions
  placeOrder: (shippingAddress: MarketplaceOrder['shippingAddress']) => Promise<string>;
  fetchOrders: () => Promise<void>;
}

// Create marketplace store with dev tools
export const useMarketplaceStore = create<MarketplaceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      products: [],
      filteredProducts: [],
      featuredProducts: [],
      selectedProduct: null,
      recentlyViewed: [],
      cartItems: [],
      orders: [],
      reviews: {},
      loading: false,
      error: null,
      
      // Set filter for products
      setFilter: (category: string, searchQuery: string, vendorId?: string) => {
        const { products } = get();
        
        const filtered = products.filter(product => 
          (category === 'All' || product.category === category) && 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          (vendorId === undefined || product.vendor.id === vendorId)
        );
        
        set({ filteredProducts: filtered });
      },
      
      // Fetch all products
      fetchProducts: async () => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock products data
          const mockProducts: Product[] = [
            {
              id: 'product-1',
              name: 'University Branded Hoodie',
              description: 'High-quality cotton blend hoodie with embroidered university logo.',
              price: 45.99,
              discountPrice: 39.99,
              category: 'Clothing',
              vendor: {
                id: 'vendor-1',
                name: 'University Store'
              },
              rating: 4.8,
              reviewCount: 56,
              inStock: true,
              stockQuantity: 100,
              images: [
                'https://placehold.co/600x400',
                'https://placehold.co/600x400',
                'https://placehold.co/600x400'
              ],
              attributes: {
                colors: ['Navy Blue', 'Black', 'Gray'],
                sizes: ['S', 'M', 'L', 'XL', 'XXL']
              },
              createdAt: new Date('2025-02-01')
            },
            {
              id: 'product-2',
              name: 'Wireless Earbuds',
              description: 'Bluetooth earbuds with noise cancellation and long battery life.',
              price: 89.99,
              category: 'Electronics',
              vendor: {
                id: 'vendor-2',
                name: 'Campus Tech'
              },
              rating: 4.5,
              reviewCount: 32,
              inStock: true,
              stockQuantity: 45,
              images: [
                'https://placehold.co/600x400',
                'https://placehold.co/600x400'
              ],
              attributes: {
                colors: ['White', 'Black']
              },
              createdAt: new Date('2025-02-10')
            },
            {
              id: 'product-3',
              name: 'Textbook Bundle: Introduction to Computer Science',
              description: 'Bundle includes the main textbook and study guide with practice problems.',
              price: 129.99,
              discountPrice: 110.00,
              category: 'Books',
              vendor: {
                id: 'vendor-3',
                name: 'Campus Bookstore'
              },
              rating: 4.2,
              reviewCount: 18,
              inStock: true,
              stockQuantity: 22,
              images: [
                'https://placehold.co/600x400'
              ],
              attributes: {
                format: ['Hardcover', 'Digital'],
                edition: ['Standard', 'International']
              },
              createdAt: new Date('2025-01-15')
            },
            {
              id: 'product-4',
              name: 'Desk Organizer Set',
              description: 'Keep your study area organized with this stylish desk organizer set.',
              price: 24.99,
              category: 'Supplies',
              vendor: {
                id: 'vendor-1',
                name: 'University Store'
              },
              rating: 4.7,
              reviewCount: 42,
              inStock: true,
              stockQuantity: 75,
              images: [
                'https://placehold.co/600x400',
                'https://placehold.co/600x400'
              ],
              attributes: {
                colors: ['White', 'Black', 'Wood']
              },
              createdAt: new Date('2025-02-20')
            },
            {
              id: 'product-5',
              name: 'University Mug',
              description: 'Ceramic mug with university logo, perfect for coffee or tea.',
              price: 14.99,
              category: 'Accessories',
              vendor: {
                id: 'vendor-1',
                name: 'University Store'
              },
              rating: 4.6,
              reviewCount: 65,
              inStock: true,
              stockQuantity: 150,
              images: [
                'https://placehold.co/600x400'
              ],
              attributes: {
                colors: ['White', 'Black', 'Blue']
              },
              createdAt: new Date('2025-01-05')
            },
            {
              id: 'product-6',
              name: 'Wireless Mouse',
              description: 'Ergonomic wireless mouse with precision tracking.',
              price: 29.99,
              category: 'Electronics',
              vendor: {
                id: 'vendor-2',
                name: 'Campus Tech'
              },
              rating: 4.4,
              reviewCount: 27,
              inStock: false,
              stockQuantity: 0,
              images: [
                'https://placehold.co/600x400'
              ],
              attributes: {
                colors: ['Black', 'White', 'Gray']
              },
              createdAt: new Date('2025-03-01')
            }
          ];
          
          set({ 
            products: mockProducts, 
            filteredProducts: mockProducts,
            featuredProducts: mockProducts.slice(0, 4),
            loading: false 
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch products', loading: false });
        }
      },
      
      // Fetch product by ID
      fetchProductById: async (id: string) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
          
          // Find product from existing products or fetch from API
          const { products } = get();
          let product = products.find(p => p.id === id);
          
          if (!product) {
            // If product not in state, this would normally fetch from API
            // For mock purposes, we'll just throw an error
            throw new Error('Product not found');
          }
          
          set({ selectedProduct: product, loading: false });
          
          // Add to recently viewed
          get().viewProduct(product);
          
          return product;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch product', loading: false });
          throw error;
        }
      },
      
      // Fetch product reviews
      fetchProductReviews: async (productId: string) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
          
          // Mock reviews
          const mockReviews: Review[] = [
            {
              id: 'review-1',
              productId,
              userId: 'user-1',
              userName: 'John S.',
              rating: 5,
              comment: 'Great quality! The material is thick and warm, perfect for winter days on campus. The logo looks great and hasn\'t faded after several washes.',
              createdAt: new Date('2025-03-15')
            },
            {
              id: 'review-2',
              productId,
              userId: 'user-2',
              userName: 'Emma T.',
              rating: 4,
              comment: 'I love this! Fits perfectly and is very comfortable. The only thing is that it runs a bit large, so consider ordering a size down if you prefer a more fitted look.',
              createdAt: new Date('2025-03-10')
            }
          ];
          
          set(state => ({ 
            reviews: { ...state.reviews, [productId]: mockReviews },
            loading: false 
          }));
          
          return mockReviews;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch reviews', loading: false });
          throw error;
        }
      },
      
      // Add product review
      addProductReview: async (productId: string, rating: number, comment: string) => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          const newReview: Review = {
            id: `review-${Math.floor(Math.random() * 100000)}`,
            productId,
            userId: 'current-user-id', // Would come from auth store in production
            userName: 'Current User', // Would come from auth store in production
            rating,
            comment,
            createdAt: new Date()
          };
          
          set(state => {
            const existingReviews = state.reviews[productId] || [];
            
            // Update product rating and review count
            const updatedProducts = state.products.map(product => {
              if (product.id === productId) {
                const totalReviews = product.reviewCount + 1;
                const totalRating = (product.rating * product.reviewCount) + rating;
                const newRating = parseFloat((totalRating / totalReviews).toFixed(1));
                
                return {
                  ...product,
                  rating: newRating,
                  reviewCount: totalReviews
                };
              }
              return product;
            });
            
            return { 
              products: updatedProducts,
              filteredProducts: updatedProducts,
              selectedProduct: state.selectedProduct && state.selectedProduct.id === productId 
                ? { 
                    ...state.selectedProduct,
                    rating: updatedProducts.find(p => p.id === productId)?.rating || state.selectedProduct.rating,
                    reviewCount: updatedProducts.find(p => p.id === productId)?.reviewCount || state.selectedProduct.reviewCount
                  } 
                : state.selectedProduct,
              reviews: { 
                ...state.reviews, 
                [productId]: [newReview, ...existingReviews]
              },
              loading: false 
            };
          });
          
          return newReview;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add review', loading: false });
          throw error;
        }
      },
      
      // View product (add to recently viewed)
      viewProduct: (product: Product) => {
        set(state => {
          // Only keep the 5 most recent products
          const updatedRecentlyViewed = [
            product,
            ...state.recentlyViewed.filter(p => p.id !== product.id)
          ].slice(0, 5);
          
          return { recentlyViewed: updatedRecentlyViewed };
        });
      },
      
      // Add item to cart
      addToCart: (product: Product, quantity: number, selectedAttributes?: Record<string, string | number | boolean>) => {
        const { cartItems } = get();
        
        // Check if item already exists in cart with same attributes
        const existingItemIndex = cartItems.findIndex(item => 
          item.product.id === product.id && 
          JSON.stringify(item.selectedAttributes) === JSON.stringify(selectedAttributes)
        );
        
        if (existingItemIndex !== -1) {
          // Update quantity if item exists
          set({
            cartItems: cartItems.map((item, index) => 
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantity } 
                : item
            )
          });
        } else {
          // Add new item to cart
          set({
            cartItems: [
              ...cartItems,
              { product, quantity, selectedAttributes }
            ]
          });
        }
      },
      
      // Remove item from cart
      removeFromCart: (productId: string) => {
        const { cartItems } = get();
        
        set({
          cartItems: cartItems.filter(item => item.product.id !== productId)
        });
      },
      
      // Update cart item quantity
      updateCartItemQuantity: (productId: string, quantity: number) => {
        const { cartItems } = get();
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeFromCart(productId);
          return;
        }
        
        set({
          cartItems: cartItems.map(item => 
            item.product.id === productId 
              ? { ...item, quantity } 
              : item
          )
        });
      },
      
      // Clear cart
      clearCart: () => {
        set({ cartItems: [] });
      },
      
      // Place an order
      placeOrder: async (shippingAddress: MarketplaceOrder['shippingAddress']) => {
        set({ loading: true, error: null });
        
        try {
          const { cartItems } = get();
          
          if (cartItems.length === 0) {
            throw new Error('Cart is empty');
          }
          
          // Calculate total price
          const totalPrice = cartItems.reduce(
            (total, item) => {
              const price = item.product.discountPrice || item.product.price;
              return total + (price * item.quantity);
            }, 
            0
          );
          
          // Create new order
          const newOrder: MarketplaceOrder = {
            id: `ORD-${Math.floor(Math.random() * 100000)}`,
            userId: 'current-user-id', // Would come from auth store in production
            items: cartItems.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              price: item.product.discountPrice || item.product.price,
              selectedAttributes: item.selectedAttributes
            })),
            totalPrice,
            shippingAddress,
            status: 'pending',
            paymentStatus: 'completed',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
          
          set(state => ({ 
            orders: [newOrder, ...state.orders],
            loading: false 
          }));
          
          // Clear cart after successful order
          get().clearCart();
          
          return newOrder.id;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to place order', loading: false });
          throw error;
        }
      },
      
      // Fetch orders
      fetchOrders: async () => {
        set({ loading: true, error: null });
        
        try {
          // This would be replaced with an actual API call in production
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock orders
          const mockOrders: MarketplaceOrder[] = [
            {
              id: 'ORD-12345',
              userId: 'current-user-id',
              items: [
                { productId: 'product-1', quantity: 1, price: 39.99 },
                { productId: 'product-5', quantity: 2, price: 14.99 }
              ],
              totalPrice: 69.97,
              shippingAddress: {
                addressLine1: '123 University St',
                city: 'College Town',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
              },
              status: 'delivered',
              paymentStatus: 'completed',
              createdAt: new Date(Date.now() - 1209600000), // 2 weeks ago
              updatedAt: new Date(Date.now() - 864000000) // 10 days ago
            },
            {
              id: 'ORD-12346',
              userId: 'current-user-id',
              items: [
                { productId: 'product-2', quantity: 1, price: 89.99 }
              ],
              totalPrice: 89.99,
              shippingAddress: {
                addressLine1: '123 University St',
                city: 'College Town',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
              },
              status: 'shipped',
              paymentStatus: 'completed',
              createdAt: new Date(Date.now() - 259200000), // 3 days ago
              updatedAt: new Date(Date.now() - 172800000) // 2 days ago
            }
          ];
          
          set({ orders: mockOrders, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch orders', loading: false });
        }
      }
    })
  )
);