import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';
// Update controller import
import { VendorCafeteriaController, Category } from '@/controllers/vendorCafeteriaController'; // Import Category type
import { Counter } from '@/models/vendor/counter'; // Import Counter type
import { MenuItem, DietFoodItem, NonDietFoodItem } from '@/models/cafeteria'; // Removed useCafeteriaStore import
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Card,
  CardHeader,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure, // Hook to manage modal state
  Input,
  Textarea,
  Switch,
  CircularProgress,
  Tooltip,
  Select, // Added Select
  SelectItem // Added SelectItem
} from "@heroui/react";

// More flexible form data structure
interface MenuItemFormData {
  id?: string;
  name: string;
  description: string;
  price: number | string;
  category: string;
  allergens: string;
  ingredients: string;
  available: boolean;
  counterId: string; // Changed from vendorId
  stock: number | string;
  isDietFood: boolean;
  calories?: number | string;
  nutritionalInfo?: {
    protein?: number | string;
    carbs?: number | string;
    fat?: number | string;
  };
  imagePath: string; // Renamed from images
}

const initialFormData: MenuItemFormData = {
  name: '',
  description: '',
  price: '',
  category: '',
  allergens: '',
  ingredients: '',
  available: true,
  counterId: '', // Changed from vendorId
  stock: '',
  isDietFood: false,
  calories: '',
  nutritionalInfo: { protein: '', carbs: '', fat: '' },
  imagePath: '', // Renamed from images
};

// Helper to safely parse numbers from form data
const safeParseFloat = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const safeParseInt = (value: string | number | undefined): number | undefined => {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
};

// TODO: Get vendorId from authentication context

