import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import types
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
  Card,
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

// TODO: Get vendorId from authentication context

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

export default function VendorCountersPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);
  const [formData, setFormData] = useState<CounterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth(); // Get user context
  const counterChannelRef = useRef<RealtimeChannel | null>(null);

  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();

  const fetchCounters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Remove MOCK_VENDOR_ID argument
      const fetchedCounters = await VendorCafeteriaController.getVendorCounters();
      setCounters(fetchedCounters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch counters');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Realtime Handler for Counters ---
  const handleCounterChange = useCallback((payload: RealtimePostgresChangesPayload<Counter>) => {
    console.log('[Counters] Realtime Counter Change Received:', payload);
    const { eventType, new: newCounterData, old: oldCounterData, errors } = payload;

    if (errors) {
      console.error('[Counters] Realtime error:', errors);
      setError(prev => prev ? `${prev}\nRealtime error: ${errors[0]}` : `Realtime error: ${errors[0]}`);
      return;
    }

    setCounters(currentCounters => {
      let updatedCounters = [...currentCounters];

      if (eventType === 'INSERT') {
        const newCounter = newCounterData as Counter;
        if (!updatedCounters.some(c => c.id === newCounter.id)) {
          console.log(`[Counters] Adding new counter ${newCounter.id} via realtime.`);
          updatedCounters = [newCounter, ...updatedCounters]; // Add to beginning
        }
      } else if (eventType === 'UPDATE') {
        const updatedCounter = newCounterData as Counter;
        const index = updatedCounters.findIndex(c => c.id === updatedCounter.id);
        if (index !== -1) {
          console.log(`[Counters] Updating counter ${updatedCounter.id} via realtime.`);
          updatedCounters[index] = updatedCounter;
        } else {
          // If update received for a counter not in state, treat as insert
          console.log(`[Counters] Received update for unknown counter ${updatedCounter.id}, adding.`);
          updatedCounters = [updatedCounter, ...updatedCounters];
        }
      } else if (eventType === 'DELETE') {
        const deletedCounterId = (oldCounterData as Counter)?.id;
        if (deletedCounterId) {
          console.log(`[Counters] Removing counter ${deletedCounterId} via realtime.`);
          updatedCounters = updatedCounters.filter(c => c.id !== deletedCounterId);
        }
      }
      return updatedCounters;
    });
  }, []); // No dependencies needed

  // --- Function to setup subscriptions ---
  const setupRealtimeSubscriptions = useCallback(() => {
    // Cleanup existing channel
    if (counterChannelRef.current) {
      supabase.removeChannel(counterChannelRef.current).then(() => console.log("[Counters] Cleaned up existing counter channel."));
      counterChannelRef.current = null;
    }

    if (!user) {
      console.log("[Counters] Skipping subscription setup: No user.");
      return;
    }

    console.log(`[Counters] Setting up counter subscription for user ${user.id}`);

    const channel = supabase
      .channel(`vendor_counters_${user.id}`)
      .on<Counter>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'counters',
          // RLS policies handle filtering for the vendor's counters
        },
        handleCounterChange // Use the dedicated handler
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Counters] Realtime COUNTERS channel subscribed.`);
        } else {
          console.error(`[Counters] Realtime COUNTERS channel error: ${status}`, err);
          setError(prev => prev ? `${prev}\nRealtime connection error: ${err?.message}` : `Realtime connection error: ${err?.message}`);
        }
      });
    counterChannelRef.current = channel;

  }, [user, handleCounterChange]); // Dependencies

  // Main useEffect for fetching data and setting up subscriptions
  useEffect(() => {
    let isMounted = true;
    console.log("[Counters] useEffect main running.");

    const fetchAndSubscribe = async () => {
        await fetchCounters(); // Fetch initial data
        if (isMounted) {
            console.log("[Counters] Initial fetch complete. Setting up subscriptions.");
            setupRealtimeSubscriptions();
        }
    };

    fetchAndSubscribe();

    // Cleanup function
    return () => {
      console.log("[Counters] useEffect main cleanup.");
      isMounted = false;
      if (counterChannelRef.current) {
        supabase.removeChannel(counterChannelRef.current)
          .then(() => console.log("[Counters] Realtime channel removed on unmount."))
          .catch(err => console.error("[Counters] Error removing channel on unmount:", err));
        counterChannelRef.current = null;
      }
    };
  }, [fetchCounters, setupRealtimeSubscriptions]); // Dependencies

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
        // Remove MOCK_VENDOR_ID argument
        await VendorCafeteriaController.updateCounter(selectedCounter.id, submitData);
      } else {
        // Remove MOCK_VENDOR_ID argument
        await VendorCafeteriaController.createCounter(submitData);
      }
      onAddEditModalClose();
      // await fetchCounters(); // REMOVE: Realtime will update the list
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save counter');
      console.error("Form submit error:", err); // Log error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCounter || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      // Remove MOCK_VENDOR_ID argument
      await VendorCafeteriaController.deleteCounter(selectedCounter.id);
      onDeleteModalClose();
      // await fetchCounters(); // REMOVE: Realtime will update the list
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete counter');
      console.error("Delete error:", err); // Log error
    } finally {
      setIsSubmitting(false);
      setSelectedCounter(null);
    }
  };

  const handleActiveToggle = async (counter: Counter) => {
     // Optimistic UI update
     setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, isActive: !c.isActive } : c));
     try {
       // Remove MOCK_VENDOR_ID argument
        await VendorCafeteriaController.updateCounter(counter.id, { isActive: !counter.isActive });
        // Realtime update will confirm the change, no explicit success handling needed here
     } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update counter status';
        setError(errorMsg); // Show error to user
        console.error("Toggle active error:", err);
        // Revert optimistic update on error
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
  }, []); // Removed handlers as they don't change

  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Manage Counters</h1>
        <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>
          Add New Counter
        </Button>
      </CardHeader>
      <CardBody>
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
    </Card>
  );
}
