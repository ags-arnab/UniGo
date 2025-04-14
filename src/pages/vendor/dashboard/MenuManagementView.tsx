import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // Added useMemo
import { Pencil, Trash2, Plus, AlertCircle, UploadCloud, X, Image as ImageIcon, Search } from 'lucide-react'; // Added ImageIcon, Search
import { VendorCafeteriaController, Category } from '@/controllers/vendorCafeteriaController';
import { Counter } from '@/models/vendor/counter';
import { MenuItem, DietFoodItem, NonDietFoodItem } from '@/models/cafeteria';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  CardHeader,
  CardBody,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Textarea,
  Switch,
  CircularProgress,
  Tooltip,
  Card,
  Autocomplete,
  AutocompleteItem,
  Image // Using HeroUI Image
} from "@heroui/react";
import { PressEvent } from '@react-types/shared'; // Import PressEvent

// Form data structure
interface MenuItemFormData {
  id?: string;
  name: string;
  description: string;
  price: number | string;
  category: string;
  allergens: string;
  ingredients: string;
  available: boolean;
  counterId: string;
  stock: number | string;
  isDietFood: boolean;
  calories?: number | string;
  nutritionalInfo?: {
    protein?: number | string;
    carbs?: number | string;
    fat?: number | string;
  };
  imagePath?: string | null; // Stores the path in Supabase Storage
}

const initialFormData: MenuItemFormData = {
  name: '',
  description: '',
  price: '',
  category: '',
  allergens: '',
  ingredients: '',
  available: true,
  counterId: '',
  stock: '',
  isDietFood: false,
  calories: '',
  nutritionalInfo: { protein: '', carbs: '', fat: '' },
  imagePath: null,
};

// Helper parsers
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