export default function VendorMenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]); // State for categories
  const [allCounters, setAllCounters] = useState<Counter[]>([]); // State for counters
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // General page/modal error
  const [formError, setFormError] = useState<string | null>(null); // Specific form error
  const [deleteError, setDeleteError] = useState<string | null>(null); // Specific delete error
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // HeroUI Modal state management
  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();


  const fetchItems = useCallback(async () => {
    setIsLoading(true); // Removed duplicate setIsLoading(true)
    setError(null);
    try {
      // Fetch items, categories, and counters in parallel
      const [items, categories, counters] = await Promise.all([
        VendorCafeteriaController.getVendorMenuItems(),
        VendorCafeteriaController.getVendorCategories(),
        VendorCafeteriaController.getVendorCounters()
      ]);
      setMenuItems(items);
      setAllCategories(categories);
      setAllCounters(counters.filter(c => c.isActive)); // Only show active counters in dropdown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch initial data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Generic input handler for HeroUI Input/Textarea
  const handleFormValueChange = (name: string, value: string | number | boolean) => {
     // Handle nested nutritionalInfo
     if (name.startsWith('nutritionalInfo.')) {
         const field = name.split('.')[1] as keyof MenuItemFormData['nutritionalInfo'];
         setFormData(prev => ({
             ...prev,
             nutritionalInfo: {
                 ...prev.nutritionalInfo,
                 [field]: value
             }
         })); // <-- Added missing closing parenthesis and curly brace
     // Handle imagePath directly
     } else if (name === 'imagePath') {
         setFormData(prev => ({ ...prev, imagePath: String(value) }));
     } else {
         setFormData(prev => ({ ...prev, [name]: value }));
     }
     setFormError(null); // Clear error on input change
  };


  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setSelectedItem(null);
    setFormError(null);
    onAddEditModalOpen();
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setFormError(null);
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      allergens: item.allergens?.join(', ') || '',
      ingredients: item.ingredients?.join(', ') || '',
      available: item.available,
      counterId: item.counterId, // Changed from vendorId
      stock: item.stock ?? '',
      isDietFood: item.isDietFood ?? false,
      calories: item.isDietFood ? item.calories : '',
      nutritionalInfo: item.isDietFood ? {
        protein: item.nutritionalInfo?.protein ?? '', // Added optional chaining
        carbs: item.nutritionalInfo?.carbs ?? '',   // Added optional chaining
        fat: item.nutritionalInfo?.fat ?? '',     // Added optional chaining
      } : { protein: '', carbs: '', fat: '' },
      imagePath: item.imagePath || '', // Use imagePath, default to empty string
    });
    onAddEditModalOpen();
  };

  const handleOpenDeleteModal = (item: MenuItem) => {
    setSelectedItem(item);
    setDeleteError(null);
    onDeleteModalOpen();
  };

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    const price = safeParseFloat(formData.price);
    const stock = safeParseInt(formData.stock);
    const calories = safeParseInt(formData.calories);
    const protein = safeParseFloat(formData.nutritionalInfo?.protein);
    const carbs = safeParseFloat(formData.nutritionalInfo?.carbs);
    const fat = safeParseFloat(formData.nutritionalInfo?.fat);

    if (!formData.name) { setFormError("Name is required."); setIsSubmitting(false); return; }
    if (!formData.category) { setFormError("Category is required."); setIsSubmitting(false); return; }
    if (price === undefined || price <= 0) { setFormError("Price must be a valid positive number."); setIsSubmitting(false); return; }
    if (stock === undefined || stock < 0) { setFormError("Stock must be a valid non-negative number."); setIsSubmitting(false); return; }

    let submitData: Partial<MenuItem>;

    const baseData = {
        name: formData.name,
        description: formData.description,
        price: price,
        category: formData.category,
        allergens: formData.allergens.split(',').map(s => s.trim()).filter(Boolean),
        ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
        available: formData.available,
        counterId: formData.counterId,
        stock: stock,
        imagePath: formData.imagePath || null, // Use imagePath, send null if empty
    };

    if (formData.isDietFood) {
        if (calories === undefined || calories <= 0) { setFormError("Calories are required for diet food items and must be positive."); setIsSubmitting(false); return; }
        if (protein === undefined || carbs === undefined || fat === undefined || protein < 0 || carbs < 0 || fat < 0) { setFormError("Valid Protein, Carbs, and Fat values are required for diet food items."); setIsSubmitting(false); return; }
        submitData = { ...baseData, isDietFood: true, calories: calories, nutritionalInfo: { protein, carbs, fat } } as Partial<DietFoodItem>;
    } else {
        submitData = { ...baseData, isDietFood: false, nutritionalInfo: (protein !== undefined || carbs !== undefined || fat !== undefined) ? { protein, carbs, fat } : undefined } as Partial<NonDietFoodItem>;
    }

    try {
      // Use Vendor controller methods (no vendor ID needed due to RLS)
      if (selectedItem?.id) {
        await VendorCafeteriaController.editMenuItem(selectedItem.id, submitData);
      } else {
         // const { id, ...createData } = formData; // No need to destructure id if not present
         const finalCreateData = formData.isDietFood
            ? { ...baseData, isDietFood: true, calories: calories!, nutritionalInfo: { protein: protein!, carbs: carbs!, fat: fat! } } as Omit<DietFoodItem, 'id'>
            : { ...baseData, isDietFood: false, nutritionalInfo: submitData.nutritionalInfo } as Omit<NonDietFoodItem, 'id'>;
        await VendorCafeteriaController.createMenuItem(finalCreateData);
      }
      onAddEditModalClose(); // Close modal on success
      await fetchItems(); // Refresh list
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
     if (!selectedItem || isSubmitting) return;
     setIsSubmitting(true);
     setDeleteError(null);

     try {
       // Use Vendor controller method (no vendor ID needed due to RLS)
       await VendorCafeteriaController.removeMenuItem(selectedItem.id);
       onDeleteModalClose(); // Close modal on success
       await fetchItems(); // Refresh list
     } catch (err) {
       setDeleteError(err instanceof Error ? err.message : 'Failed to delete item');
       console.error(err);
     } finally {
       setIsSubmitting(false);
       setSelectedItem(null); // Clear selection regardless of outcome
     }
  };

  const handleAvailabilityToggle = async (item: MenuItem) => {
     // Optimistic UI update (optional but good UX)
     setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, available: !mi.available } : mi));
     try {
       // Use Vendor controller method (no vendor ID needed due to RLS)
       // Note: setItemStock is specifically for stock, use editMenuItem for availability
       await VendorCafeteriaController.editMenuItem(item.id, { available: !item.available });
       // Optional: Refetch to confirm, or rely on optimistic update
       // await fetchItems();
     } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update availability');
        console.error(err);
        // Revert optimistic update on error
        setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, available: item.available } : mi));
     }
  };

  // Define columns for the HeroUI Table
  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price" },
    { key: "stock", label: "Stock" },
    { key: "available", label: "Available" },
    { key: "actions", label: "Actions" },
  ];

  // Render cell content based on column key
  const renderCell = useCallback((item: MenuItem, columnKey: string | number) => {
    const cellValue = getKeyValue(item, columnKey);

    switch (columnKey) {
      case "price":
        return `৳${Number(cellValue).toFixed(2)}`;
      case "stock":
        return item.stock ?? 'N/A';
      case "available":
        return (
          <div className="flex justify-center">
            <Switch
              isSelected={item.available}
              onValueChange={() => handleAvailabilityToggle(item)}
              aria-label={`Toggle availability for ${item.name}`}
              size="sm"
            />
          </div>
        );
      case "actions":
        return (
          <div className="relative flex items-center justify-center gap-2">
            <Tooltip content="Edit item">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEditModal(item)}>
                <Pencil className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete item" color="danger">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenDeleteModal(item)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue);
    }
  }, [handleAvailabilityToggle, handleOpenEditModal, handleOpenDeleteModal]); // Include dependencies


  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>
          Add New Item
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading && (
           <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading menu items..." />
           </div>
        )}
        {!isLoading && error && (
           <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
             <span className="font-medium">Error:</span> {error}
           </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Menu Items Table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === 'available' || column.key === 'actions' ? 'center' : 'start'}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={menuItems} emptyContent={"No menu items found."}>
              {(item) => (
                <TableRow key={String(item.id)}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardBody>

      {/* Add/Edit Modal */}
      <Modal isOpen={isAddEditModalOpen} onOpenChange={onAddEditModalOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => ( // onClose provided by ModalContent
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </ModalHeader>
              <ModalBody>
                {formError && (
                   <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                     <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                   </div>
                )}
                {/* Using form tag for semantics, handle submit via button onPress */}
                <form id="add-edit-item-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Column 1 */}
                   <Input
                     isRequired
                     label="Name"
                     name="name"
                     value={formData.name}
                     onValueChange={(v) => handleFormValueChange('name', v)}
                     isInvalid={formError?.toLowerCase().includes('name')}
                   />
                   <Input
                     isRequired
                     type="number"
                     label="Price (৳)"
                     name="price"
                     value={String(formData.price)}
                     onValueChange={(v) => handleFormValueChange('price', v)}
                     min={0.01}
                     step={0.01}
                     isInvalid={formError?.toLowerCase().includes('price')}
                   />
                   <Select
                      isRequired
                      label="Category"
                      placeholder="Select a category"
                      selectedKeys={formData.category ? [formData.category] : []}
                      onSelectionChange={(keys) => handleFormValueChange('category', Array.from(keys)[0] as string)}
                      isInvalid={formError?.toLowerCase().includes('category')}
                      errorMessage={formError?.toLowerCase().includes('category') ? formError : undefined}
                      items={allCategories}
                    >
                      {(category) => <SelectItem key={category.name}>{category.name}</SelectItem>}
                    </Select>
                   <Input
                     isRequired
                     type="number"
                     label="Stock"
                     name="stock"
                     value={String(formData.stock)}
                     onValueChange={(v) => handleFormValueChange('stock', v)}
                     min={0}
                     step={1}
                     isInvalid={formError?.toLowerCase().includes('stock')}
                   />
                   <Select
                      isRequired
                      label="Counter"
                      placeholder="Select a counter"
                      selectedKeys={formData.counterId ? [formData.counterId] : []}
                      onSelectionChange={(keys) => handleFormValueChange('counterId', Array.from(keys)[0] as string)}
                      isInvalid={formError?.toLowerCase().includes('counter')}
                      errorMessage={formError?.toLowerCase().includes('counter') ? formError : undefined}
                      items={allCounters}
                    >
                      {(counter) => <SelectItem key={counter.id}>{counter.name}</SelectItem>}
                    </Select>
                    <Input
                     type="url"
                     label="Image URL"
                     name="imagePath" // Changed name to imagePath
                     placeholder="https://..."
                     value={formData.imagePath} // Bind to imagePath
                     onValueChange={(v) => handleFormValueChange('imagePath', v)} // Update imagePath
                   />
                   {/* Column 2 */}
                   <Textarea
                     label="Description"
                     name="description"
                     value={formData.description}
                     onValueChange={(v) => handleFormValueChange('description', v)}
                     className="md:col-span-2"
                   />
                   <Textarea
                     label="Ingredients (comma-separated)"
                     name="ingredients"
                     value={formData.ingredients}
                     onValueChange={(v) => handleFormValueChange('ingredients', v)}
                     className="md:col-span-2"
                   />
                   <Textarea
                     label="Allergens (comma-separated)"
                     name="allergens"
                     value={formData.allergens}
                     onValueChange={(v) => handleFormValueChange('allergens', v)}
                     className="md:col-span-2"
                   />

                   {/* Switches */}
                   <div className="flex items-center mt-2">
                      <Switch
                        isSelected={formData.available}
                        onValueChange={(v) => handleFormValueChange('available', v)}
                        name="available"
                        size="sm"
                      >
                        Available
                      </Switch>
                   </div>
                    <div className="flex items-center mt-2">
                       <Switch
                         isSelected={formData.isDietFood}
                         onValueChange={(v) => handleFormValueChange('isDietFood', v)}
                         name="isDietFood"
                         size="sm"
                       >
                         Is Diet Food
                       </Switch>
                    </div>

                   {/* Diet Food Specific Fields */}
                   {formData.isDietFood && (
                      <div className="md:col-span-2 mt-4 p-3 border border-secondary-200 dark:border-secondary-700 rounded-md bg-secondary-50 dark:bg-gray-700">
                         <h3 className="text-md font-semibold mb-2 text-secondary-800 dark:text-secondary-300">Diet Information</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <Input
                               isRequired
                               type="number"
                               label="Calories"
                               name="calories"
                               value={String(formData.calories)}
                               onValueChange={(v) => handleFormValueChange('calories', v)}
                               min={0}
                               step={1}
                               size="sm"
                               isInvalid={formError?.toLowerCase().includes('calories')}
                            />
                            <Input
                               isRequired
                               type="number"
                               label="Protein (g)"
                               name="nutritionalInfo.protein"
                               value={String(formData.nutritionalInfo?.protein)}
                               onValueChange={(v) => handleFormValueChange('nutritionalInfo.protein', v)}
                               min={0}
                               step={0.1}
                               size="sm"
                               isInvalid={formError?.toLowerCase().includes('protein')}
                            />
                            <Input
                               isRequired
                               type="number"
                               label="Carbs (g)"
                               name="nutritionalInfo.carbs"
                               value={String(formData.nutritionalInfo?.carbs)}
                               onValueChange={(v) => handleFormValueChange('nutritionalInfo.carbs', v)}
                               min={0}
                               step={0.1}
                               size="sm"
                               isInvalid={formError?.toLowerCase().includes('carbs')}
                            />
                            <Input
                               isRequired
                               type="number"
                               label="Fat (g)"
                               name="nutritionalInfo.fat"
                               value={String(formData.nutritionalInfo?.fat)}
                               onValueChange={(v) => handleFormValueChange('nutritionalInfo.fat', v)}
                               min={0}
                               step={0.1}
                               size="sm"
                               isInvalid={formError?.toLowerCase().includes('fat')}
                            />
                         </div>
                      </div>
                   )}
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleFormSubmit()} isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedItem ? 'Save Changes' : 'Add Item')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalOpenChange} size="md">
         <ModalContent>
           {(onClose) => (
             <>
               <ModalHeader className="flex flex-col gap-1">Confirm Deletion</ModalHeader>
               <ModalBody>
                 {deleteError && (
                    <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                      <AlertCircle className="inline w-4 h-4 mr-2" />{deleteError}
                    </div>
                 )}
                 <p>Are you sure you want to delete the item "{selectedItem?.name}"?</p>
                 <p className="text-sm text-danger">This action cannot be undone.</p>
               </ModalBody>
               <ModalFooter>
                 <Button variant="light" onPress={onClose}>
                   Cancel
                 </Button>
                 <Button color="danger" onPress={handleDeleteConfirm} isLoading={isSubmitting}>
                   {isSubmitting ? 'Deleting...' : 'Delete'}
                 </Button>
               </ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>

    </Card>
  );
}
