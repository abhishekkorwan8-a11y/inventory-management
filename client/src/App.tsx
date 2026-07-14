import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
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
    <Routes>
      {/* Standalone marketing landing page — rendered outside the app Layout */}
      <Route path="/landing" element={<Landing />} />
      <Route
        path="*"
        element={
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
        }
      />
    </Routes>
  );
}
