import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
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
      {/* Public marketing site — the landing page is the site root */}
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      {/* Internal inventory app, kept under its own paths (Dashboard at /dashboard) */}
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
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
