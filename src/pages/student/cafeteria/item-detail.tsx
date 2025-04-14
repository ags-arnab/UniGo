import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CafeteriaController } from '@/controllers/studentCafeteriaController';
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController'; // Import Vendor controller for image URL
import { MenuItem } from '@/models/cafeteria';
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import { ArrowLeft, XCircle } from "lucide-react"; // Import Lucide icons

/**
 * Student Cafeteria Item Detail Page
 * Displays detailed information about a specific cafeteria menu item
 */
const StudentCafeteriaItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [item, setItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState<boolean>(false);

  // Fetch menu item details on component mount
  useEffect(() => {
    const fetchItemDetails = async () => {
      try {
        setLoading(true);
        const items = await CafeteriaController.fetchMenuItems();
        const foundItem = items.find((menuItem) => menuItem.id === id);
        
        if (foundItem) {
          setItem(foundItem);
        } else {
          setError('Item not found. It may have been removed from the menu.');
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load item details. Please try again later.');
        setLoading(false);
      }
    };
    
    if (id) {
      fetchItemDetails();
    }
  }, [id]);

  // Handle quantity changes
  const handleQuantityChange = (action: 'increment' | 'decrement') => {
    if (action === 'increment') {
      setQuantity((prev) => prev + 1);
    } else if (action === 'decrement' && quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (item) {
      try {
        CafeteriaController.addToCart(item, quantity, specialInstructions);
        setAddedToCart(true);
        
        // Reset form after adding to cart
        setTimeout(() => {
          setAddedToCart(false);
        }, 3000);
      } catch (err) {
        setError('Failed to add item to cart. Please try again.');
      }
    }
  };

  // Handle direct order
  const handleOrderNow = () => {
    if (item) {
      try {
        // Add the current item to cart first
        CafeteriaController.addToCart(item, quantity, specialInstructions);
        // Navigate to the checkout page (which reads from the cart)
        navigate(`/student/cafeteria/checkout`); 
      } catch (err) {
        setError('Failed to process order. Please try again.');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          as={Link}
          to="/student/cafeteria"
          color="primary"
          variant="light"
          startContent={
            <ArrowLeft className="h-5 w-5" /> // Use Lucide ArrowLeft icon
          }
        >
          Back to Menu
        </Button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" color="primary" />
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <Card className="mt-8 border-danger">
          <CardBody className="flex items-center gap-2">
            <div className="shrink-0 text-danger">
              <XCircle className="h-5 w-5" aria-hidden="true" /> {/* Use Lucide XCircle icon */}
            </div>
            <div>
              <Chip color="danger" variant="flat" className="text-sm">{error}</Chip>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Item Details */}
      {!loading && !error && item && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start"> {/* Added md:items-start */}
          {/* Item Image - Wrapped in a div */}
          <div>
            <Image
              src={VendorCafeteriaController.getMenuItemImageUrl(item.imagePath) || 'https://placehold.co/600x400?text=No+Image'} // Use controller method
              alt={item.name}
              className="w-full h-auto rounded-lg shadow-md" // Removed md:self-start
              isLoading={loading}
              radius="lg" // Use radius from Image component
              loading="lazy"
            />
          </div>
          
          {/* Item Details */}
          <Card className="bg-background">
            <CardHeader className="flex flex-col gap-2">
              {/* Title and Diet Food Chip */}
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-default-900">{item.name}</h1>
                  {item.isDietFood && (
                    <Chip color="success" variant="dot" size="sm">Diet Food</Chip>
                  )}
                </div>
                <Chip color="primary" variant="flat">
                  {item.category}
                </Chip>
              </div>
              {/* Price and Calories */}
              <div className="flex items-baseline justify-between w-full">
                <p className="text-2xl font-semibold text-default-900">
                  ৳{item.price.toFixed(2)} {/* Changed currency symbol */}
                </p>
                {/* Conditionally display calories only for diet food */}
                {item.isDietFood && (
                  <Chip color="default" variant="flat" size="sm" className="text-xs">
                    {item.calories} cal
                  </Chip>
                )}
              </div>
            </CardHeader>
            
            <CardBody className="flex flex-col gap-6">
              {/* Description */}
              <Card className="bg-default-50/50">
                <CardBody>
                  <h3 className="mb-2 text-lg font-medium text-default-900">Description</h3>
                  <p className="text-default-700">{item.description}</p>
                </CardBody>
              </Card>
              
              {/* Nutritional Info - Only show if diet food */}
              {item.isDietFood && item.nutritionalInfo && (
                <div>
                  <h3 className="mb-2 text-lg font-medium text-default-900">Nutritional Information</h3>
                  <div className="grid grid-cols-3 gap-2"> {/* Adjusted grid columns */}
                      {/* Protein */}
                      <Card className="bg-default-50">
                        <CardBody className="p-3 text-center">
                          <span className="block text-sm text-default-500">Protein</span>
                          <span className="font-semibold text-default-900">{item.nutritionalInfo.protein}g</span>
                        </CardBody>
                      </Card>
                      {/* Carbs */}
                      <Card className="bg-default-50">
                        <CardBody className="p-3 text-center">
                          <span className="block text-sm text-default-500">Carbs</span>
                          <span className="font-semibold text-default-900">{item.nutritionalInfo.carbs}g</span>
                        </CardBody>
                      </Card>
                      {/* Fat */}
                      <Card className="bg-default-50">
                        <CardBody className="p-3 text-center">
                          <span className="block text-sm text-default-500">Fat</span>
                          <span className="font-semibold text-default-900">{item.nutritionalInfo.fat}g</span>
                        </CardBody>
                      </Card>
                  </div>
                </div>
              )}
              
              {/* Allergens - Conditionally render */}
              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <h3 className="mb-2 text-lg font-medium text-default-900">Allergens</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.allergens.map((allergen) => ( // Safe to map now
                      <Chip 
                        key={allergen} 
                        color="warning"
                        variant="flat"
                        size="sm"
                      >
                        {allergen}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              
              <Divider className="my-2" />
              
              {/* Order Options */}
              {item.available ? (
                <>
                  <div>
                    <h3 className="mb-2 text-lg font-medium text-default-900">Special Instructions</h3>
                    <Textarea
                      placeholder="Any special requests or dietary preferences?"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                      className="w-full"
                      variant="bordered"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <span className="mr-4 text-lg font-medium text-default-900">Quantity:</span>
                    <div className="flex items-center rounded-lg border border-default-200">
                      <Button
                        isIconOnly
                        variant="light"
                        className="h-10 w-10 border-r border-default-200"
                        onClick={() => handleQuantityChange('decrement')}
                        isDisabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <div className="flex h-10 w-12 items-center justify-center text-default-900">
                        {quantity}
                      </div>
                      <Button
                        isIconOnly
                        variant="light"
                        className="h-10 w-10 border-l border-default-200"
                        onClick={() => handleQuantityChange('increment')}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </CardBody>
            
            <CardFooter className="flex flex-col gap-4 sm:flex-row">
              {item.available ? (
                <>
                  <Button
                    color="primary"
                    size="lg"
                    className="w-full py-3 flex-1" // Added w-full and py-3 for mobile
                    onClick={handleAddToCart}
                    isDisabled={addedToCart}
                  >
                    {addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}
                  </Button>
                  <Button
                    color="primary"
                    variant="bordered"
                    size="lg"
                    className="w-full py-3 flex-1" // Added w-full and py-3 for mobile
                    onClick={handleOrderNow}
                  >
                    Order Now
                  </Button>
                </>
              ) : (
                <Card className="w-full bg-danger-50 text-center">
                  <CardBody>
                    <p className="text-lg font-medium text-danger">
                      This item is currently unavailable
                    </p>
                    <p className="text-sm text-danger-700">
                      Please check back later or browse other menu items
                    </p>
                  </CardBody>
                </Card>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentCafeteriaItemDetail;
