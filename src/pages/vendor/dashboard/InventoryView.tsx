import { useState, useEffect, useCallback } from 'react';
import { Edit, AlertCircle } from 'lucide-react';
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
import { MenuItem } from '@/models/cafeteria';
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
  CircularProgress,
  Tooltip,
  Card // Re-added Card import
} from "@heroui/react";

// Helper to safely parse integers
const safeParseInt = (value: string | number | undefined): number | undefined => {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
};

export default function InventoryView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [newStock, setNewStock] = useState<string | number>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen: isStockModalOpen, onOpen: onStockModalOpen, onClose: onStockModalClose, onOpenChange: onStockModalOpenChange } = useDisclosure();

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await VendorCafeteriaController.getVendorMenuItems();
      setMenuItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenStockModal = (item: MenuItem) => {
    setSelectedItem(item);
    setNewStock(item.stock ?? ''); // Initialize with current stock
    setFormError(null);
    onStockModalOpen();
  };

  const handleStockChange = (value: string) => {
    setNewStock(value);
    setFormError(null);
  };

  const handleStockUpdateSubmit = async () => {
    if (!selectedItem || isSubmitting) return;

    const stockValue = safeParseInt(newStock);

    if (stockValue === undefined || stockValue < 0) {
      setFormError("Stock must be a valid non-negative number.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await VendorCafeteriaController.setItemStock(selectedItem.id, stockValue);
      onStockModalClose();
      // Optimistic update or refetch
      setMenuItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedItem.id ? { ...item, stock: stockValue } : item
        )
      );
      // await fetchItems(); // Or refetch
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update stock');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "stock", label: "Current Stock" },
    { key: "actions", label: "Update Stock" },
  ];

  const renderCell = useCallback((item: MenuItem, columnKey: string | number) => {
    const cellValue = getKeyValue(item, columnKey);

    switch (columnKey) {
      case "stock":
        return item.stock ?? <span className="text-warning-500">N/A</span>; // Indicate if stock is null/undefined
      case "actions":
        return (
          <div className="relative flex items-center justify-center gap-2">
            <Tooltip content="Update Stock">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenStockModal(item)}>
                <Edit className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue);
    }
  }, [handleOpenStockModal]); // Include dependencies

  return (
    <Card className="p-0 md:p-0"> {/* Added Card wrapper */}
      <CardHeader className="flex justify-between items-center border-b border-divider pb-4 mb-4 px-4 md:px-6 pt-4 md:pt-6"> {/* Added padding */}
        <h1 className="text-2xl font-semibold">Inventory Management</h1>
        {/* Optional: Add button for bulk updates or other actions */}
      </CardHeader>
      <CardBody className="p-4 md:px-6 md:pb-6"> {/* Added padding */}
        {isLoading && (
           <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading inventory..." />
           </div>
        )}
        {!isLoading && error && (
           <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
             <span className="font-medium">Error:</span> {error}
           </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Inventory Table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === 'actions' ? 'center' : 'start'}
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

      {/* Update Stock Modal */}
      <Modal isOpen={isStockModalOpen} onOpenChange={onStockModalOpenChange} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Update Stock for "{selectedItem?.name}"</ModalHeader>
              <ModalBody>
                {formError && (
                   <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                     <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                   </div>
                )}
                <Input
                  isRequired
                  autoFocus
                  type="number"
                  label="New Stock Quantity"
                  name="stock"
                  value={String(newStock)}
                  onValueChange={handleStockChange}
                  min={0}
                  step={1}
                  isInvalid={!!formError}
                  placeholder="Enter new stock level"
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleStockUpdateSubmit} isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Update Stock'}
                </Button>
              </ModalFooter>
            </>
          )}
         </ModalContent>
      </Modal>
    </Card> // Closed Card wrapper
  );
}
