import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button, Input, Textarea, Card, CardBody, CardHeader, addToast, Checkbox, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Image, Tooltip } from '@heroui/react';
import { Pencil, Trash2, PlusCircle, Search } from 'lucide-react';

export interface MarketplaceProduct {
  id: string;
  storefront_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  images?: string[] | null; // Array of image URLs
  stock_quantity?: number | null;
  attributes?: Record<string, any> | null; // JSONB
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

const MarketplaceProductManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<MarketplaceProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure(); // For Add/Edit Modal

  // Form state for new/editing product
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState<string>('');
  const [productCategory, setProductCategory] = useState('');
  const [productImageFiles, setProductImageFiles] = useState<FileList | null>(null);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [productStock, setProductStock] = useState<string>('');
  const [productAttributes, setProductAttributes] = useState('');
  const [productIsAvailable, setProductIsAvailable] = useState(true);

  useEffect(() => {
    const fetchStorefrontAndProducts = async () => {
      if (!user || !profile || profile.role !== 'marketplace_operator') {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: sfData, error: sfError } = await supabase
          .from('storefronts')
          .select('id')
          .eq('operator_id', user.id)
          .single();

        if (sfError || !sfData) {
          addToast({ title: 'Error', description: 'Could not find your storefront. Please set up your storefront first.', color: 'danger' });
          console.error('fetchStorefrontAndProducts - Storefront fetch error:', sfError);
          throw sfError || new Error('Storefront not found');
        }
        console.log('fetchStorefrontAndProducts - Fetched storefrontId:', sfData.id);
        setStorefrontId(sfData.id);

        const { data: productData, error: productError } = await supabase
          .from('marketplace_products')
          .select('*')
          .eq('storefront_id', sfData.id)
          .order('created_at', { ascending: false });

        if (productError) {
            console.error('fetchStorefrontAndProducts - Product fetch error:', productError);
            throw productError;
        }
        setProducts(productData as MarketplaceProduct[] || []);

      } catch (err: any) {
        console.error('Error fetching data in useEffect:', err);
        addToast({ title: 'Fetch Error', description: err.message || 'Could not load products.', color: 'danger' });
      } finally {
        setLoading(false);
      }
    };
    fetchStorefrontAndProducts();
  }, [user, profile]);

  // Apply search filter when products or searchTerm changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(lowercasedSearch) || 
      (product.description && product.description.toLowerCase().includes(lowercasedSearch)) ||
      (product.category && product.category.toLowerCase().includes(lowercasedSearch))
    );
    
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const resetForm = () => {
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductCategory('');
    setProductImageFiles(null);
    setExistingImageUrls([]);
    setProductStock('');
    setProductAttributes('');
    setProductIsAvailable(true);
    setEditingProduct(null);
  };

  const handleEdit = (product: MarketplaceProduct) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description || '');
    setProductPrice(String(product.price));
    setProductCategory(product.category || '');
    setProductImageFiles(null);
    setExistingImageUrls(product.images || []);
    setProductStock(product.stock_quantity != null ? String(product.stock_quantity) : '');
    setProductAttributes(product.attributes ? JSON.stringify(product.attributes, null, 2) : '');
    setProductIsAvailable(product.is_available);
    onOpen();
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('marketplace_products').delete().eq('id', productId);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== productId));
      addToast({ title: 'Success', description: 'Product deleted.', color: 'success' });
    } catch (err: any) {
      addToast({ title: 'Error', description: `Failed to delete product: ${err.message}`, color: 'danger' });
    }
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProductImageFiles(e.target.files);
    }
  };

  const uploadProductImage = async (file: File, operatorId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${operatorId}/products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images') // Use new bucket name
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't upsert, each image is unique
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
    if (!publicUrlData.publicUrl) {
        throw new Error('Could not get public URL for uploaded product image.')
    }
    return publicUrlData.publicUrl;
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storefrontId || !user) {
      addToast({ title: 'Error', description: 'Storefront or user not identified. Cannot save product.', color: 'danger' });
      console.error('handleFormSubmit - storefrontId or user is missing');
      return;
    }
    setSaving(true);

    let uploadedImageUrls: string[] = [];
    if (productImageFiles && productImageFiles.length > 0) {
      console.log(`Uploading ${productImageFiles.length} new images...`);
      try {
        for (let i = 0; i < productImageFiles.length; i++) {
          const url = await uploadProductImage(productImageFiles[i], user.id);
          uploadedImageUrls.push(url);
        }
        console.log('New images uploaded:', uploadedImageUrls);
      } catch (uploadError: any) {
        addToast({ title: 'Image Upload Error', description: uploadError.message, color: 'danger' });
        console.error('handleFormSubmit - Image upload error:', uploadError);
        setSaving(false);
        return;
      }
    }

    let attributes_to_save: Record<string, any> | null = null;
    try {
      if (productAttributes.trim()) attributes_to_save = JSON.parse(productAttributes);
    } catch (jsonError: any) {
      addToast({ title: 'Error', description: 'Invalid JSON format for attributes.', color: 'danger' });
      console.error('handleFormSubmit - JSON parse error for attributes:', jsonError);
      setSaving(false);
      return;
    }

    const finalImageUrls = productImageFiles && productImageFiles.length > 0 
                            ? uploadedImageUrls 
                            : (editingProduct ? existingImageUrls : []);

    const productPayload: Omit<MarketplaceProduct, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      storefront_id: storefrontId,
      name: productName,
      description: productDescription.trim() || null,
      price: parseFloat(productPrice),
      category: productCategory.trim() || null,
      images: finalImageUrls.length > 0 ? finalImageUrls : null, // Save null if no images
      stock_quantity: productStock.trim() !== '' ? parseInt(productStock, 10) : null,
      attributes: attributes_to_save,
      is_available: productIsAvailable,
    };
    console.log('Product payload to be saved:', productPayload);

    try {
      if (editingProduct) {
        const { data, error } = await supabase
          .from('marketplace_products')
          .update({ ...productPayload, updated_at: new Date().toISOString() })
          .eq('id', editingProduct.id)
          .select()
          .single();
        if (error) throw error;
        setProducts(products.map(p => p.id === editingProduct.id ? { ...(data as MarketplaceProduct), images: finalImageUrls } : p));
        addToast({ title: 'Success', description: 'Product updated.', color: 'success' });
      } else {
        const { data, error } = await supabase
          .from('marketplace_products')
          .insert(productPayload)
          .select()
          .single();
        if (error) throw error;
        setProducts([{ ...(data as MarketplaceProduct), images: finalImageUrls }, ...products]);
        addToast({ title: 'Success', description: 'Product added.', color: 'success' });
      }
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('handleFormSubmit - Supabase save error:', err);
      addToast({ title: 'Save Error', description: `Failed to save product: ${err.message}`, color: 'danger' });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <p>Loading products...</p>; 
  if (!profile || profile.role !== 'marketplace_operator') return <p>Not authorized.</p>;
  if (!storefrontId && !loading) return <p>Storefront not found. Please ensure your storefront is set up.</p>;

  return (
    <div className="p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Manage Products</h1>
          <Button color="primary" onPress={() => { resetForm(); onOpen(); }} startContent={<PlusCircle className="h-5 w-5" />}>Add New Product</Button>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <div className="mb-6">
        <Input
          placeholder="Search products by name, description, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startContent={<Search className="text-gray-400" size={18} />}
          isClearable
          onClear={() => setSearchTerm('')}
        />
      </div>

      {/* Product List */}
      {loading && <p className="text-center py-10">Loading products...</p>}
      {!loading && !storefrontId && <p className="text-center py-10 text-red-600">Storefront not found. Please ensure your storefront is set up.</p>}
      {!loading && storefrontId && filteredProducts.length === 0 && (
        <div className="text-center py-10">
          {searchTerm ? (
            <p className="mb-2 text-lg">No products found matching "{searchTerm}".</p>
          ) : (
            <>
              <p className="mb-2 text-lg">No products found.</p>
              <Button color="secondary" onPress={() => { resetForm(); onOpen(); }} startContent={<PlusCircle className="h-5 w-5" />}>
                Add Your First Product
              </Button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <Card key={product.id} shadow="sm" className="hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                  removeWrapper
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-t-lg">
                  <span className="text-gray-500 dark:text-gray-400">No Image</span>
                </div>
              )}
            </CardHeader>
            <CardBody className="p-4 space-y-2">
              <h2 className="font-semibold text-lg truncate" title={product.name}>{product.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 h-10 overflow-hidden text-ellipsis" title={product.description || ''}>{product.description || 'No description'}</p>
              <div className="flex justify-between items-center pt-1">
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">${product.price.toFixed(2)}</p>
                <p className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.is_available ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                  {product.is_available ? 'Available' : 'Unavailable'}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stock: {product.stock_quantity ?? 'N/A'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Category: {product.category || 'Uncategorized'}</p>
            </CardBody>
            <div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
              <Tooltip content="Edit Product">
                <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(product)}>
                  <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </Button>
              </Tooltip>
              <Tooltip content="Delete Product" color="danger">
                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Product Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" placement="center">
        <ModalContent>
            <ModalHeader className="border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            </ModalHeader>
            <ModalBody className="p-6">
              <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" id="marketplace-product-form">
                  {/* Column 1 */}
                  <div className="md:col-span-1 space-y-4">
                    <Input label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="e.g. Handmade Leather Wallet" />
                    <Textarea label="Description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Detailed description of your product..." rows={4}/>
                    <Input label="Price" type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} required step="0.01" min="0" placeholder="0.00" startContent="$" />
                    <Input label="Category" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} placeholder="e.g. Accessories, Apparel" />
                    <Input label="Stock Quantity" type="number" value={productStock} onChange={(e) => setProductStock(e.target.value)} step="1" min="0" placeholder="0" />
                    <Checkbox isSelected={productIsAvailable} onValueChange={setProductIsAvailable} className="mt-2">
                      Product is available for purchase
                    </Checkbox>
                  </div>

                  {/* Column 2 */}
                  <div className="md:col-span-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Images</label>
                      {editingProduct && existingImageUrls.length > 0 && (
                        <div className="mb-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Current images (uploading new files will replace these):</p>
                          <div className="flex flex-wrap gap-2">
                            {existingImageUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <Image src={url} alt={`Current image ${index + 1}`} width={80} height={80} className="object-cover rounded shadow-sm" />
                                {/* Optional: Add a remove button per image here if needed */}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageFileChange}
                        labelPlacement="outside"
                        placeholder="Select new images"
                        description={productImageFiles && productImageFiles.length > 0 ? `Selected ${productImageFiles.length} new file(s).` : "Upload one or more images."}
                      />
                    </div>
                    <Textarea 
                      label="Attributes (JSON format)" 
                      value={productAttributes} 
                      onChange={(e) => setProductAttributes(e.target.value)} 
                      rows={4} 
                      placeholder={'e.g.,\n{\n  "color": "Red",\n  "size": "M",\n  "material": "Leather"\n}'} 
                      description="Optional: Provide structured data about the product."
                    />
                  </div>
              </form>
            </ModalBody>
            <ModalFooter className="border-t border-gray-200 dark:border-gray-700">
                <Button variant="light" onPress={() => { resetForm(); onClose(); }}>Cancel</Button>
                <Button color="primary" isLoading={saving} type="submit" form="marketplace-product-form" startContent={editingProduct ? undefined : <PlusCircle className="h-5 w-5" />}>
                  {saving ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Add Product')}
                </Button>
            </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default MarketplaceProductManagement;
