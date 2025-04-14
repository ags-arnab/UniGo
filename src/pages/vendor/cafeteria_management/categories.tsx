import React, { useState, useEffect, useCallback } from 'react';
import { VendorCafeteriaController, Category } from '@/controllers/vendorCafeteriaController';
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
  Textarea, // Added for description
  CircularProgress,
  Tooltip
} from "@heroui/react";

interface CategoryFormData {
  id?: string;
  name: string;
  description: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  description: '',
};

export default function VendorCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen: isAddEditModalOpen, onOpen: onAddEditModalOpen, onClose: onAddEditModalClose, onOpenChange: onAddEditModalOpenChange } = useDisclosure();
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onClose: onDeleteModalClose, onOpenChange: onDeleteModalOpenChange } = useDisclosure();

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedCategories = await VendorCafeteriaController.getVendorCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFormValueChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setSelectedCategory(null);
    setFormError(null);
    onAddEditModalOpen();
  };

  const handleOpenEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormError(null);
    setFormData({
      id: category.id,
      name: category.name,
      description: category.description || '',
    });
    onAddEditModalOpen();
  };

  const handleOpenDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setDeleteError(null);
    onDeleteModalOpen();
  };

  const handleFormSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    if (!formData.name || formData.name.trim() === '') {
      setFormError("Category name is required.");
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null, // Send null if empty
    };

    try {
      if (selectedCategory?.id) {
        await VendorCafeteriaController.updateCategory(selectedCategory.id, submitData);
      } else {
        await VendorCafeteriaController.createCategory(submitData);
      }
      onAddEditModalClose();
      await fetchCategories(); // Refresh list
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory || isSubmitting) return;
    setIsSubmitting(true);
    setDeleteError(null);

    try {
      await VendorCafeteriaController.deleteCategory(selectedCategory.id);
      onDeleteModalClose();
      await fetchCategories(); // Refresh list
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete category. Check if it is used by any menu items.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setSelectedCategory(null);
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = useCallback((category: Category, columnKey: string | number) => {
    const cellValue = getKeyValue(category, columnKey);

    switch (columnKey) {
      case "description":
        return cellValue || <span className="text-default-400 italic">N/A</span>; // Display N/A if no description
      case "actions":
        return (
          <div className="relative flex items-center justify-end gap-2"> {/* Align actions to the end */}
            <Tooltip content="Edit Category">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenEditModal(category)}>
                <Pencil className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
            <Tooltip content="Delete Category" color="danger">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenDeleteModal(category)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue);
    }
  }, []); // Removed dependencies as handlers are defined outside

  return (
    <Card className="p-4 md:p-6 m-4">
      <CardHeader className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Manage Categories</h1>
        <Button color="primary" onPress={handleOpenAddModal} startContent={<Plus className="h-5 w-5" />}>
          Add New Category
        </Button>
      </CardHeader>
      <CardBody>
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <CircularProgress size="lg" aria-label="Loading..." label="Loading categories..." />
          </div>
        )}
        {!isLoading && error && (
          <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Categories Table">
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === 'actions' ? 'end' : 'start'} // Align actions end
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={categories} emptyContent={"No categories found."}>
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
                {selectedCategory ? 'Edit Category' : 'Add New Category'}
              </ModalHeader>
              <ModalBody>
                {formError && (
                  <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                    <AlertCircle className="inline w-4 h-4 mr-2" />{formError}
                  </div>
                )}
                <form id="add-edit-category-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  <Input
                    isRequired
                    label="Category Name"
                    name="name"
                    value={formData.name}
                    onValueChange={(v) => handleFormValueChange('name', v)}
                    isInvalid={!!formError} // Highlight if any form error exists
                    errorMessage={formError?.toLowerCase().includes('name') || formError?.toLowerCase().includes('exists') ? formError : undefined}
                  />
                  <Textarea
                    label="Description (Optional)"
                    name="description"
                    value={formData.description}
                    onValueChange={(v) => handleFormValueChange('description', v)}
                  />
                </form>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={() => handleFormSubmit()} isLoading={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (selectedCategory ? 'Save Changes' : 'Add Category')}
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
                <p>Are you sure you want to delete the category "{selectedCategory?.name}"?</p>
                <p className="text-sm text-warning">Note: Deleting a category does not automatically update menu items using it. You may need to manually update those items.</p>
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
