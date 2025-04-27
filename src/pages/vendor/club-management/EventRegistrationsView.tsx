import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClubController } from '@/controllers/clubController'; // Assuming controller exists
import { EventData, EventRegistrationData, EventRegistrationStatus } from '@/types/events';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Chip,
  Table, // Assuming a Table component exists in @heroui/react
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue, // Helper for Table
  SortDescriptor, // For sorting
  Input // For filtering
} from "@heroui/react";
import { ArrowLeftIcon, ExclamationCircleIcon, UserCircleIcon } from '@heroicons/react/24/outline';

// Define columns for the registrations table
const registrationColumns = [
  { key: "student_name", label: "Student Name", sortable: true }, // Added Student Name
  { key: "student_id", label: "Student ID" },
  { key: "registration_time", label: "Registered At", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "paid_at", label: "Paid At", sortable: true },
  { key: "expires_at", label: "Reservation Expires", sortable: true },
  // Add more columns as needed (e.g., payment_intent_id)
];

const EventRegistrationsView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'registration_time', direction: 'descending' });
  const [filterValue, setFilterValue] = useState("");

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!eventId) {
      setError("Event ID not found in URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch event details and registrations concurrently
      const [eventDetails, fetchedRegistrations] = await Promise.all([
        ClubController.getEventById(eventId), // Fetch specific event details
        ClubController.getEventRegistrations(eventId) // Use the dedicated controller function
      ]);

      if (!eventDetails) {
        throw new Error("Event not found.");
      }
      setEvent(eventDetails);
      setRegistrations(fetchedRegistrations); // Directly set the fetched registrations

    } catch (err) {
      console.error("Error fetching event/registration data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load registration data.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtering & Sorting ---
  // --- Filtering & Sorting ---
  // Type assertion for items coming from the controller
  type RegistrationWithProfile = EventRegistrationData & { profiles: { id: string; full_name: string | null; email: string | null } | null };

  const filteredItems = React.useMemo(() => {
    let filteredRegistrations = [...registrations] as RegistrationWithProfile[]; // Assert type here
    if (filterValue) {
      const lowerCaseFilter = filterValue.toLowerCase();
      filteredRegistrations = filteredRegistrations.filter((reg) => {
        const nameMatch = reg.profiles?.full_name?.toLowerCase().includes(lowerCaseFilter);
        const idMatch = reg.student_id.toLowerCase().includes(lowerCaseFilter);
        // Add email match if desired: const emailMatch = reg.profiles?.email?.toLowerCase().includes(lowerCaseFilter);
        return nameMatch || idMatch; // Search in name or ID
      });
    }
    return filteredRegistrations;
  }, [registrations, filterValue]);

  const sortedItems = React.useMemo(() => {
    // Use the correctly typed filteredItems
    return [...filteredItems].sort((a: RegistrationWithProfile, b: RegistrationWithProfile) => {
      const column = sortDescriptor.column as keyof RegistrationWithProfile | 'student_name' | null; // Adjust type for potential sort key
      let first: any = null;
      let second: any = null;

      // Handle nested profile data for sorting
      if (column === 'student_name') {
        first = a.profiles?.full_name;
        second = b.profiles?.full_name;
      } else if (column) {
         // Use getKeyValue for top-level properties, ensure column is a valid key
         if (column in a) { // Check if column is a direct key
            first = getKeyValue(a, column as keyof RegistrationWithProfile);
            second = getKeyValue(b, column as keyof RegistrationWithProfile);
         }
      }


      // Basic comparison, handle nulls/undefined safely
      const valA = first ?? '';
      const valB = second ?? '';

      let cmp = 0;
      if (valA < valB) cmp = -1;
      else if (valA > valB) cmp = 1;

      // Attempt numeric comparison for potential date strings or numbers
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
         cmp = numA < numB ? -1 : (numA > numB ? 1 : 0);
      }


      if (sortDescriptor.direction === "descending") {
        cmp *= -1;
      }
      return cmp;
    });
  }, [sortDescriptor, filteredItems]);

  // --- Rendering Helpers ---
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return 'Invalid Date';
    }
  };

  const statusColorMap: Record<EventRegistrationStatus, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
    reserved: "warning",
    paid: "success",
    cancelled: "danger",
    attended: "secondary",
  };

  const renderCell = useCallback((item: RegistrationWithProfile, columnKey: React.Key) => {
    // Explicitly cast columnKey to string to satisfy getKeyValue's expected type
    const keyAsString = columnKey as string;
    // Access nested profile data directly when needed
    const cellValue = keyAsString === 'student_name'
      ? item.profiles?.full_name
      : getKeyValue(item, keyAsString);

    switch (keyAsString) { // Use the casted key for the switch
      case "student_name":
        return (
          <div className="flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-default-500" />
            <span className="font-medium text-default-700">{cellValue || 'N/A'}</span>
          </div>
        );
      case "student_id":
        return <span className="font-mono text-xs text-default-500">{item.student_id}</span>; // Display raw ID
      case "registration_time":
      case "paid_at":
      case "expires_at":
        return formatDate(cellValue);
      case "status":
        return (
          <Chip color={statusColorMap[cellValue as EventRegistrationStatus]} size="sm" variant="flat">
            {cellValue}
          </Chip>
        );
      default:
        return cellValue;
    }
  }, []);

  // --- Render Logic ---
  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
        <Button isIconOnly variant="light" onPress={() => navigate('/club/dashboard/events')} aria-label="Back to Events">
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-default-800">
            Event Registrations
          </h1>
          {event && <p className="text-sm text-default-600">{event.title}</p>}
          {!event && !loading && <p className="text-sm text-danger-600">Event details not found.</p>}
        </div>
      </CardHeader>
      <CardBody>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading registrations..." color="secondary" />
          </div>
        )}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" />
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && event && (
          <>
            <div className="mb-4">
              <Input
                isClearable
                className="w-full sm:max-w-[44%]"
                placeholder="Search by Name or Student ID..." // Updated placeholder
                // startContent={<SearchIcon />} // Assuming SearchIcon exists
                value={filterValue}
                onClear={() => setFilterValue("")}
                onValueChange={setFilterValue}
              />
            </div>
            <Table
              aria-label={`Registrations for event ${event?.title}`}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
            >
              <TableHeader columns={registrationColumns}>
                {(column) => (
                  <TableColumn key={column.key} allowsSorting={column.sortable}>
                    {column.label}
                  </TableColumn>
                )}
              </TableHeader>
              <TableBody items={sortedItems} emptyContent={"No registrations found."}>
                {(item) => (
                  <TableRow key={item.id}>
                    {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default EventRegistrationsView;
