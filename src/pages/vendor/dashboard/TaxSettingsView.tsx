import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';
import { VendorCafeteriaController, TaxRate } from '@/controllers/vendorCafeteriaController';
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
  Switch,
  CircularProgress,
  Tooltip,
  Card // Re-added Card import
} from "@heroui/react";

// Form data structure
interface TaxRateFormData {
  id?: string;
  name: string;
  rate: number | string; // Allow string for input
  description: string;
  isActive: boolean;
}

const initialFormData: TaxRateFormData = {
  name: '',
  rate: '',
  description: '',
  isActive: true,
};

// Helper to safely parse float between 0 and 1
const safeParseRate = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') {
      return (value >= 0 && value <= 1) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return (!isNaN(parsed) && parsed >= 0 && parsed <= 1) ? parsed : undefined;
  }
  return undefined;
};

export default function TaxSettingsView() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState<TaxRateFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();

  const fetchTaxRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rates = await VendorCafeteriaController.getVendorTaxRates();
      setTaxRates(rates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tax rates');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxRates();
  }, [fetchTaxRates]);

  const handleFormValueChange = (name: keyof TaxRateFormData, value: string | number | boolean) => {
     setFormData(prev => ({ ...prev, [name]: value }));
     setFormError(null);
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setSelectedRate(null);
    setFormError(null);
    onAddEditModalOpen();
  };

  const handleOpenEditModal = (rate: TaxRate) => {
    setSelectedRate(rate);
    setFormError(null);
    setFormData({
      id: rate.id,
      name: rate.name,
      rate: rate.rate, // Keep as number for initial state
      description: rate.description || '',
      isActive: rate.isActive,
    });
    onAddEditModalOpen();
  };

  const handleOpenDeleteModal = (rate: TaxRate) => {
    setSelectedRate(rate);
    setDeleteError(null);
    onDeleteModalOpen();
  };

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    const parsedRate = safeParseRate(formData.rate);

    if (!formData.name) { setFormError("Tax name is required."); setIsSubmitting(false); return; }
    if (parsedRate === undefined) { setFormError("Rate must be a valid number between 0 and 1 (e.g., 0.15 for 15%)."); setIsSubmitting(false); return; }

    const submitData: Omit<TaxRate, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        rate: parsedRate,
        description: formData.description || null,
        isActive: formData.isActive,
    };

    try {
      if (selectedRate?.id) {
        await VendorCafeteriaController.updateTaxRate(selectedRate.id, submitData);
      } else {
        await VendorCafeteriaController.createTaxRate(submitData);
      }
      onAddEditModalClose();
      await fetchTaxRates(); // Refresh list
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save tax rate');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
     if (!selectedRate || isSubmitting) return;
     setIsSubmitting(true);
     setDeleteError(null);

     try {
       await VendorCafeteriaController.deleteTaxRate(selectedRate.id);
       onDeleteModalClose();
       await fetchTaxRates(); // Refresh list
     } catch (err) {
       setDeleteError(err instanceof Error ? err.message : 'Failed to delete tax rate');
       console.error(err);
     } finally {
       setIsSubmitting(false);
       setSelectedRate(null);
     }
  };

  // Optional: Inline toggle for isActive status
  const handleActiveToggle = async (rate: TaxRate) => {
     // Optimistic UI update
     setTaxRates(prev => prev.map(r => r.id === rate.id ? { ...r, isActive: !r.isActive } : r));
     try {
       await VendorCafeteriaController.updateTaxRate(rate.id, { isActive: !rate.isActive });
       // Optional: Refetch to confirm
       // await fetchTaxRates();
     } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update tax status');
        console.error(err);
        // Revert optimistic update on error
        setTaxRates(prev => prev.map(r => r.id === rate.id ? { ...r, isActive: rate.isActive } : r));
     }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "rate", label: "Rate" },
    { key: "description", label: "Description" },
    { key: "isActive", label: "Active" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = useCallback((rate: TaxRate, columnKey: string | number) => {
    const cellValue = getKeyValue(rate, columnKey);

    switch (columnKey) {
      case "rate":
        return `${(Number(cellValue) * 100).toFixed(2)}%`; // Display as percentage
      case "isActive":
        return (
          <div className="flex justify-center">
            <Switch
              isSelected={rate.isActive}
              onValueChange={() => handleActiveToggle(rate)} // Use inline toggle
              aria-label={`Toggle status for ${rate.name}`}
              size="sm"
            />
            {/* Or display as Chip:
            <Chip color={rate.isActive ? "success" : "default"} size="sm" variant="flat">
              {rate.isActive ? "Active" : "Inactive"}
            </Chip> */}
          </div>
        );
      case "actions":
        return (
          <div className="relative flex items-center justify-center gap-2">
            <Tooltip content="Edit tax rate">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEditModal(rate)}>
                <Pencil className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete tax rate" color="danger">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenDeleteModal(rate)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue ?? ''); // Handle null/undefined descriptions
    }
  }, [handleActiveToggle, handleOpenEditModal, handleOpenDeleteModal]); // Include dependencies

  return (
    <Card className="p-0 md:p-0"> {/* Added Card wrapper */}
      <CardHeader className="flex justify-between items-center border-b border-divider pb-4 mb-4 px-4 md:px-6 pt-4 md:pt-6"> {/* Added padding */}
        <h1 className="text-2xl font-semibold">Tax Settings</h1>
        <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>
          Add New Tax Rate
        </Button>
      </CardHeader>
      <CardBody className="p-4 md:px-6 md:pb-6"> {/* Added padding */}
        {isLoading && (
           <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading tax rates..." />
           </div>
        )}
        {!isLoading && error && (
           <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
             <span className="font-medium">Error:</span> {error}
           </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Tax Rates Table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === 'isActive' || column.key === 'actions' ? 'center' : 'start'}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={taxRates} emptyContent={"No tax rates configured."}>
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
      <Modal isOpen={isAddEditModalOpen} onOpenChange={onAddEditModalOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
              </ModalHeader>
              <ModalBody>
                {formError && (
                   <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                     <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                   </div>
                )}
                <form id="add-edit-tax-form" onSubmit={handleFormSubmit} className="space-y-4">
                   <Input
                     isRequired
                     autoFocus={!selectedRate} // Autofocus only when adding
                     label="Tax Name"
                     name="name"
                     value={formData.name}
                     onValueChange={(v) => handleFormValueChange('name', v)}
                     placeholder="e.g., VAT, Service Charge"
                     isInvalid={formError?.toLowerCase().includes('name')}
                   />
                   <Input
                     isRequired
                     type="number"
                     label="Rate (Decimal)"
                     name="rate"
                     value={String(formData.rate)} // Input expects string
                     onValueChange={(v) => handleFormValueChange('rate', v)}
                     placeholder="e.g., 0.15 for 15%"
                     min={0}
                     max={1}
                     step={0.01}
                     isInvalid={formError?.toLowerCase().includes('rate')}
                     description="Enter the rate as a decimal between 0 and 1."
                   />
                   <Input
                     label="Description (Optional)"
                     name="description"
                     value={formData.description}
                     onValueChange={(v) => handleFormValueChange('description', v)}
                     placeholder="Optional details about the tax"
                   />
                   <Switch
                     isSelected={formData.isActive}
                     onValueChange={(v) => handleFormValueChange('isActive', v)}
                     name="isActive"
                   >
                     Tax rate is active
                   </Switch>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleFormSubmit()} isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedRate ? 'Save Changes' : 'Add Rate')}
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
                 <p>Are you sure you want to delete the tax rate "{selectedRate?.name}"?</p>
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
    </Card> // Closed Card wrapper
  );
}
