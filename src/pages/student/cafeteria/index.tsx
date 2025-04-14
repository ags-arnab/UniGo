import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { MenuItem } from '@/models/cafeteria';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { CafeteriaItemCard } from '@/components/ui/cafeteria/CafeteriaItemCard';
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Slider } from "@heroui/react"; // Import Slider
import { Search, XCircle } from "lucide-react";

/**
 * Student Cafeteria Landing Page
 * Displays all available cafeteria food items with filtering options
 */
const StudentCafeteria: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [allIngredients, setAllIngredients] = useState<string[]>([]); // State for all unique ingredients
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]); // State for excluded ingredients
  const [ingredientSearch, setIngredientSearch] = useState<string>(''); 
  const [isIngredientListVisible, setIsIngredientListVisible] = useState<boolean>(false); // State for list visibility
  const ingredientFilterRef = useRef<HTMLDivElement>(null); // Ref for the filter container
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]); // State for price range filter
  const [minMaxPrice, setMinMaxPrice] = useState<[number, number]>([0, 0]); // State for actual min/max prices
  const [filterDietOnly, setFilterDietOnly] = useState<boolean>(false); // State for diet food filter

  // Memoize loadMenuItems to prevent unnecessary re-renders/subscription resets
  const loadMenuItems = useCallback(async (triggeredByRealtime = false) => { // Add flag
    if (triggeredByRealtime) {
      console.log("[loadMenuItems] Triggered by Realtime event.");
      // Don't set loading for realtime updates to avoid flicker
    } else {
      console.log("[loadMenuItems] Triggered by initial mount.");
      setLoading(true); // Only show initial loading spinner
    }
    setError(null); // Clear previous errors

    try {
      // Call the new controller method to get all processed data
      const { menuItems: items, categories: uniqueCategories, ingredients: uniqueIngredients, minMaxPrice: minMax } = await CafeteriaController.getMenuPageData();
      
      console.log("[loadMenuItems] Fetched menu page data. Items:", items.length, "Categories:", uniqueCategories.length, "Ingredients:", uniqueIngredients.length, "Price Range:", minMax);

      // Update all relevant states
      setMenuItems(items);
      setCategories(uniqueCategories);
      setAllIngredients(uniqueIngredients);
      setMinMaxPrice(minMax);
      
      // Set initial price range based on fetched min/max, only on initial load
      if (!triggeredByRealtime) {
         setPriceRange(minMax);
      }

    } catch (err) {
      console.error("[loadMenuItems] Error during refetch:", err); // Log specific error
      setError('Failed to refresh menu items. Please try again later.');
    } finally {
        // Always set loading to false after attempt, especially for initial load
        if (!triggeredByRealtime) {
            setLoading(false);
        }
    }
  }, []); // Still empty dependency array

  // Fetch menu items on component mount
  useEffect(() => {
    loadMenuItems(false); // Pass false for initial load
  }, [loadMenuItems]); // Add loadMenuItems as dependency

  // Real-time subscription for menu item changes
  useEffect(() => {
    // Ensure loadMenuItems is defined before setting up subscription
    if (!loadMenuItems) return;

    console.log("Setting up Supabase real-time subscription for INSERT/UPDATE/DELETE on menu_items...");

    const handleRealtimeChange = (payload: any) => {
        console.log(`[Realtime] Event: ${payload.eventType}, Table: ${payload.table}, Schema: ${payload.schema}`);
        console.log('[Realtime] Payload:', JSON.stringify(payload, null, 2));
        console.log('[Realtime] RLS permitted change received. Triggering loadMenuItems(true)...');
        loadMenuItems(true); // Pass true for realtime trigger
    };

    const handleSubscriptionStatus = (channelName: string) => (status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to ${channelName} changes!`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`Subscription Error (${channelName}):`, err);
        setError(`Real-time connection error (${channelName}): ${err?.message}`);
      }
      if (status === 'TIMED_OUT') {
        console.warn(`Subscription timed out (${channelName}).`);
        setError(`Real-time connection timed out (${channelName}).`);
      }
      if (status === 'CLOSED') {
        console.log(`Subscription closed (${channelName}).`);
      }
    };

    const insertChannel = supabase
      .channel('public:menu_items:insert')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'menu_items' }, handleRealtimeChange)
      .subscribe(handleSubscriptionStatus('INSERT'));

    const updateChannel = supabase
      .channel('public:menu_items:update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_items' }, handleRealtimeChange)
      .subscribe(handleSubscriptionStatus('UPDATE'));

    // Listen for DELETE as well, although RLS applies here too.
    const deleteChannel = supabase
      .channel('public:menu_items:delete')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'menu_items' }, handleRealtimeChange)
      .subscribe(handleSubscriptionStatus('DELETE'));


    // Cleanup function to remove all channel subscriptions
    return () => {
      console.log("Cleaning up Supabase real-time subscriptions...");
      supabase.removeChannel(insertChannel).catch(err => console.error("Error removing insert channel:", err));
      supabase.removeChannel(updateChannel).catch(err => console.error("Error removing update channel:", err));
      supabase.removeChannel(deleteChannel).catch(err => console.error("Error removing delete channel:", err));
    };
  }, [loadMenuItems]); // Depend on loadMenuItems

  // Filtered items state

  // Filtered items state
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);

  // Update filtered items when menuItems, selectedCategory, searchQuery, or excludedIngredients changes
  useEffect(() => {
    // Call the controller method with the full list and all filters
    const filtered = CafeteriaController.filterMenuItems(
      menuItems, 
      selectedCategory,
      searchQuery,
      excludedIngredients, // Pass excluded ingredients
      priceRange, // Pass price range
      filterDietOnly // Pass diet filter state
    );
    setFilteredMenuItems(filtered);
  }, [menuItems, selectedCategory, searchQuery, excludedIngredients, priceRange, filterDietOnly]); // Add filterDietOnly to dependency array

  // Handler for toggling excluded ingredients (will reuse this logic)
  const handleIngredientToggle = (ingredient: string) => {
    setExcludedIngredients(prevExcluded => 
      prevExcluded.includes(ingredient)
        ? prevExcluded.filter(ing => ing !== ingredient) // Remove if already excluded
        : [...prevExcluded, ingredient] // Add if not excluded
    );
  };

  // Prepare ingredients data for Autocomplete

  // Filter ingredients based on search input (Re-using this logic)
  const filteredIngredients = useMemo(() => {
    return allIngredients.filter(ingredient => 
      ingredient.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
  }, [allIngredients, ingredientSearch]);

  // Effect to handle clicks outside the ingredient filter
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ingredientFilterRef.current && !ingredientFilterRef.current.contains(event.target as Node)) {
        setIsIngredientListVisible(false);
      }
    };

    // Add listener only when the list is visible
    if (isIngredientListVisible) {
      document.addEventListener('click', handleClickOutside); // Changed to 'click'
    } else {
      document.removeEventListener('click', handleClickOutside); // Changed to 'click'
    }

    // Cleanup listener on component unmount
    return () => {
      document.removeEventListener('click', handleClickOutside); // Changed to 'click'
    };
  }, [isIngredientListVisible]); // Re-run effect when visibility changes

  return (
    <div className="container mx-auto px-4 pt-4 pb-8"> {/* Changed py-8 to pt-4 pb-8 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-default-900">Cafeteria Menu</h1>
          <p className="text-default-600">Browse and order from our delicious selection of cafeteria items</p>
        </div>
        {/* Removed View Order History Button */}
      </div>
      
      {/* Search and Filtering */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-full md:col-span-1">
          <Input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} // Added type
            startContent={
              <Search className="h-5 w-5 text-default-400 pointer-events-none flex-shrink-0" /> // Use Lucide Search icon
            }
          />
        </div>
        
        {/* Changed flex space-x-2 overflow-x-auto to flex flex-wrap gap-2 to allow wrapping on mobile */}
        <div className="flex flex-wrap gap-2 md:col-span-2"> 
          {categories.map((category) => (
            <Chip
              key={category}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? "primary" : "default"}
              variant={selectedCategory === category ? "solid" : "flat"}
              className="cursor-pointer"
            >
              {category}
            </Chip>
          ))}
          {/* Diet Food Filter Chip */}
          <Chip
            onClick={() => setFilterDietOnly(!filterDietOnly)}
            color={filterDietOnly ? "success" : "default"} // Use success color when active
            variant={filterDietOnly ? "solid" : "flat"}
            className="cursor-pointer"
          >
            Diet Food Only
          </Chip>
        </div>
      </div>

      {/* Combined Ingredient and Price Filtering Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Ingredient Filtering */}
        <div 
         className="relative" // Removed max-w-xs
         ref={ingredientFilterRef} 
         // Removed onBlur handler
       >
         <h3 className="mb-2 text-sm font-medium text-default-600">Exclude Ingredients:</h3>
         <Input
            isClearable
            placeholder="Search ingredients..."
            size="sm"
            startContent={<Search className="text-default-400" size={18} />}
            value={ingredientSearch}
            onClear={() => setIngredientSearch('')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIngredientSearch(e.target.value)}
            onFocus={() => setIsIngredientListVisible(true)} // Show list on focus
            className="w-full" // Make input take full width of container
          />
          {/* Display selected excluded ingredients as closable chips */}
          {excludedIngredients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {excludedIngredients.map((ingredient) => (
                <Chip 
                  key={ingredient} 
                  color="danger" 
                  variant="flat" 
                  onClose={() => handleIngredientToggle(ingredient)} // Remove on close
                  className="capitalize"
                >
                  {ingredient}
                </Chip>
              ))}
            </div>
          )}
          {/* Conditionally render the dropdown list */}
          {isIngredientListVisible && (
            <div 
              className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto border border-default-200 bg-background rounded-md p-2 flex flex-wrap gap-2 shadow-lg"
              onMouseDown={(e) => e.stopPropagation()} // Stop mousedown propagation inside the list
              tabIndex={-1} // Prevent the div itself from gaining focus, potentially helping with blur/click outside logic
            > 
              {filteredIngredients.length > 0 ? (
                filteredIngredients.map((ingredient) => {
                  const isExcluded = excludedIngredients.includes(ingredient);
                return (
                  <Chip
                    key={ingredient}
                    onClick={() => handleIngredientToggle(ingredient)}
                    onMouseDown={(e) => e.stopPropagation()} // Stop propagation on the chip itself
                    color={isExcluded ? "danger" : "default"}
                    variant={isExcluded ? "solid" : "flat"}
                    className="cursor-pointer capitalize" 
                  >
                    {ingredient}
                  </Chip>
                );
              })
            ) : (
              <p className="text-center text-default-500 text-sm py-2 w-full"> 
                {ingredientSearch ? 'No matching ingredients found' : 'No ingredients to filter'}
              </p>
              )}
            </div>
          )}
        </div>
 
         {/* Price Range Slider */}
         <div className="px-2"> {/* REMOVED max-w-md & kept small horizontal padding */}
           <h3 className="mb-2 text-sm font-medium text-default-600">Filter by Price:</h3>
           <Slider
              key={`price-slider-${minMaxPrice[0]}-${minMaxPrice[1]}`} // Add key based on min/max
             label="Price Range"
             step={1} // Changed step to 1 for precise selection
             minValue={minMaxPrice[0]}
             maxValue={minMaxPrice[1]}
            value={priceRange}
            onChange={(value) => {
              // Ensure value is always [number, number]
              if (Array.isArray(value) && value.length === 2) {
                setPriceRange(value as [number, number]);
              } else if (typeof value === 'number') {
                // Handle single value case if necessary, maybe set both ends?
                // For a range slider, this might indicate an issue or need specific handling.
                // For now, let's assume it returns an array for range sliders.
                console.warn("Slider onChange returned a single number, expected array [min, max]");
              }
             }}
             formatOptions={{ style: 'currency', currency: 'BDT' }} // Use BDT currency format
             className="w-full" // Explicitly setting width again
             // Add marks if desired, e.g., for min/max
             // marks={[
            //   { value: minMaxPrice[0], label: `৳${minMaxPrice[0]}` },
            //   { value: minMaxPrice[1], label: `৳${minMaxPrice[1]}` },
            // ]}
          />
          {/* Display the selected range */}
           <div className="mt-1 text-xs text-default-500 text-center">
             Selected: ৳{priceRange[0]} - ৳{priceRange[1]}
           </div>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" color="primary" />
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="mt-8 rounded-md bg-danger-50 p-4">
          <div className="flex">
            <div className="shrink-0">
              <XCircle className="h-5 w-5 text-danger" aria-hidden="true" /> {/* Use Lucide XCircle icon */}
            </div>
            <div className="ml-3">
              <Chip color="danger" variant="flat">{error}</Chip>
            </div>
          </div>
        </div>
      )}
      
      {/* Menu Items Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMenuItems.length > 0 ? ( // Use filteredMenuItems
              filteredMenuItems.map((item) => { // Use filteredMenuItems
                // Log the item object AND its imagePath just before passing
                console.log(`Mapping item in index.tsx: ID=${item.id}, Name=${item.name}, ImagePath=${item.imagePath}`);
                // Pass imagePath as a separate prop
                return <CafeteriaItemCard key={item.id} item={item} imagePath={item.imagePath} />;
              })
            ) : (
              <p className="col-span-full py-10 text-center text-default-500">
                No menu items found matching your criteria.
              </p>
            )}
          </div>
          
          {/* Show number of items */}
          <p className="mt-6 text-sm text-default-500">
            Showing {filteredMenuItems.length} menu items {/* Use filteredMenuItems */}
          </p>
        </>
      )}
    </div>
  );
};

export default StudentCafeteria;