export default function MenuManagementView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allCounters, setAllCounters] = useState<Counter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for image file
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // State for image preview URL
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null); // State for the *current* object URL that needs cleanup
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  const { user } = useAuth(); // Get user from auth context

  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();

  // Fetch initial data
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, categories, counters] = await Promise.all([
        VendorCafeteriaController.getVendorMenuItems(),
        VendorCafeteriaController.getVendorCategories(),
        VendorCafeteriaController.getVendorCounters()
      ]);
      setMenuItems(items);
      setAllCategories(categories);
      setAllCounters(counters.filter(c => c.isActive));
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

  // Cleanup effect for Object URLs
  useEffect(() => {
    // This function will run when the component unmounts or objectUrlToRevoke changes
    const urlToRevoke = objectUrlToRevoke; // Capture the value
    return () => {
      if (urlToRevoke) {
        console.log('[Cleanup] Revoking object URL:', urlToRevoke);
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [objectUrlToRevoke]); // Dependency array ensures cleanup runs when the URL changes

  // Handle form input changes
  const handleFormValueChange = (name: string, value: string | number | boolean) => {
     if (name.startsWith('nutritionalInfo.')) {
         const field = name.split('.')[1] as keyof MenuItemFormData['nutritionalInfo'];
         setFormData(prev => ({
             ...prev,
             nutritionalInfo: { ...prev.nutritionalInfo, [field]: value }
         }));
     } else {
         setFormData(prev => ({ ...prev, [name]: value }));
     }
     setFormError(null);
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[FileChange] Event Triggered:', event); // Log the event itself
    console.log('[FileChange] Event Target:', event.target); // Log the target
    console.log('[FileChange] Event Target Files:', event.target.files); // Log the files directly from the event

    setFormError(null);
    const files = event.target.files;
    console.log('[FileChange] Files variable assigned:', files); // Log after assignment

    // Revoke previous object URL if it exists before setting a new one or clearing
    if (objectUrlToRevoke) {
      console.log('[FileChange] Revoking previous object URL:', objectUrlToRevoke);
      URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(null); // Reset the state immediately
    }

    if (!files || files.length === 0) {
      console.log('[FileChange] No files selected or input cleared.');
      const currentPath = formData.imagePath ?? null;
      setSelectedFile(null);
      setCurrentImageUrl(VendorCafeteriaController.getMenuItemImageUrl(currentPath)); // Revert to stored image if available
      // No need to clear fileInputRef.current.value here as onChange didn't fire for clearing
      return;
    }

    const file = files[0];
    console.log('[FileChange] Selected file:', file?.name, 'Type:', file?.type, 'Size:', file?.size);

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      console.log('[FileChange] File size validation failed.');
      setFormError("File size exceeds 5MB limit.");
      setSelectedFile(null);
      // Revert preview to the image stored in DB if it exists, otherwise null
      setCurrentImageUrl(formData.imagePath ? VendorCafeteriaController.getMenuItemImageUrl(formData.imagePath) : null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the input if validation fails
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      console.log('[FileChange] File type validation failed.');
      setFormError("Invalid file type. Please select PNG, JPG, or WEBP.");
      setSelectedFile(null);
      // Revert preview to the image stored in DB if it exists, otherwise null
      setCurrentImageUrl(formData.imagePath ? VendorCafeteriaController.getMenuItemImageUrl(formData.imagePath) : null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the input if validation fails
      return;
    }

    console.log('[FileChange] Validation passed. Setting selected file state.');
    setSelectedFile(file);

    try {
      console.log('[FileChange] Creating object URL for preview.');
      const objectUrl = URL.createObjectURL(file);
      console.log('[FileChange] Object URL created:', objectUrl);
      setCurrentImageUrl(objectUrl);
      setObjectUrlToRevoke(objectUrl); // Store the URL for future cleanup
      // Log the state *after* setting it (React state updates might be async, but logging here confirms the call)
      console.log('[FileChange] Called setCurrentImageUrl with:', objectUrl);
      console.log('[FileChange] Called setObjectUrlToRevoke with:', objectUrl);
    } catch (error) {
      console.error("[FileChange] Error creating object URL for preview:", error);
      setFormError("Failed to generate image preview.");
      setSelectedFile(null);
      // Revert preview to the image stored in DB if it exists, otherwise null
      setCurrentImageUrl(formData.imagePath ? VendorCafeteriaController.getMenuItemImageUrl(formData.imagePath) : null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle removing the selected/previewed image
  const handleRemoveImage = (_e: PressEvent) => { // Correct event type for HeroUI Button onPress
    // e.stopPropagation(); // PressEvent doesn't have stopPropagation, remove if causing issues
    if (objectUrlToRevoke) {
      console.log('[RemoveImage] Revoking object URL:', objectUrlToRevoke);
      URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(null);
    }
    setSelectedFile(null);
    setCurrentImageUrl(null); // Clear preview immediately
    if (fileInputRef.current) fileInputRef.current.value = "";
    console.log('[RemoveImage] Cleared selected file, preview URL, and input value.');
  };

  // Explicitly trigger the hidden file input click (called by the styled button)
  const handleUploadAreaClick = () => { // Removed event parameter as it's not needed
    console.log('[UploadAreaClick] Triggered.');
    // Clear the input value *before* clicking to ensure onChange fires even for the same file
    if (fileInputRef.current) {
      console.log('[UploadAreaClick] Clearing file input value.');
      fileInputRef.current.value = ""; // Use empty string or null
    }
    console.log('[UploadAreaClick] Clicking file input ref.');
    fileInputRef.current?.click();
  };


  // Open modal handlers
  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setSelectedItem(null);
    setSelectedFile(null);
    setCurrentImageUrl(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onAddEditModalOpen();
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setSelectedItem(item);
    setFormError(null);
    // Log the item data when opening the edit modal
    console.log('[handleOpenEditModal] Opening for item:', item);
    console.log('[handleOpenEditModal] Item imagePath:', item.imagePath);

    const imageUrl = VendorCafeteriaController.getMenuItemImageUrl(item.imagePath);
    console.log('[handleOpenEditModal] Generated image URL:', imageUrl);

    setFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      allergens: item.allergens?.join(', ') || '',
      ingredients: item.ingredients?.join(', ') || '',
      available: item.available,
      counterId: item.counterId,
      stock: item.stock ?? '',
      isDietFood: item.isDietFood ?? false,
      calories: item.isDietFood ? item.calories : '',
      nutritionalInfo: item.isDietFood ? {
        protein: item.nutritionalInfo.protein ?? '',
        carbs: item.nutritionalInfo.carbs ?? '',
        fat: item.nutritionalInfo.fat ?? '',
      } : { protein: '', carbs: '', fat: '' },
      imagePath: item.imagePath,
    });
    setCurrentImageUrl(imageUrl); // Use the generated URL
    console.log('[handleOpenEditModal] Set currentImageUrl state to:', imageUrl);
    setSelectedFile(null); // Clear any previously selected file
    if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
    onAddEditModalOpen();
  };

  const handleOpenDeleteModal = (item: MenuItem) => {
    setSelectedItem(item);
    setDeleteError(null);
    onDeleteModalOpen();
  };

  // Form submission
  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmitting || !user?.id) {
        setFormError("Authentication error. Please log in again.");
        return;
    }
    setIsSubmitting(true);
    setFormError(null);

    // Validation checks...
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
    if (!formData.counterId) { setFormError("Counter is required."); setIsSubmitting(false); return; }

    // --- Image Handling ---
    let finalImagePath: string | null = formData.imagePath || null;
    const oldImagePath = selectedItem?.imagePath;
    console.log('[Submit] Initial imagePath:', finalImagePath, 'Old imagePath:', oldImagePath, 'Selected file:', selectedFile?.name);

    try {
        if (selectedFile) {
            console.log('[Submit] Attempting to upload new image:', selectedFile.name);
            finalImagePath = await VendorCafeteriaController.uploadMenuItemImage(selectedFile, user.id);
            console.log('[Submit] Upload successful. New imagePath:', finalImagePath);
            if (oldImagePath && oldImagePath !== finalImagePath) {
                console.log('[Submit] Attempting to delete old image:', oldImagePath);
                VendorCafeteriaController.deleteMenuItemImage(oldImagePath).catch(err => console.error("[Submit] Failed to delete old image:", err));
            }
        } else if (!formData.imagePath && oldImagePath) { // Image removed during edit
            console.log('[Submit] Image removed by user. Attempting to delete old image:', oldImagePath);
            VendorCafeteriaController.deleteMenuItemImage(oldImagePath).catch(err => console.error("[Submit] Failed to delete removed image:", err));
            finalImagePath = null;
            console.log('[Submit] Image path set to null after removal.');
        }
    } catch (uploadError) {
        console.error('[Submit] Image upload/delete error:', uploadError);
        setFormError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
        setIsSubmitting(false);
        return;
    }
    // --- End Image Handling ---

    // Prepare data for DB
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
        imagePath: finalImagePath, // Use the final path
    };

    let submitData: Partial<MenuItem>;
    console.log('[Submit] Base data prepared:', baseData); // Log base data including finalImagePath

    if (formData.isDietFood) {
        if (calories === undefined || calories <= 0) { setFormError("Calories are required for diet food items and must be positive."); setIsSubmitting(false); return; }
        if (protein === undefined || carbs === undefined || fat === undefined || protein < 0 || carbs < 0 || fat < 0) { setFormError("Valid Protein, Carbs, and Fat values are required for diet food items."); setIsSubmitting(false); return; }
        submitData = { ...baseData, isDietFood: true, calories: calories, nutritionalInfo: { protein, carbs, fat } } as Partial<DietFoodItem>;
    } else {
        submitData = { ...baseData, isDietFood: false, nutritionalInfo: (protein !== undefined || carbs !== undefined || fat !== undefined) ? { protein, carbs, fat } : undefined } as Partial<NonDietFoodItem>;
    }

    // Save item data
    try {
      console.log('[Submit] Final data being submitted:', submitData); // Log the final data object
      if (selectedItem?.id) {
        console.log('[Submit] Calling editMenuItem for ID:', selectedItem.id);
        await VendorCafeteriaController.editMenuItem(selectedItem.id, submitData);
        console.log('[Submit] editMenuItem successful.');
      } else {
        console.log('[Submit] Calling createMenuItem.');
        const createData = submitData as Omit<MenuItem, 'id'>;
        await VendorCafeteriaController.createMenuItem(createData);
        console.log('[Submit] createMenuItem successful.');
      }
      onAddEditModalClose();
      await fetchItems(); // Refresh list
    } catch (err) {
      console.error('[Submit] Error saving item data:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to save item');
      // console.error(err); // Already logged above
      if (selectedFile && finalImagePath && !selectedItem?.id) {
          console.log('[Submit] DB save failed for new item, attempting to clean up uploaded image:', finalImagePath);
          VendorCafeteriaController.deleteMenuItemImage(finalImagePath).catch(delErr => console.error("[Submit] Failed to clean up uploaded image after DB error:", delErr));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete confirmation
  const handleDeleteConfirm = async () => {
     if (!selectedItem || isSubmitting) return;
     setIsSubmitting(true);
     setDeleteError(null);
     const imagePathToDelete = selectedItem.imagePath;

     try {
       await VendorCafeteriaController.removeMenuItem(selectedItem.id);
       if (imagePathToDelete) {
           VendorCafeteriaController.deleteMenuItemImage(imagePathToDelete).catch(err => console.error("Failed to delete image after item deletion:", err));
       }
       onDeleteModalClose();
       await fetchItems();
     } catch (err) {
       setDeleteError(err instanceof Error ? err.message : 'Failed to delete item');
       console.error(err);
     } finally {
       setIsSubmitting(false);
       setSelectedItem(null);
     }
  };

  // Toggle availability
  const handleAvailabilityToggle = async (item: MenuItem) => {
     setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, available: !mi.available } : mi));
     try {
       await VendorCafeteriaController.editMenuItem(item.id, { available: !item.available });
     } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update availability');
        console.error(err);
        setMenuItems(prev => prev.map(mi => mi.id === item.id ? { ...mi, available: item.available } : mi));
     }
  };

  // Filtered items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return menuItems;
    }
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [menuItems, searchTerm]);

  // Table columns definition
  const columns = [
    { key: "image", label: "Image" }, // Added Image column
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price" },
    { key: "stock", label: "Stock" },
    { key: "available", label: "Available" },
    { key: "actions", label: "Actions" },
  ];

  // Cell rendering logic
  const renderCell = useCallback((item: MenuItem, columnKey: string | number) => {
    const cellValue = getKeyValue(item, columnKey);
    switch (columnKey) {
      case "image": // Render image thumbnail
        const imageUrl = VendorCafeteriaController.getMenuItemImageUrl(item.imagePath);
        return (
          <div className="flex items-center justify-center w-12 h-12"> {/* Adjust size as needed */}
            {imageUrl ? (
              <Image src={imageUrl} alt={item.name} width={48} height={48} className="object-cover rounded" />
            ) : (
              <ImageIcon className="w-6 h-6 text-gray-400" /> // Placeholder icon
            )}
          </div>
        );
      case "name": // Keep name rendering simple for now
        return String(cellValue);
      case "price": return `৳${Number(cellValue).toFixed(2)}`;
      case "stock": return item.stock ?? 'N/A';
      case "available": return (
          <div className="flex justify-center">
            <Switch isSelected={item.available} onValueChange={() => handleAvailabilityToggle(item)} aria-label={`Toggle availability for ${item.name}`} size="sm" />
          </div>
        );
      case "actions": return (
          <div className="relative flex items-center justify-center gap-2">
            <Tooltip content="Edit item"><Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEditModal(item)}><Pencil className="h-5 w-5 text-default-600" /></Button></Tooltip>
            <Tooltip content="Delete item" color="danger"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenDeleteModal(item)}><Trash2 className="h-5 w-5" /></Button></Tooltip>
          </div>
        );
      default: return String(cellValue);
    }
  }, [handleAvailabilityToggle, handleOpenEditModal, handleOpenDeleteModal]);

  // Main component render
  return (
    <Card className="p-0 md:p-0">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-divider pb-4 mb-4 px-4 md:px-6 pt-4 md:pt-6">
        <h1 className="text-2xl font-semibold">Menu Management</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
           <Input
             isClearable
             className="w-full md:max-w-xs"
             placeholder="Search by name..."
             startContent={<Search className="text-default-400" size={18} />}
             value={searchTerm}
             onClear={() => setSearchTerm('')}
             onValueChange={setSearchTerm}
           />
           <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>Add New Item</Button>
        </div>
      </CardHeader>
      <CardBody className="p-4 md:px-6 md:pb-6">
        {isLoading && <div className="flex justify-center items-center h-64"><CircularProgress size="lg" aria-label="Loading..." label="Loading menu items..." /></div>}
        {!isLoading && error && <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert"><span className="font-medium">Error:</span> {error}</div>}
        {!isLoading && !error && (
          <Table aria-label="Menu Items Table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === 'available' || column.key === 'actions' || column.key === 'image' ? 'center' : 'start'}
                  width={column.key === 'image' ? 80 : undefined} // Give image column fixed width
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            {/* Use filteredItems for the table body */}
            <TableBody items={filteredItems} emptyContent={"No menu items found."}>
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
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{selectedItem ? 'Edit Menu Item' : 'Add New Menu Item'}</ModalHeader>
              <ModalBody>
                {formError && <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert"><AlertCircle className="inline w-4 h-4 mr-2" />{formError}</div>}
                <form id="add-edit-item-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                   {/* Image Upload Section - Using styled Button */}
                   <div className="md:col-span-2 flex flex-col items-center gap-2">
                      {/* Styled Button acting as the upload area */}
                      <Button
                        fullWidth
                        variant="bordered"
                        onPress={handleUploadAreaClick} // Use the explicit handler that clears value first
                        className="h-32 border-2 border-dashed border-foreground/30 hover:bg-foreground/5" // Styling to mimic the label
                        aria-label="Upload image"
                      >
                        {currentImageUrl ? (
                          <div className="relative group w-full h-full flex items-center justify-center">
                            {/* Use HeroUI Image component for preview */}
                                <Image src={currentImageUrl} alt="Menu item preview" className="max-w-full max-h-full object-contain rounded-md" />
                                <Button
                                  isIconOnly size="sm" color="danger" variant="solid"
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  aria-label="Remove image"
                                  onPress={handleRemoveImage} // Use the dedicated handler with correct type
                                >
                                  <X size={16} />
                                </Button>
                          </div>
                        ) : (
                          <div className="text-center text-foreground/60">
                            <UploadCloud className="mx-auto h-8 w-8 mb-1" />
                            <p className="text-sm">Click or drag file to upload</p>
                            <p className="text-xs">PNG, JPG, WEBP up to 5MB</p>
                          </div>
                        )}
                      </Button>
                      {/* Hidden file input remains the same */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="menu-item-image" // ID might not be needed if label is removed/not used
                        name="menu-item-image"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        className="hidden" // Keep input hidden
                      />
                   </div>

                   {/* Column 1 */}
                   <Input isRequired label="Name" name="name" value={formData.name} onValueChange={(v) => handleFormValueChange('name', v)} isInvalid={formError?.toLowerCase().includes('name')} />
                   <Input isRequired type="number" label="Price (৳)" name="price" value={String(formData.price)} onValueChange={(v) => handleFormValueChange('price', v)} min={0.01} step={0.01} isInvalid={formError?.toLowerCase().includes('price')} />
                   <Autocomplete isRequired label="Category" placeholder="Search or select a category" defaultItems={allCategories} selectedKey={formData.category} onSelectionChange={(key) => handleFormValueChange('category', key as string)} isInvalid={formError?.toLowerCase().includes('category')} errorMessage={formError?.toLowerCase().includes('category') ? formError : undefined} isLoading={isLoading} isDisabled={isLoading || allCategories.length === 0} allowsCustomValue={false}>
                      {(category) => <AutocompleteItem key={category.name}>{category.name}</AutocompleteItem>}
                    </Autocomplete>
                   <Input isRequired type="number" label="Stock" name="stock" value={String(formData.stock)} onValueChange={(v) => handleFormValueChange('stock', v)} min={0} step={1} isInvalid={formError?.toLowerCase().includes('stock')} />
                   <Autocomplete isRequired label="Counter" placeholder="Search or select a counter" defaultItems={allCounters} selectedKey={formData.counterId} onSelectionChange={(key) => handleFormValueChange('counterId', key as string)} isInvalid={formError?.toLowerCase().includes('counter')} errorMessage={formError?.toLowerCase().includes('counter') ? formError : undefined} isLoading={isLoading} isDisabled={isLoading || allCounters.length === 0} allowsCustomValue={false}>
                       {(counter) => <AutocompleteItem key={counter.id}>{counter.name}</AutocompleteItem>}
                   </Autocomplete>

                   {/* Column 2 */}
                   <Textarea label="Description" name="description" value={formData.description} onValueChange={(v) => handleFormValueChange('description', v)} className="md:col-span-2" />
                   <Textarea label="Ingredients (comma-separated)" name="ingredients" value={formData.ingredients} onValueChange={(v) => handleFormValueChange('ingredients', v)} className="md:col-span-2" />
                   <Textarea label="Allergens (comma-separated)" name="allergens" value={formData.allergens} onValueChange={(v) => handleFormValueChange('allergens', v)} className="md:col-span-2" />

                   {/* Switches */}
                   <div className="flex items-center mt-2"><Switch isSelected={formData.available} onValueChange={(v) => handleFormValueChange('available', v)} name="available" size="sm">Available</Switch></div>
                   <div className="flex items-center mt-2"><Switch isSelected={formData.isDietFood} onValueChange={(v) => handleFormValueChange('isDietFood', v)} name="isDietFood" size="sm">Is Diet Food</Switch></div>

                   {/* Diet Food Specific Fields */}
                   {formData.isDietFood && (
                      <Card className="md:col-span-2 mt-4" shadow="sm">
                         <CardHeader><h3 className="text-md font-semibold">Diet Information</h3></CardHeader>
                         <CardBody>
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <Input isRequired type="number" label="Calories" name="calories" value={String(formData.calories)} onValueChange={(v) => handleFormValueChange('calories', v)} min={0} step={1} size="sm" isInvalid={formError?.toLowerCase().includes('calories')} />
                              <Input isRequired type="number" label="Protein (g)" name="nutritionalInfo.protein" value={String(formData.nutritionalInfo?.protein)} onValueChange={(v) => handleFormValueChange('nutritionalInfo.protein', v)} min={0} step={0.1} size="sm" isInvalid={formError?.toLowerCase().includes('protein')} />
                              <Input isRequired type="number" label="Carbs (g)" name="nutritionalInfo.carbs" value={String(formData.nutritionalInfo?.carbs)} onValueChange={(v) => handleFormValueChange('nutritionalInfo.carbs', v)} min={0} step={0.1} size="sm" isInvalid={formError?.toLowerCase().includes('carbs')} />
                              <Input isRequired type="number" label="Fat (g)" name="nutritionalInfo.fat" value={String(formData.nutritionalInfo?.fat)} onValueChange={(v) => handleFormValueChange('nutritionalInfo.fat', v)} min={0} step={0.1} size="sm" isInvalid={formError?.toLowerCase().includes('fat')} />
                           </div>
                         </CardBody>
                      </Card>
                   )}
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancel</Button>
                <Button color="primary" onPress={() => handleFormSubmit()} isLoading={isSubmitting}>{isSubmitting ? 'Saving...' : (selectedItem ? 'Save Changes' : 'Add Item')}</Button>
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
                 {deleteError && <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert"><AlertCircle className="inline w-4 h-4 mr-2" />{deleteError}</div>}
                 <p>Are you sure you want to delete the item "{selectedItem?.name}"?</p>
                 <p className="text-sm text-danger">This action cannot be undone.</p>
               </ModalBody>
               <ModalFooter>
                 <Button variant="light" onPress={onClose}>Cancel</Button>
                 <Button color="danger" onPress={handleDeleteConfirm} isLoading={isSubmitting}>{isSubmitting ? 'Deleting...' : 'Delete'}</Button>
               </ModalFooter>
             </>
           )}
         </ModalContent>
      </Modal>
    </Card>
  );
}
