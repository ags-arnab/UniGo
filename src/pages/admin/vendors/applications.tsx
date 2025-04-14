import { useState, useEffect, useCallback } from 'react';
import { AdminController, VendorApplicationWithProfile } from '@/controllers/adminController';
import { CheckCircle, XCircle, Eye, AlertCircle, Download } from 'lucide-react'; // Added Download icon
import { supabase } from '@/lib/supabaseClient'; // Import supabase client for URL generation
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
  Textarea, // For reviewer notes
  CircularProgress,
  Tooltip,
} from "@heroui/react";

// Helper function to format date/time
const formatDateTime = (date: Date | string | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString(); // Adjust format as needed
};

type ReviewAction = 'approve' | 'reject';

export default function AdminVendorApplicationsPage() {
  const [applications, setApplications] = useState<VendorApplicationWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<VendorApplicationWithProfile | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal for viewing details
  const { isOpen: isDetailModalOpen, onOpen: onDetailModalOpen, onClose: onDetailModalClose, onOpenChange: _onDetailModalOpenChange } = useDisclosure();
  // Modal for approve/reject confirmation
  const { isOpen: isReviewModalOpen, onOpen: onReviewModalOpen, onClose: onReviewModalClose, onOpenChange: onReviewModalOpenChange } = useDisclosure(); // Added onOpenChange

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch only pending applications for this view
      const fetchedApps = await AdminController.getVendorApplications('pending');
      setApplications(fetchedApps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenDetailModal = (app: VendorApplicationWithProfile) => {
    setSelectedApp(app);
    onDetailModalOpen();
  };

  const handleOpenReviewModal = (app: VendorApplicationWithProfile, action: ReviewAction) => {
    setSelectedApp(app);
    setReviewAction(action);
    setReviewerNotes(''); // Reset notes
    setModalError(null);
    onReviewModalOpen();
  };

  const handleReviewSubmit = async () => {
    if (!selectedApp || !reviewAction || isSubmitting) return;

    setIsSubmitting(true);
    setModalError(null);

    // Explicitly type the status based on reviewAction
    const statusPayload: 'approved' | 'rejected' = reviewAction === 'approve' ? 'approved' : 'rejected';

    const payload = {
        status: statusPayload,
        reviewer_notes: reviewerNotes || null
    };

    try {
      await AdminController.reviewVendorApplication(selectedApp.id, payload, selectedApp.user_id);
      onReviewModalClose();
      await fetchApplications(); // Refresh the list of pending applications
    } catch (err) {
      setModalError(err instanceof Error ? err.message : `Failed to ${reviewAction} application`);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "business_name", label: "Business Name" },
    { key: "contact_person", label: "Contact Person" },
    { key: "email", label: "Contact Email" },
    { key: "submitted_at", label: "Submitted At" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = useCallback((app: VendorApplicationWithProfile, columnKey: string | number) => {
    const cellValue = getKeyValue(app, columnKey);

    switch (columnKey) {
      case "submitted_at":
        return formatDateTime(app.submitted_at);
      case "actions":
        return (
          <div className="relative flex items-center justify-center gap-1">
            <Tooltip content="View Details">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleOpenDetailModal(app)}>
                <Eye className="h-5 w-5 text-default-600" />
              </Button>
            </Tooltip>
            <Tooltip content="Approve" color="success">
              <Button isIconOnly size="sm" variant="light" color="success" onPress={() => handleOpenReviewModal(app, 'approve')}>
                <CheckCircle className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="Reject" color="danger">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleOpenReviewModal(app, 'reject')}>
                <XCircle className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue ?? ''); // Handle potential null values
    }
  }, [handleOpenDetailModal, handleOpenReviewModal]); // Include dependencies

  return (
    <Card>
      <CardHeader className="flex justify-between items-center border-b border-divider pb-4">
        <h1 className="text-2xl font-semibold">Vendor Applications (Pending)</h1>
        {/* Optional: Add filters or refresh button */}
      </CardHeader>
      <CardBody>
        {isLoading && (
           <div className="flex justify-center items-center h-64">
              <CircularProgress size="lg" aria-label="Loading..." label="Loading applications..." />
           </div>
        )}
        {!isLoading && error && (
           <div className="p-4 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
             <span className="font-medium">Error:</span> {error}
           </div>
        )}

        {!isLoading && !error && (
          <Table aria-label="Pending Vendor Applications Table">
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
            <TableBody items={applications} emptyContent={"No pending applications found."}>
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardBody>

      {/* Application Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={onDetailModalClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Application Details</ModalHeader>
              <ModalBody>
                {selectedApp ? (
                  <div className="space-y-3 text-sm">
                    <p><strong>Applicant:</strong> {selectedApp.profiles?.full_name || selectedApp.contact_person} ({selectedApp.profiles?.email || selectedApp.email})</p>
                    <p><strong>User ID:</strong> {selectedApp.user_id}</p>
                    <p><strong>Business Name:</strong> {selectedApp.business_name}</p>
                    <p><strong>Business Type:</strong> {selectedApp.business_type}</p>
                    <p><strong>Contact Person:</strong> {selectedApp.contact_person}</p>
                    <p><strong>Contact Phone:</strong> {selectedApp.phone}</p>
                    <p><strong>Description:</strong> {selectedApp.description || 'N/A'}</p>
                    <p><strong>Submitted At:</strong> {formatDateTime(selectedApp.submitted_at)}</p>
                    {/* Display Document Links */}
                    <div className="mt-4 pt-3 border-t border-divider">
                      <h4 className="font-semibold mb-2 text-default-700">Uploaded Documents:</h4>
                      <div className="space-y-2">
                        {selectedApp.business_registration_doc_path ? (
                          <div className="flex items-center justify-between">
                            <span className="text-default-600">Business Registration:</span>
                            <Button
                              size="sm"
                              variant="flat"
                              color="secondary"
                              as="a" // Render as an anchor tag
                              href={supabase.storage.from('vendor-documents').getPublicUrl(selectedApp.business_registration_doc_path).data.publicUrl}
                              target="_blank" // Open in new tab
                              rel="noopener noreferrer" // Security best practice
                              startContent={<Download className="w-4 h-4" />}
                            >
                              View/Download
                            </Button>
                          </div>
                        ) : (
                          <p className="text-default-500 text-xs">Business Registration: Not provided</p>
                        )}
                        {selectedApp.food_handling_doc_path ? (
                           <div className="flex items-center justify-between">
                             <span className="text-default-600">Food Handling License:</span>
                             <Button
                               size="sm"
                               variant="flat"
                               color="secondary"
                               as="a"
                               href={supabase.storage.from('vendor-documents').getPublicUrl(selectedApp.food_handling_doc_path).data.publicUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               startContent={<Download className="w-4 h-4" />}
                             >
                               View/Download
                             </Button>
                           </div>
                        ) : (
                          <p className="text-default-500 text-xs">Food Handling License: Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>No application selected.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Review Confirmation Modal */}
      <Modal isOpen={isReviewModalOpen} onOpenChange={onReviewModalOpenChange} size="xl"> {/* Corrected onOpenChange */}
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 capitalize">{reviewAction} Application?</ModalHeader>
              <ModalBody>
                {modalError && (
                   <div className="p-3 mb-4 text-sm text-danger-800 rounded-lg bg-danger-50 dark:bg-gray-800 dark:text-danger-400" role="alert">
                     <AlertCircle className="inline w-4 h-4 mr-2" />{modalError}
                   </div>
                )}
                <p>
                  Are you sure you want to{' '}
                  <span className={reviewAction === 'approve' ? 'font-semibold text-success' : 'font-semibold text-danger'}>
                    {reviewAction}
                  </span>{' '}
                  the application for "{selectedApp?.business_name}"?
                </p>
                {reviewAction === 'approve' && (
                    <p className="text-sm text-warning-600">This will change the user's role to 'vendor'.</p>
                )}
                 <Textarea
                    label="Reviewer Notes (Optional)"
                    placeholder="Add any feedback or reasons..."
                    value={reviewerNotes}
                    onValueChange={setReviewerNotes}
                    minRows={3}
                    className="mt-4"
                 />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color={reviewAction === 'approve' ? 'success' : 'danger'}
                  onPress={handleReviewSubmit}
                  isLoading={isSubmitting}
                  startContent={!isSubmitting && (reviewAction === 'approve' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />)}
                >
                  {isSubmitting ? 'Processing...' : `Confirm ${reviewAction?.charAt(0).toUpperCase()}${reviewAction?.slice(1)}`}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
}
