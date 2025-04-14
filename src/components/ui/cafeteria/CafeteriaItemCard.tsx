import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Image } from "@heroui/image";
import { Button } from "@heroui/button";
import { ShoppingCart, Check } from "lucide-react";
import { MenuItem } from '@/models/cafeteria';
import { CafeteriaController } from '@/controllers/studentCafeteriaController'; // General controller
import { supabase } from '@/lib/supabaseClient';

interface CafeteriaItemCardProps {
  item: MenuItem;
  imagePath?: string | null; // Add the explicit imagePath prop
}

/**
 * Reusable card component for displaying cafeteria menu items
 * Using HeroUI components to maintain design system consistency
 */
// Destructure the new imagePath prop
export const CafeteriaItemCard: React.FC<CafeteriaItemCardProps> = ({ item, imagePath }) => {
  const [isAdded, setIsAdded] = useState(false); // State for added confirmation

  /**
   * Truncates text to a specified number of characters
   * @param text The text to truncate
   * @param maxLength Maximum length before truncation
   * @returns Truncated text with ellipsis
   */
  const truncateText = (text: string, maxLength: number = 100): string => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  // We will compute the URL directly in the src prop below

  return (
    <Card
      isPressable // Keep pressable for visual feedback if desired, but it won't navigate
      isHoverable
      className="h-full bg-content1/80 backdrop-blur-sm relative overflow-hidden flex flex-col"
    >
      {/* Link wraps image and body */}
      <Link to={`/student/cafeteria/menu/${item.id}`} className="flex flex-col flex-grow">
        {/* Item image with overlay for unavailable items */}
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={(() => {
              const placeholder = 'https://placehold.co/300x200?text=No+Image';
              // Use the explicitly passed imagePath prop now
              const rawImagePath = imagePath;
              // Trim whitespace just in case
              const cleanedImagePath = typeof rawImagePath === 'string' ? rawImagePath.trim() : null;

              console.log(`[Debug Img Src] Item: ${item.name}, Received Prop Path: "${rawImagePath}", Cleaned Path: "${cleanedImagePath}"`);

              if (cleanedImagePath) {
                try {
                  const { data } = supabase.storage.from('menu-item-images').getPublicUrl(cleanedImagePath);
                  console.log(`[Debug Img Src] getPublicUrl data for "${cleanedImagePath}":`, data); // Log the data object

                  if (data?.publicUrl) {
                     console.log(`[Debug Img Src] Using publicUrl: ${data.publicUrl}`);
                     return data.publicUrl;
                  } else {
                     console.warn(`[Debug Img Src] No publicUrl found in data for path: "${cleanedImagePath}"`);
                  }
                } catch (error) {
                  console.error(`[Debug Img Src] Error calling getPublicUrl for "${cleanedImagePath}":`, error);
                }
              }
              // Fallback to placeholder if path is missing, empty after trim, or URL generation fails
              console.log(`[Debug Img Src] Falling back to placeholder for item: ${item.name}`);
              return placeholder;
            })()}
            alt={item.name}
            className="h-full w-full object-cover object-center"
            radius="none"
          loading="lazy"
        />
        
        {/* Price Chip removed from image overlay */}
        
        {/* Unavailability overlay */}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Chip color="danger" variant="flat" className="text-sm font-semibold">
              Out of Stock
            </Chip>
          </div>
        )}
      </div>
      
      {/* Content */}
      <CardBody className="flex flex-col gap-2">
        {/* Container for Name and Price */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-default-900 flex-grow">{item.name}</h3>
          {/* Price Chip moved here */}
          <Chip
            color="success" // Changed color to success (green)
            variant="solid"
            size="sm"
            className="text-default-800 font-bold shadow-sm flex-shrink-0"
          >
            ৳{item.price.toFixed(2)}
          </Chip>
        </div>
        {/* Container for Calories (if applicable) */}
        <div className="flex justify-end"> {/* New div to align calories to the right */}
          {/* Conditionally display calories only for diet food */}
          {item.isDietFood && (
            <Chip color="default" variant="flat" size="sm" className="text-xs"> {/* Kept original styling */}
              {item.calories} cal 
            </Chip>
          )}
        </div>

        <p className="text-sm text-default-600 line-clamp-3 flex-1">
          {truncateText(item.description)}
        </p>
      </CardBody>
      </Link> {/* End of Link wrapping image and body */}

      {/* Footer remains outside the Link */}
      <CardFooter className="flex flex-col gap-3 border-t border-default-100 pt-3">
        {/* Row for Category and Stock */}
        <div className="flex items-center justify-between w-full gap-2">
          {/* Category Chip */}
          <Chip
            color="primary"
            variant="flat"
            size="sm"
            className="text-xs flex-shrink-0"
          >
            {item.category}
          </Chip>

          {/* Stock Chip (Conditional) */}
          {item.available && typeof item.stock === 'number' && ( // Only show if available and stock is a number
            <Chip
              color={item.stock <= 5 ? "warning" : "default"} // Warning color if stock is low
              variant="flat"
              size="sm"
              className="text-xs"
            >
              {item.stock <= 5 ? `${item.stock} left` : `Stock: ${item.stock}`} {/* Different text for low stock */}
            </Chip>
          )}
        </div>

        {/* Row for Allergens */}
        {/* Only show allergens if there are any */}
        {item.allergens && item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-start w-full">
              {item.allergens.slice(0, 3).map((allergen) => ( // Show up to 3 allergens
                <Chip
                  key={allergen}
                  color="warning"
                  variant="flat"
                  size="sm"
                  className="text-xs"
                >
                  {allergen}
                </Chip>
              ))}
              {/* Check length again within the block for the "+N" chip */}
              {item.allergens.length > 3 && ( // Adjust threshold if showing more
                <Chip
                  color="warning"
                  variant="flat"
                  size="sm"
                  className="text-xs"
                >
                  +{item.allergens.length - 3}
                </Chip>
              )}
            </div>
          )}
        {/* Add to Cart Button */}
        {item.available && ( // Keep button conditional on availability
          <Button
            color="primary"
            variant={isAdded ? "flat" : "ghost"} // Change variant on add
            size="md"
            className="w-full transition-colors duration-300 sm:text-sm"
            // Conditionally render icon and text
            startContent={isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
            onClick={() => {
              if (isAdded) return; // Prevent multiple clicks while showing checkmark

              try {
                CafeteriaController.addToCart(item, 1); // Add 1 item
                setIsAdded(true); // Set state to show checkmark
                console.log(`${item.name} added to cart`); 
                
                // Reset button state after a delay
                setTimeout(() => {
                  setIsAdded(false);
                }, 1500); // Show checkmark for 1.5 seconds

              } catch (error) {
                console.error("Failed to add item to cart from card:", error);
                // Optionally show error feedback
              }
            }}
            disabled={isAdded} // Disable button briefly after adding
          >
            {isAdded ? "Added!" : "Add to Cart"} 
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
