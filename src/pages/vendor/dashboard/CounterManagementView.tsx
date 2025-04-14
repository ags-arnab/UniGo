import React, { useState, useEffect, useCallback } from 'react';
import { VendorCafeteriaController } from '@/controllers/vendorCafeteriaController';
import { Counter } from '@/models/vendor/counter';
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  Card, // Re-added Card
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
  Tooltip
} from "@heroui/react";

// Removed MOCK_VENDOR_ID

interface CounterFormData {
  id?: string;
  name: string;
  location: string;
  isActive: boolean;
}

const initialFormData: CounterFormData = {
  name: '',
  location: '',
  isActive: true,
};

export default function CounterManagementView() { // Renamed component
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [formData, setFormData] = useState<CounterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();

  const fetchCounters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedCounters = await VendorCafeteriaController.getVendorCounters();
      setCounters(fetchedCounters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counters');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const handleFormValueChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setSelectedCounter(null);
    setFormError(null);
    onAddEditModalOpen();
  };

  const handleOpenEditModal = (counter: Counter) => {
    setSelectedCounter(counter);
    setFormError(null);
    setFormData({
      id: counter.id,
      name: counter.name,
      location: counter.location || '',
      isActive: counter.isActive,
    });
    onAddEditModalOpen();
  };

  const handleOpenDeleteModal = (counter: Counter) => {
    setSelectedCounter(counter);
    setDeleteError(null);
    onDeleteModalOpen();
  };

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (!formData.name) {
      setFormError("Counter name is required.");
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      name: formData.name,
      location: formData.location,
      isActive: formData.isActive,
    };

    try {
      if (selectedCounter?.id) {
        await VendorCafeteriaController.updateCounter(selectedCounter.id, submitData);
      } else {
        await VendorCafeteriaController.createCounter(submitData);
      }
      onAddEditModalClose();
      await fetchCounters(); // Refresh list
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save counter');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCounter || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      await VendorCafeteriaController.deleteCounter(selectedCounter.id);
      onDeleteModalClose();
      await fetchCounters(); // Refresh list
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete counter');
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setSelectedCounter(null);
    }
  };

  const handleActiveToggle = async (counter: Counter) => {
     setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, isActive: !c.isActive } : c));
     try {
       await VendorCafeteriaController.updateCounter(counter.id, { isActive: !counter.isActive });
     } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update counter status');
        console.error(err);
        setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, isActive: counter.isActive } : c));
     }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "location", label: "Location" },
    { key: "isActive", label: "Active" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = useCallback((counter: Counter, columnKey: string | number) => {
    const cellValue = getKeyValue(counter, columnKey);

    switch (columnKey) {
      case "isActive":
        return (
          <div className="flex justify-center">
            <Switch
              isSelected={counter.isActive}
              onValueChange={() => handleActiveToggle(counter)}
              aria-label={`Toggle status for ${counter.name}`}
              size="sm"
            />
          </div>
        );
      case "actions":
        return (
          <div className="relative flex items-center justify-center gap-2">
            <Tooltip content="Edit Counter">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEditModal(counter)}>
                <Pencil className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete Counter" color="danger">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenDeleteModal(counter)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue);
    }
  }, [handleActiveToggle, handleOpenEditModal, handleOpenDeleteModal]);

  return (
    <Card className="p-0 md:p-0"> {/* Added Card wrapper */}
      <CardHeader className="flex justify-between items-center border-b border-divider pb-4 mb-4 px-4 md:px-6 pt-4 md:pt-6"> {/* Added padding */}
        <h1 className="text-2xl font-semibold">Manage Counters</h1>
        <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>
          Add New Counter
        </Button>
      </CardHeader>
      <CardBody className="p-4 md:px-6 md:pb-6"> {/* Added padding */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <CircularProgress size="lg" aria-label="Loading..." label="Loading counters..." />
          </div>
        )}
        {!isLoading && error && (
          <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Counters Table">
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
            <TableBody items={counters} emptyContent={"No counters found."}>
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
      <Modal isOpen={isAddEditModalOpen} onOpenChange={onAddEditModalOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedCounter ? 'Edit Counter' : 'Add New Counter'}
              </ModalHeader>
              <ModalBody>
                {formError && (
                  <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                    <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                  </div>
                )}
                <form id="add-edit-counter-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <Input
                    isRequired
                    label="Counter Name"
                    name="name"
                    value={formData.name}
                    onValueChange={(v) => handleFormValueChange('name', v)}
                    isInvalid={formError?.toLowerCase().includes('name')}
                  />
                  <Input
                    label="Location (Optional)"
                    name="location"
                    value={formData.location}
                    onValueChange={(v) => handleFormValueChange('location', v)}
                  />
                  <Switch
                    isSelected={formData.isActive}
                    onValueChange={(v) => handleFormValueChange('isActive', v)}
                    name="isActive"
                  >
                    Active
                  </Switch>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleFormSubmit()} isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedCounter ? 'Save Changes' : 'Add Counter')}
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
                <p>Are you sure you want to delete the counter "{selectedCounter?.name}"?</p>
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
