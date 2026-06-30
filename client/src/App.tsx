import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { PurchaseOrderDetail } from './pages/PurchaseOrderDetail';
import { Sales } from './pages/Sales';
import { Suppliers } from './pages/Suppliers';
import { LowStock } from './pages/LowStock';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/low-stock" element={<LowStock />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}
