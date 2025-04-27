import React, { useState, useEffect, useCallback } from 'react';
// Import the specific type from the controller
import { ClubController, ClubRegistrationDetails } from '@/controllers/clubController';
import { useAuth } from '@/contexts/AuthContext'; // Assuming AuthContext provides user info
import { EventRegistrationStatus } from '@/types/events'; // Only need status enum now
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
  SortDescriptor,
  Input,
} from "@heroui/react";
import { UsersIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

// Define columns for the registrations table
// Using student_reg_id from profiles table now
const registrationColumns = [
  { key: "event_title", label: "Event Title", sortable: true },
  { key: "student_name", label: "Student Name", sortable: true },
  { key: "student_reg_id", label: "Student ID", sortable: true }, // Changed key and made sortable
  { key: "registration_time", label: "Registered At", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "paid_at", label: "Paid At", sortable: true },
];

// Removed local AllRegistrationItem type definition, will use ClubRegistrationDetails from controller


const AllRegistrationsView: React.FC = () => {
  const { user } = useAuth();
  // Use the imported type for state
  const [registrations, setRegistrations] = useState<ClubRegistrationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'registration_time', direction: 'descending' });
  const [filterValue, setFilterValue] = useState("");

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch data using the controller function
      const fetchedRegistrations = await ClubController.getAllClubRegistrations(user.id);
      // Set state using the correct type
      setRegistrations(fetchedRegistrations);

    } catch (err) {
      console.error("Error fetching all registration data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load registration data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtering & Sorting ---
  const filteredItems = React.useMemo(() => {
    let filteredRegs = [...registrations];
    if (filterValue) {
      const lowerCaseFilter = filterValue.toLowerCase();
      filteredRegs = filteredRegs.filter((reg) => {
        const eventMatch = reg.events?.title?.toLowerCase().includes(lowerCaseFilter);
        const nameMatch = reg.profiles?.full_name?.toLowerCase().includes(lowerCaseFilter);
        const idMatch = reg.profiles?.student_id?.toLowerCase().includes(lowerCaseFilter); // Search in profiles.student_id
        return eventMatch || nameMatch || idMatch; // Search in event, name, or student reg ID
      });
    }
    return filteredRegs;
  }, [registrations, filterValue]);

  const sortedItems = React.useMemo(() => {
    // Use the imported type here
    return [...filteredItems].sort((a: ClubRegistrationDetails, b: ClubRegistrationDetails) => {
      // Adjust type for potential sort key including nested ones
      const column = sortDescriptor.column as keyof ClubRegistrationDetails | 'student_name' | 'event_title' | 'student_reg_id' | null;
      let first: any = null;
      let second: any = null;

      // Handle nested profile/event data for sorting
      if (column === 'student_name') {
        first = a.profiles?.full_name;
        second = b.profiles?.full_name;
      } else if (column === 'event_title') {
        first = a.events?.title;
        second = b.events?.title;
      } else if (column === 'student_reg_id') {
        first = a.profiles?.student_id; // Sort by student reg ID from profiles
        second = b.profiles?.student_id;
      } else if (column && column in a) { // Handle top-level keys
         // Ensure the key exists on the type before accessing
         if (Object.prototype.hasOwnProperty.call(a, column)) {
            first = getKeyValue(a, column as keyof ClubRegistrationDetails);
            second = getKeyValue(b, column as keyof ClubRegistrationDetails);
         }
      }

      const valA = first ?? '';
      const valB = second ?? '';
      let cmp = (valA < valB ? -1 : (valA > valB ? 1 : 0));

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
    attended: "secondary", // Assuming 'attended' status exists or might be added
  };

  // Use the imported type here
  const renderCell = useCallback((item: ClubRegistrationDetails, columnKey: React.Key) => {
    const keyAsString = columnKey as string;
    let cellValue: any;

    switch (keyAsString) {
      case "event_title":
        // Link to the specific event's registration page? Or just display title.
        // return <Link href={`/club/dashboard/events/registrations/${item.event_id}`}>{item.events?.title || 'N/A'}</Link>;
        return item.events?.title || 'N/A';
      case "student_name":
        return item.profiles?.full_name || 'N/A';
      case "student_reg_id": // Use the new key
        return <span className="font-mono text-xs text-default-500">{item.profiles?.student_id || 'N/A'}</span>; // Display student_id from profiles
      case "registration_time":
      case "paid_at":
        cellValue = getKeyValue(item, keyAsString);
        return formatDate(cellValue);
      case "status":
        cellValue = getKeyValue(item, keyAsString);
        return (
          <Chip color={statusColorMap[cellValue as EventRegistrationStatus]} size="sm" variant="flat">
            {cellValue}
          </Chip>
        );
      default:
        return getKeyValue(item, keyAsString);
    }
  }, []);

  // --- Render Logic ---
  return (
    <Card>
      <CardHeader className="flex items-center gap-3">
         <UsersIcon className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-semibold text-default-800">
          All Event Registrations
        </h1>
      </CardHeader>
      <CardBody>
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Spinner label="Loading registrations..." color="primary" />
          </div>
        )}
        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded relative" role="alert">
            <ExclamationCircleIcon className="w-5 h-5 inline mr-2" />
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        {!loading && !error && (
          <>
            <div className="mb-4">
              <Input
                isClearable
                className="w-full sm:max-w-[44%]"
                placeholder="Search by Event, Name, or Student ID..." // Placeholder remains the same
                value={filterValue}
                onClear={() => setFilterValue("")}
                onValueChange={setFilterValue}
              />
            </div>
            <Table
              aria-label="All event registrations for the club"
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

export default AllRegistrationsView;
