import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Button,
  Spinner,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody
} from "@heroui/react";
import { SearchIcon, RefreshCwIcon, PlusCircleIcon } from 'lucide-react';

// Define the user profile type based on the database schema
interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'vendor' | 'admin';
  status: 'pending_approval' | 'active' | 'inactive' | 'rejected';
  phone_number: string | null; 
  student_id: string | null;
  student_reg_id: string | null;
  balance: number | null;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Refill balance modal state
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [refillAmount, setRefillAmount] = useState<number>(0);
  const [isRefilling, setIsRefilling] = useState(false);
  const [refillError, setRefillError] = useState<string | null>(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters when search query or role/status filter changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, roleFilter, statusFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
      console.log('Fetched users:', data); // Add this line
      setFilteredUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    
    // Apply search filter (case insensitive search on multiple fields)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        (user.email?.toLowerCase().includes(query)) || 
        (user.full_name?.toLowerCase().includes(query)) || 
        (user.student_id?.toLowerCase().includes(query)) ||
        (user.phone_number?.toLowerCase().includes(query))
      );
    }
    
    setFilteredUsers(filtered);
  };

  const handleOpenRefillModal = (user: UserProfile) => {
    setSelectedUser(user);
    setRefillAmount(0);
    setRefillError(null);
    setIsRefillModalOpen(true);
  };

  const handleRefill = async () => {
    if (!selectedUser || refillAmount <= 0) {
      setRefillError('Please enter a valid amount');
      return;
    }

    setIsRefilling(true);
    setRefillError(null);

    try {
      // Get current user balance
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', selectedUser.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentBalance = currentUser?.balance || 0;
      const newBalance = currentBalance + refillAmount;
      
      // Update the user's balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', selectedUser.id);
      
      if (updateError) throw updateError;
      
      // TODO: Record the transaction - transactions table does not exist
      // const { error: transactionError } = await supabase
      //   .from('transactions')
      //   .insert({
      //     user_id: selectedUser.id,
      //     amount: refillAmount,
      //     type: 'admin_balance_refill',
      //     description: 'Balance refill by administrator'
      //   });
      
      // if (transactionError) throw transactionError;
      
      // Update the user in the local state
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, balance: newBalance } 
          : user
      );
      
      setUsers(updatedUsers);
      applyFilters(); // Reapply filters to update filtered list
      
      // Close the modal
      setIsRefillModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Error refilling balance:', err);
      setRefillError(err.message || 'Failed to refill balance');
    } finally {
      setIsRefilling(false);
    }
  };


  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '৳0.00';
    return `৳${amount.toFixed(2)}`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'vendor': return 'warning';
      case 'student': return 'primary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'pending_approval': return 'primary';
      case 'rejected': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage all platform users</p>
        </div>
        <Button 
          color="primary"
          startContent={<RefreshCwIcon size={16} />}
          onClick={fetchUsers}
          isLoading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-md">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, ID..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                startContent={<SearchIcon className="h-4 w-4 text-gray-400" />}
                variant="bordered"
                fullWidth
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                label="Filter by role"
                value={roleFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                fullWidth
              >
                <SelectItem key="all">All Roles</SelectItem>
                <SelectItem key="student">Students</SelectItem>
                <SelectItem key="vendor">Vendors</SelectItem>
                <SelectItem key="admin">Administrators</SelectItem>
              </Select>
            </div>
            <div className="w-full md:w-64">
              <Select
                label="Filter by status"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                fullWidth
              >
                <SelectItem key="all">All Statuses</SelectItem>
                <SelectItem key="active">Active</SelectItem>
                <SelectItem key="inactive">Inactive</SelectItem>
                <SelectItem key="pending_approval">Pending Approval</SelectItem>
                <SelectItem key="rejected">Rejected</SelectItem>
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-hidden shadow-md rounded-lg">
        <Table aria-label="Users table" removeWrapper>
          <TableHeader>
            <TableColumn>NAME/EMAIL</TableColumn>
            <TableColumn>ROLE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ID</TableColumn>
            <TableColumn>BALANCE</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent="No users found"
            isLoading={loading}
            loadingContent={<Spinner label="Loading users..." />}
          >
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.full_name || 'No Name'}</span>
                    <span className="text-gray-500 text-sm">{user.email || 'No Email'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip color={getRoleColor(user.role)} size="sm">{user.role}</Chip>
                </TableCell>
                <TableCell>
                  <Chip color={getStatusColor(user.status)} size="sm">{user.status.replace('_', ' ')}</Chip>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {user.student_id || user.student_reg_id || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{formatCurrency(user.balance)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      color="success"
                      variant="flat"
                      startContent={<PlusCircleIcon size={14} />}
                      onClick={() => handleOpenRefillModal(user)}
                    >
                      Refill
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Refill balance modal */}
      <Modal isOpen={isRefillModalOpen} onClose={() => setIsRefillModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Refill User Balance</ModalHeader>
          <ModalBody>
            {selectedUser && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
                  <p className="text-sm">{selectedUser.email || 'No Email'}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="font-medium">{formatCurrency(selectedUser.balance)}</p>
                </div>

                <div>
                  <Input
                    type="number"
                    label="Refill Amount"
                    placeholder="Enter amount to add"
                    value={refillAmount.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefillAmount(Number(e.target.value))}
                    startContent={<span className="text-gray-500">৳</span>}
                    isInvalid={refillError !== null}
                    errorMessage={refillError}
                    min={0}
                    step={100}
                  />
                </div>

                {refillError && (
                  <div className="text-red-500 text-sm">{refillError}</div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              color="danger"
              onClick={() => setIsRefillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleRefill}
              isLoading={isRefilling}
            >
              Refill Balance
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AdminUsers;
