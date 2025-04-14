/**
 * Represents a single counter within a cafeteria vendor's operation.
 */
export interface Counter {
  id: string;          // Unique identifier for the counter
  vendorId: string;    // ID of the vendor this counter belongs to
  name: string;        // Display name of the counter (e.g., "Counter 1", "Drinks Station")
  location?: string;   // Optional description of the counter's location
  isActive: boolean;   // Whether the counter is currently operational
  // Add any other relevant fields, e.g., specific operating hours
}
