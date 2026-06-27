import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCall } from './api';
import Aurora from './components/Aurora';
import SpotlightCard from './components/SpotlightCard';
import TiltedCard from './components/TiltedCard';
import ShinyText from './components/ShinyText';
import CountUp from './components/CountUp';
import RippleButton from './components/RippleButton';
import Toast from './components/Toast';
import AnimatedButton from './components/ui/animated-button';
import { SmoothInput } from './components/ui/skiper-ui/skiper106';
import ElasticStack from './components/ui/elastic-stack';
import LiquidMetalButton from './components/ui/liquid-metal';
import FaultyTerminal from './components/ui/FaultyTerminal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tab-dashboard');
  const [toasts, setToasts] = useState([]);
  
  // Data lists
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    ventas: 0,
    clientes: 0,
    productos: 0,
    pedidos: 0,
    top_productos: []
  });

  // Search queries
  const [searchClientes, setSearchClientes] = useState('');
  const [searchProductos, setSearchProductos] = useState('');
  const [searchPedidos, setSearchPedidos] = useState('');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Modal display states
  const [showModalCliente, setShowModalCliente] = useState(false);
  const [showModalProducto, setShowModalProducto] = useState(false);
  const [showModalPedido, setShowModalPedido] = useState(false);
  const [showModalPedidoStatus, setShowModalPedidoStatus] = useState(false);
  const [showModalPedidoDetails, setShowModalPedidoDetails] = useState(false);
  const [showModalDelete, setShowModalDelete] = useState(false);

  // Form edit states
  const [modalClienteTitle, setModalClienteTitle] = useState('Registrar Nuevo Cliente');
  const [clientFormAction, setClientFormAction] = useState('add'); // 'add' or 'edit'
  const [clientFormId, setClientFormId] = useState('');
  const [clientFormData, setClientFormData] = useState({
    rut: '', nombre: '', email: '', telefono: '',
    calle: '', numero: '', comuna: '', ciudad: ''
  });

  const [modalProductoTitle, setModalProductoTitle] = useState('Registrar Nuevo Producto');
  const [productFormAction, setProductFormAction] = useState('add');
  const [productFormId, setProductFormId] = useState('');
  const [productFormData, setProductFormData] = useState({
    sku: '', nombre: '', descripcion: '', categoria: '', precio: '', stock: ''
  });

  // Order creation state
  const [orderFormData, setOrderFormData] = useState({
    numero: '',
    cliente_rut: ''
  });
  const [draftOrderItems, setDraftOrderItems] = useState([]);
  const [orderAddItemSku, setOrderAddItemSku] = useState('');
  const [orderAddItemQty, setOrderAddItemQty] = useState(1);

  // Status update state
  const [statusUpdatePedidoNum, setStatusUpdatePedidoNum] = useState('');
  const [statusUpdateSelect, setStatusUpdateSelect] = useState('pendiente');

  // Deletion confirm state
  const [deleteItemId, setDeleteItemId] = useState('');
  const [deleteItemType, setDeleteItemType] = useState(''); // 'cliente', 'producto', 'pedido'

  // Detailed order view
  const [detailedOrder, setDetailedOrder] = useState(null);

  // 2. Toast Trigger Helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 3. Load Session On Mount
  useEffect(() => {
    const cachedUser = sessionStorage.getItem('ct_user');
    if (cachedUser) {
      setCurrentUser(JSON.parse(cachedUser));
    }
  }, []);

  // 4. Trigger Data Loading when Active Tab Changes or User Logs In
  useEffect(() => {
    if (!currentUser) return;
    
    if (activeTab === 'tab-dashboard') {
      loadDashboardStats();
    } else if (activeTab === 'tab-clientes') {
      loadClientes();
    } else if (activeTab === 'tab-productos') {
      loadProductos();
    } else if (activeTab === 'tab-pedidos') {
      loadPedidos();
    }
  }, [currentUser, activeTab]);

  // 5. API Fetchers
  const loadDashboardStats = async () => {
    try {
      const res = await apiCall('/api/dashboard/stats', 'GET', null, currentUser);
      if (res.success) {
        setDashboardStats(res.stats);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const loadClientes = async () => {
    try {
      const data = await apiCall('/api/clientes', 'GET', null, currentUser);
      setClientes(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const loadProductos = async () => {
    try {
      const data = await apiCall('/api/productos', 'GET', null, currentUser);
      setProductos(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const loadPedidos = async () => {
    try {
      const data = await apiCall('/api/pedidos', 'GET', null, currentUser);
      setPedidos(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 6. Auth Flow Actions
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;

    setIsLoggingIn(true);
    try {
      const res = await apiCall('/api/auth/login', 'POST', {
        username: loginUsername,
        password: loginPassword
      });
      if (res.success) {
        setCurrentUser(res.user);
        sessionStorage.setItem('ct_user', JSON.stringify(res.user));
        setActiveTab('tab-dashboard');
        addToast(`¡Bienvenido, ${res.user.nombre}!`, 'success');
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await apiCall('/api/auth/logout', 'POST', null, currentUser);
    } catch (e) {}
    setCurrentUser(null);
    sessionStorage.removeItem('ct_user');
    setLoginUsername('');
    setLoginPassword('');
    addToast('Sesión cerrada correctamente.', 'info');
  };

  // 7. Cliente Form Actions
  const handleOpenAddCliente = () => {
    setModalClienteTitle('Registrar Nuevo Cliente');
    setClientFormAction('add');
    setClientFormId('');
    setClientFormData({
      rut: '', nombre: '', email: '', telefono: '',
      calle: '', numero: '', comuna: '', ciudad: ''
    });
    setShowModalCliente(true);
  };

  const handleOpenEditCliente = (cli) => {
    setModalClienteTitle('Editar Cliente');
    setClientFormAction('edit');
    setClientFormId(cli.rut);
    setClientFormData({
      rut: cli.rut,
      nombre: cli.nombre,
      email: cli.email,
      telefono: cli.telefono,
      calle: cli.direccion.calle,
      numero: cli.direccion.numero,
      comuna: cli.direccion.comuna,
      ciudad: cli.direccion.ciudad
    });
    setShowModalCliente(true);
  };

  const handleClienteFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      rut: clientFormData.rut,
      nombre: clientFormData.nombre,
      email: clientFormData.email,
      telefono: clientFormData.telefono,
      direccion: {
        calle: clientFormData.calle,
        numero: clientFormData.numero,
        comuna: clientFormData.comuna,
        ciudad: clientFormData.ciudad
      }
    };
    try {
      if (clientFormAction === 'add') {
        await apiCall('/api/clientes', 'POST', payload, currentUser);
        addToast('Cliente creado exitosamente.', 'success');
      } else {
        await apiCall(`/api/clientes/${clientFormId}`, 'PUT', payload, currentUser);
        addToast('Cliente actualizado exitosamente.', 'success');
      }
      setShowModalCliente(false);
      loadClientes();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 8. Producto Form Actions
  const handleOpenAddProducto = () => {
    if (currentUser.rol !== 'admin') {
      addToast('Acceso Denegado. Solo administradores pueden agregar productos.', 'error');
      return;
    }
    setModalProductoTitle('Registrar Nuevo Producto');
    setProductFormAction('add');
    setProductFormId('');
    setProductFormData({
      sku: '', nombre: '', descripcion: '', categoria: '', precio: '', stock: ''
    });
    setShowModalProducto(true);
  };

  const handleOpenEditProducto = (prod) => {
    setModalProductoTitle('Editar Producto');
    setProductFormAction('edit');
    setProductFormId(prod.sku);
    setProductFormData({
      sku: prod.sku,
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      categoria: prod.categoria,
      precio: prod.precio,
      stock: prod.stock
    });
    setShowModalProducto(true);
  };

  const handleProductoFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      sku: productFormData.sku,
      nombre: productFormData.nombre,
      descripcion: productFormData.descripcion,
      categoria: productFormData.categoria,
      precio: parseFloat(productFormData.precio),
      stock: parseInt(productFormData.stock)
    };
    try {
      if (productFormAction === 'add') {
        await apiCall('/api/productos', 'POST', payload, currentUser);
        addToast('Producto agregado al catálogo.', 'success');
      } else {
        await apiCall(`/api/productos/${productFormId}`, 'PUT', payload, currentUser);
        addToast('Producto actualizado correctamente.', 'success');
      }
      setShowModalProducto(false);
      loadProductos();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 9. Pedido Form Actions
  const handleOpenAddPedido = async () => {
    setDraftOrderItems([]);
    
    // Auto increment ped ID or set a clean demo ID
    const count = pedidos.length + 1;
    setOrderFormData({
      numero: `PED-100${count}`,
      cliente_rut: ''
    });

    setOrderAddItemSku('');
    setOrderAddItemQty(1);

    // Make sure we have local catalogs
    if (clientes.length === 0) await loadClientes();
    if (productos.length === 0) await loadProductos();

    setShowModalPedido(true);
  };

  const handleAddItemToDraft = () => {
    if (!orderAddItemSku) {
      addToast('Debe seleccionar un producto.', 'error');
      return;
    }
    const qty = parseInt(orderAddItemQty);
    if (isNaN(qty) || qty <= 0) {
      addToast('Cantidad inválida.', 'error');
      return;
    }

    const prod = productos.find((p) => p.sku === orderAddItemSku);
    if (!prod) return;

    if (prod.stock < qty) {
      addToast(`Stock insuficiente. Solo quedan ${prod.stock} unidades en catálogo.`, 'error');
      return;
    }

    const existingIndex = draftOrderItems.findIndex((item) => item.sku === orderAddItemSku);
    if (existingIndex > -1) {
      const existing = draftOrderItems[existingIndex];
      if (prod.stock < (existing.cantidad + qty)) {
        addToast(`No es posible agregar más unidades de ${prod.nombre}. Límite de stock excedido.`, 'error');
        return;
      }
      const updated = [...draftOrderItems];
      updated[existingIndex] = {
        ...existing,
        cantidad: existing.cantidad + qty,
        subtotal: (existing.cantidad + qty) * existing.precio_unitario
      };
      setDraftOrderItems(updated);
    } else {
      setDraftOrderItems([
        ...draftOrderItems,
        {
          sku: prod.sku,
          nombre_producto: prod.nombre,
          cantidad: qty,
          precio_unitario: prod.precio,
          subtotal: qty * prod.precio
        }
      ]);
    }
    addToast(`${prod.nombre} añadido al pedido.`, 'success');
  };

  const handleRemoveDraftItem = (sku) => {
    setDraftOrderItems(draftOrderItems.filter((i) => i.sku !== sku));
  };

  const handlePedidoFormSubmit = async (e) => {
    e.preventDefault();
    if (!orderFormData.cliente_rut || !orderFormData.numero) return;

    if (draftOrderItems.length === 0) {
      addToast('Debe agregar al menos un ítem al pedido.', 'error');
      return;
    }

    const cli = clientes.find((c) => c.rut === orderFormData.cliente_rut);
    const total = draftOrderItems.reduce((acc, curr) => acc + curr.subtotal, 0);

    const payload = {
      numero_pedido: orderFormData.numero,
      cliente_rut: orderFormData.cliente_rut,
      estado: 'pendiente',
      items: draftOrderItems,
      total: total,
      direccion_envio: {
        calle: cli.direccion.calle,
        numero: cli.direccion.numero,
        comuna: cli.direccion.comuna,
        ciudad: cli.direccion.ciudad
      }
    };

    try {
      await apiCall('/api/pedidos', 'POST', payload, currentUser);
      addToast('Pedido registrado con éxito.', 'success');
      setShowModalPedido(false);
      loadPedidos();
      loadProductos(); // Reload stock
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 10. View Detailed Order
  const handleViewPedidoDetails = async (numero) => {
    try {
      const ped = await apiCall(`/api/pedidos/${numero}`, 'GET', null, currentUser);
      setDetailedOrder(ped);
      setShowModalPedidoDetails(true);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 11. Update Order Status Form
  const handleOpenEditPedidoStatus = (numero, currentStatus) => {
    setStatusUpdatePedidoNum(numero);
    setStatusUpdateSelect(currentStatus);
    setShowModalPedidoStatus(true);
  };

  const handlePedidoStatusFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiCall(`/api/pedidos/${statusUpdatePedidoNum}`, 'PUT', {
        estado: statusUpdateSelect
      }, currentUser);
      addToast('Estado del pedido actualizado.', 'success');
      setShowModalPedidoStatus(false);
      loadPedidos();
      loadProductos(); // Reload stock
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 12. Deletion Confirm Actions
  const handleOpenConfirmDelete = (id, type) => {
    setDeleteItemId(id);
    setDeleteItemType(type);
    setShowModalDelete(true);
  };

  const handleConfirmDeleteClick = async () => {
    if (!deleteItemId || !deleteItemType) return;
    try {
      if (deleteItemType === 'cliente') {
        await apiCall(`/api/clientes/${deleteItemId}`, 'DELETE', null, currentUser);
        addToast('Cliente eliminado permanentemente.', 'success');
        loadClientes();
      } else if (deleteItemType === 'producto') {
        await apiCall(`/api/productos/${deleteItemId}`, 'DELETE', null, currentUser);
        addToast('Producto removido del catálogo.', 'success');
        loadProductos();
      } else if (deleteItemType === 'pedido') {
        await apiCall(`/api/pedidos/${deleteItemId}`, 'DELETE', null, currentUser);
        addToast('Pedido eliminado del historial.', 'success');
        loadPedidos();
        loadProductos(); // Reload stock
      }
      setShowModalDelete(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // 13. Dropdowns Address autofill preview helper
  const selectedClientAddressPreview = () => {
    if (!orderFormData.cliente_rut) return 'No se ha seleccionado ningún cliente.';
    const cli = clientes.find((c) => c.rut === orderFormData.cliente_rut);
    if (!cli) return 'Cargando datos del cliente...';
    const dir = cli.direccion;
    return `${dir.calle} N°${dir.numero}, ${dir.comuna}, ${dir.ciudad}`;
  };

  // 14. Filters lists based on search string
  const getFilteredClientes = () => {
    const q = searchClientes.toLowerCase();
    return clientes.filter(c =>
      c.rut.toLowerCase().includes(q) ||
      c.nombre.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  };

  const getFilteredProductos = () => {
    const q = searchProductos.toLowerCase();
    return productos.filter(p =>
      p.sku.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q)
    );
  };

  const getFilteredPedidos = () => {
    const q = searchPedidos.toLowerCase();
    return pedidos.filter(p =>
      p.numero_pedido.toLowerCase().includes(q) ||
      p.cliente_rut.toLowerCase().includes(q) ||
      p.estado.toLowerCase().includes(q)
    );
  };

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  // Render Login Layout if no user authenticated
  if (!currentUser) {
    return (
      <>
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <FaultyTerminal 
            tint="#00684a" 
            brightness={1.0}
            curvature={0.15}
            scanlineIntensity={0.25}
            flickerAmount={0.4}
            glitchAmount={0.3}
            noiseAmp={0.05}
            chromaticAberration={2.0}
            mouseReact={true}
            mouseStrength={0.15}
          />
        </div>
        
        {/* Toasts overlay */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>

        <div className="login-wrapper">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="login-card glassmorphism"
          >
            <div className="login-header">
              <div className="logo-icon">
                <i className="fa-solid fa-cubes-stacked"></i>
              </div>
              <ShinyText text="ComercioTech" style={{ fontSize: '28px', fontWeight: 'bold' }} />
              <p>Plataforma de Base de Datos No Estructuradas</p>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="login-username"><i className="fa-regular fa-user"></i> Usuario</label>
                <SmoothInput
                  type="text"
                  id="login-username"
                  placeholder="Ingrese su usuario (ej: admin, vendedor)"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password"><i className="fa-solid fa-lock"></i> Contraseña</label>
                <div className="password-input-wrapper">
                  <SmoothInput
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    placeholder="Ingrese su contraseña"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-toggle-pwd"
                    style={{ zIndex: 20 }}
                  >
                    <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                  </button>
                </div>
              </div>
              
              <LiquidMetalButton
                type="submit"
                className="w-full flex justify-center mt-6"
                disabled={isLoggingIn}
                metalConfig={{
                  colorBack: "#00684a",
                  colorTint: "#00ed64",
                  speed: 0.5,
                  repetition: 4,
                  distortion: 0.15
                }}
              >
                {isLoggingIn ? "Verificando..." : "Iniciar Sesión"}
              </LiquidMetalButton>
            </form>
            
            <div className="login-footer">
              <p>Evaluación Sumativa 4 • Harold Concha – Keoni Vergara</p>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <FaultyTerminal 
            tint="#00684a" 
            brightness={1.0}
            curvature={0.15}
            scanlineIntensity={0.25}
            flickerAmount={0.4}
            glitchAmount={0.3}
            noiseAmp={0.05}
            chromaticAberration={2.0}
            mouseReact={true}
            mouseStrength={0.15}
          />
        </div>

      {/* Toasts overlay */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="app-layout">
        {/* SIDEBAR NAVIGATION */}
        <aside className="sidebar glassmorphism">
          <div className="sidebar-brand">
            <i className="fa-solid fa-cubes-stacked logo-accent"></i>
            <ShinyText text="ComercioTech" style={{ fontWeight: 'bold' }} />
          </div>
          
          <div className="user-profile-widget">
            <div className="user-avatar">
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <div className="user-info">
              <h3>{currentUser.nombre}</h3>
              <span className={`role-badge ${currentUser.rol === 'admin' ? 'role-admin' : 'role-vendedor'}`}>
                {currentUser.rol}
              </span>
            </div>
          </div>
          
          <nav className="sidebar-nav">
            <motion.ul variants={containerVariants} initial="hidden" animate="show">
              <motion.li variants={itemVariants}>
                <button
                  className={`nav-btn ${activeTab === 'tab-dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab-dashboard')}
                >
                  <i className="fa-solid fa-chart-pie"></i> Inicio
                </button>
              </motion.li>
              <motion.li variants={itemVariants}>
                <button
                  className={`nav-btn ${activeTab === 'tab-clientes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab-clientes')}
                >
                  <i className="fa-solid fa-users"></i> Clientes
                </button>
              </motion.li>
              <motion.li variants={itemVariants}>
                <button
                  className={`nav-btn ${activeTab === 'tab-productos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab-productos')}
                >
                  <i className="fa-solid fa-box-open"></i> Productos
                </button>
              </motion.li>
              <motion.li variants={itemVariants}>
                <button
                  className={`nav-btn ${activeTab === 'tab-pedidos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tab-pedidos')}
                >
                  <i className="fa-solid fa-receipt"></i> Pedidos
                </button>
              </motion.li>
            </motion.ul>
          </nav>
          
          <div className="sidebar-footer">
            <RippleButton onClick={handleLogoutClick} className="btn-danger btn-logout btn-block">
              <i className="fa-solid fa-power-off"></i> Cerrar Sesión
            </RippleButton>
          </div>
        </aside>

        {/* MAIN CONTAINER */}
        <main className="main-content">
          {/* CONTENT HEADER */}
          <header className="content-header glassmorphism">
            <div className="header-title">
              <h2>
                {activeTab === 'tab-dashboard' && 'Inicio'}
                {activeTab === 'tab-clientes' && 'Gestión de Clientes'}
                {activeTab === 'tab-productos' && 'Catálogo de Productos'}
                {activeTab === 'tab-pedidos' && 'Gestión de Pedidos'}
              </h2>
              <p>
                {activeTab === 'tab-dashboard' && 'Resumen ejecutivo y analíticas comerciales de la base de datos.'}
                {activeTab === 'tab-clientes' && 'Registro, consulta y administración de perfiles de clientes ComercioTech.'}
                {activeTab === 'tab-productos' && 'Inventario, precios, categorización y atributos variables de productos.'}
                {activeTab === 'tab-pedidos' && 'Órdenes de compra, ciclo de vida del pedido e historial de transacciones.'}
              </p>
            </div>
            <div className="header-actions">
              <span className="db-status-badge">
                <span className="status-indicator online"></span> MongoDB Online
              </span>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {/* TAB CONTENT: DASHBOARD */}
            {activeTab === 'tab-dashboard' && (
              <motion.section
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="tab-pane active"
              >
                {/* METRICS GRID */}
                <div className="metrics-grid">
                  <SpotlightCard className="border-glow-purple" spotlightColor="rgba(157, 78, 221, 0.2)">
                    <div className="metric-card-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div className="metric-content">
                        <span className="metric-label">Ventas Totales</span>
                        <h2 className="metric-value">
                          <CountUp to={dashboardStats.ventas} prefix="$" />
                        </h2>
                      </div>
                      <div className="metric-icon bg-purple">
                        <i className="fa-solid fa-wallet"></i>
                      </div>
                    </div>
                  </SpotlightCard>
                  
                  <SpotlightCard className="border-glow-blue" spotlightColor="rgba(58, 134, 240, 0.2)">
                    <div className="metric-card-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div className="metric-content">
                        <span className="metric-label">Clientes Registrados</span>
                        <h2 className="metric-value">
                          <CountUp to={dashboardStats.clientes} />
                        </h2>
                      </div>
                      <div className="metric-icon bg-blue">
                        <i className="fa-solid fa-users"></i>
                      </div>
                    </div>
                  </SpotlightCard>
                  
                  <SpotlightCard className="border-glow-cyan" spotlightColor="rgba(6, 214, 160, 0.2)">
                    <div className="metric-card-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div className="metric-content">
                        <span className="metric-label">Productos Activos</span>
                        <h2 className="metric-value">
                          <CountUp to={dashboardStats.productos} />
                        </h2>
                      </div>
                      <div className="metric-icon bg-cyan">
                        <i className="fa-solid fa-box-open"></i>
                      </div>
                    </div>
                  </SpotlightCard>

                  <SpotlightCard className="border-glow-green" spotlightColor="rgba(46, 196, 182, 0.2)">
                    <div className="metric-card-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div className="metric-content">
                        <span className="metric-label">Pedidos Emitidos</span>
                        <h2 className="metric-value">
                          <CountUp to={dashboardStats.pedidos} />
                        </h2>
                      </div>
                      <div className="metric-icon bg-green">
                        <i className="fa-solid fa-receipt"></i>
                      </div>
                    </div>
                  </SpotlightCard>
                </div>

                {/* DETAILS GRID */}
                <div className="dashboard-details-grid">
                  <TiltedCard maxRotation={5} scale={1.01} className="details-card glassmorphism">
                    <div className="card-header">
                      <h3><i className="fa-solid fa-star text-accent-yellow"></i> Productos Más Vendidos</h3>
                      <p>Top 5 productos ordenados por cantidad vendida.</p>
                    </div>
                    <div className="card-body">
                      {dashboardStats.top_productos.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '16px' }}>
                          <span className="text-sm text-muted">Vista rápida (Productos Top):</span>
                          <ElasticStack 
                            items={dashboardStats.top_productos.slice(0, 5).map(p => ({ id: p._id, name: p.nombre }))} 
                            itemSize={44} 
                            overlap={16} 
                            pushForce={10}
                            className="py-0"
                          />
                        </div>
                      )}
                      <div className="table-container">
                        <table className="sleek-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Producto</th>
                              <th className="text-right">Cantidad</th>
                              <th className="text-right">Total Recaudado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dashboardStats.top_productos.length === 0 ? (
                              <tr>
                                <td colSpan="4" className="text-center text-muted">Aún no hay transacciones para calcular estadísticas.</td>
                              </tr>
                            ) : (
                              dashboardStats.top_productos.map((prod) => (
                                <tr key={prod._id}>
                                  <td><span className="font-semibold text-muted">{prod._id}</span></td>
                                  <td>{prod.nombre}</td>
                                  <td className="text-right font-semibold">{prod.cantidad}</td>
                                  <td className="text-right font-semibold text-accent-cyan">${prod.total.toLocaleString('es-CL')}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TiltedCard>

                  <TiltedCard maxRotation={5} scale={1.01} className="details-card glassmorphism">
                    <div className="card-header">
                      <h3><i className="fa-solid fa-server text-accent-blue"></i> Configuración del Entorno</h3>
                      <p>Especificaciones técnicas del despliegue en AWS.</p>
                    </div>
                    <div className="card-body env-info-list">
                      <div className="env-info-item">
                        <span className="env-label">DBMS</span>
                        <span className="env-value">MongoDB Community Server</span>
                      </div>
                      <div className="env-info-item">
                        <span className="env-label">Librería Conexión</span>
                        <span className="env-value">PyMongo 4.6+ / React UI</span>
                      </div>
                      <div className="env-info-item">
                        <span className="env-label">Servidor Cloud</span>
                        <span className="env-value">AWS EC2 (Ubuntu 24.04 LTS)</span>
                      </div>
                      <div className="env-info-item">
                        <span className="env-label">Seguridad de Acceso</span>
                        <span className="env-value">RBAC Integrado en Capa API</span>
                      </div>
                      <div className="env-info-item">
                        <span className="env-label">Seguridad de Datos</span>
                        <span className="env-value">Cifrado TLS (Tránsito) + AES (Reposo)</span>
                      </div>
                    </div>
                  </TiltedCard>
                </div>
              </motion.section>
            )}

            {/* TAB CONTENT: CLIENTES */}
            {activeTab === 'tab-clientes' && (
              <motion.section
                key="clientes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="tab-pane"
              >
                <div className="actions-bar">
                  <div className="search-box glassmorphism">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Buscar cliente por RUT o Nombre..."
                      value={searchClientes}
                      onChange={(e) => setSearchClientes(e.target.value)}
                    />
                  </div>
                  <RippleButton onClick={handleOpenAddCliente} className="btn-primary">
                    <i className="fa-solid fa-user-plus"></i> Registrar Cliente
                  </RippleButton>
                </div>
                
                <div className="content-card glassmorphism">
                  <div className="table-container">
                    <table className="sleek-table">
                      <thead>
                        <tr>
                          <th>RUT</th>
                          <th>Nombre completo</th>
                          <th>Email</th>
                          <th>Teléfono</th>
                          <th>Dirección</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {getFilteredClientes().length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center text-muted">No se encontraron clientes.</td>
                          </tr>
                        ) : (
                          getFilteredClientes().map((cli) => (
                            <motion.tr key={cli.rut} variants={itemVariants}>
                              <td><span className="font-semibold text-muted">{cli.rut}</span></td>
                              <td><strong>{cli.nombre}</strong></td>
                              <td>{cli.email}</td>
                              <td>{cli.telefono}</td>
                              <td>
                                <span className="text-sm text-secondary">
                                  {`${cli.direccion.calle} N°${cli.direccion.numero}, ${cli.direccion.comuna}, ${cli.direccion.ciudad}`}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons-group">
                                  <RippleButton
                                    onClick={() => handleOpenEditCliente(cli)}
                                    className="btn-cyan btn-icon-only"
                                    title="Editar Cliente"
                                  >
                                    <i className="fa-regular fa-pen-to-square"></i>
                                  </RippleButton>
                                  {currentUser.rol === 'admin' ? (
                                    <RippleButton
                                      onClick={() => handleOpenConfirmDelete(cli.rut, 'cliente')}
                                      className="btn-danger btn-icon-only"
                                      title="Eliminar Cliente"
                                    >
                                      <i className="fa-regular fa-trash-can"></i>
                                    </RippleButton>
                                  ) : (
                                    <button className="btn btn-secondary btn-icon-only" disabled title="Eliminar (Solo Admin)">
                                      <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}

            {/* TAB CONTENT: PRODUCTOS */}
            {activeTab === 'tab-productos' && (
              <motion.section
                key="productos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="tab-pane"
              >
                <div className="actions-bar">
                  <div className="search-box glassmorphism">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Buscar producto por SKU, Nombre o Categoría..."
                      value={searchProductos}
                      onChange={(e) => setSearchProductos(e.target.value)}
                    />
                  </div>
                  {currentUser.rol === 'admin' ? (
                    <RippleButton onClick={handleOpenAddProducto} className="btn-primary">
                      <i className="fa-solid fa-plus"></i> Registrar Producto
                    </RippleButton>
                  ) : (
                    <button className="btn btn-secondary" disabled title="Registrar (Solo Admin)">
                      <i className="fa-solid fa-plus"></i> Registrar Producto (Admin)
                    </button>
                  )}
                </div>
                
                <div className="content-card glassmorphism">
                  <div className="table-container">
                    <table className="sleek-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Nombre</th>
                          <th>Descripción</th>
                          <th>Categoría</th>
                          <th className="text-right">Precio</th>
                          <th className="text-right">Stock</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {getFilteredProductos().length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center text-muted">No hay productos disponibles.</td>
                          </tr>
                        ) : (
                          getFilteredProductos().map((prod) => (
                            <motion.tr key={prod.sku} variants={itemVariants}>
                              <td><span className="font-semibold text-muted">{prod.sku}</span></td>
                              <td><strong>{prod.nombre}</strong></td>
                              <td><span className="text-sm text-secondary">{prod.descripcion || 'Sin descripción'}</span></td>
                              <td><span className="role-badge role-vendedor">{prod.categoria}</span></td>
                              <td className="text-right font-semibold">${prod.precio.toLocaleString('es-CL')}</td>
                              <td className="text-right font-semibold">{prod.stock}</td>
                              <td>
                                {currentUser.rol === 'admin' ? (
                                  <div className="action-buttons-group">
                                    <RippleButton
                                      onClick={() => handleOpenEditProducto(prod)}
                                      className="btn-cyan btn-icon-only"
                                      title="Editar Producto"
                                    >
                                      <i className="fa-regular fa-pen-to-square"></i>
                                    </RippleButton>
                                    <RippleButton
                                      onClick={() => handleOpenConfirmDelete(prod.sku, 'producto')}
                                      className="btn-danger btn-icon-only"
                                      title="Eliminar Producto"
                                    >
                                      <i className="fa-regular fa-trash-can"></i>
                                    </RippleButton>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted"><i className="fa-solid fa-lock"></i> Solo Lectura</span>
                                )}
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}

            {/* TAB CONTENT: PEDIDOS */}
            {activeTab === 'tab-pedidos' && (
              <motion.section
                key="pedidos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="tab-pane"
              >
                <div className="actions-bar">
                  <div className="search-box glassmorphism">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                      type="text"
                      placeholder="Buscar pedidos por N° Pedido o RUT Cliente..."
                      value={searchPedidos}
                      onChange={(e) => setSearchPedidos(e.target.value)}
                    />
                  </div>
                  <RippleButton onClick={handleOpenAddPedido} className="btn-primary">
                    <i className="fa-solid fa-receipt"></i> Crear Nuevo Pedido
                  </RippleButton>
                </div>
                
                <div className="content-card glassmorphism">
                  <div className="table-container">
                    <table className="sleek-table">
                      <thead>
                        <tr>
                          <th>N° Pedido</th>
                          <th>Cliente (RUT)</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                          <th className="text-right">Total</th>
                          <th>Detalles</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {getFilteredPedidos().length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center text-muted">No se registran pedidos.</td>
                          </tr>
                        ) : (
                          getFilteredPedidos().map((ped) => {
                            const dateStr = new Date(ped.fecha_pedido).toLocaleDateString('es-CL', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            
                            let badgeClass = 'status-pending';
                            if (ped.estado === 'pagado') badgeClass = 'status-paid';
                            if (ped.estado === 'despachado') badgeClass = 'status-shipped';
                            if (ped.estado === 'entregado') badgeClass = 'status-delivered';
                            if (ped.estado === 'cancelado') badgeClass = 'status-cancelled';

                            return (
                              <motion.tr key={ped.numero_pedido} variants={itemVariants}>
                                <td><span className="font-semibold text-muted">{ped.numero_pedido}</span></td>
                                <td><span className="font-semibold">{ped.cliente_rut}</span></td>
                                <td><span className="text-sm text-secondary">{dateStr}</span></td>
                                <td><span className={`status-badge ${badgeClass}`}>{ped.estado}</span></td>
                                <td className="text-right font-semibold text-accent-cyan">${ped.total.toLocaleString('es-CL')}</td>
                                <td>
                                  <RippleButton onClick={() => handleViewPedidoDetails(ped.numero_pedido)} className="btn-secondary">
                                    <i className="fa-solid fa-eye"></i> Ver Detalle
                                  </RippleButton>
                                </td>
                                <td>
                                  <div className="action-buttons-group">
                                    <RippleButton
                                      onClick={() => handleOpenEditPedidoStatus(ped.numero_pedido, ped.estado)}
                                      className="btn-cyan btn-icon-only"
                                      title="Cambiar Estado"
                                    >
                                      <i className="fa-solid fa-arrows-spin"></i>
                                    </RippleButton>
                                    {currentUser.rol === 'admin' ? (
                                      <RippleButton
                                        onClick={() => handleOpenConfirmDelete(ped.numero_pedido, 'pedido')}
                                        className="btn-danger btn-icon-only"
                                        title="Eliminar Pedido"
                                      >
                                        <i className="fa-regular fa-trash-can"></i>
                                      </RippleButton>
                                    ) : (
                                      <button className="btn btn-secondary btn-icon-only" disabled title="Eliminar (Solo Admin)">
                                        <i className="fa-regular fa-trash-can"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ==========================================
           MODALS RENDERINGS
           ========================================== */}
      
      {/* CLIENTE MODAL (ADD & EDIT) */}
      <AnimatePresence>
        {showModalCliente && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalCliente(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism">
              <div className="modal-header">
                <h3>{modalClienteTitle}</h3>
                <button onClick={() => setShowModalCliente(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <form onSubmit={handleClienteFormSubmit} className="modal-form">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>RUT <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="12345678-9"
                      required
                      disabled={clientFormAction === 'edit'}
                      value={clientFormData.rut}
                      onChange={(e) => setClientFormData({ ...clientFormData, rut: e.target.value })}
                    />
                    <span className="input-hint">Sin puntos y con guión</span>
                  </div>
                  <div className="form-group">
                    <label>Nombre completo <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      required
                      value={clientFormData.nombre}
                      onChange={(e) => setClientFormData({ ...clientFormData, nombre: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Correo Electrónico <span className="required">*</span></label>
                    <input
                      type="email"
                      placeholder="juan@email.com"
                      required
                      value={clientFormData.email}
                      onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="+56912345678"
                      required
                      value={clientFormData.telefono}
                      onChange={(e) => setClientFormData({ ...clientFormData, telefono: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="form-section-title">Dirección de Despacho</div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Calle <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Av. Providencia"
                      required
                      value={clientFormData.calle}
                      onChange={(e) => setClientFormData({ ...clientFormData, calle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Número <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="1540"
                      required
                      value={clientFormData.numero}
                      onChange={(e) => setClientFormData({ ...clientFormData, numero: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Comuna <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Providencia"
                      required
                      value={clientFormData.comuna}
                      onChange={(e) => setClientFormData({ ...clientFormData, comuna: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ciudad <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Santiago"
                      required
                      value={clientFormData.ciudad}
                      onChange={(e) => setClientFormData({ ...clientFormData, ciudad: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
                  <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalCliente(false)}>Cancelar</RippleButton>
                  <RippleButton type="submit" className="btn-primary">Guardar Cliente</RippleButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRODUCTO MODAL (ADD & EDIT) */}
      <AnimatePresence>
        {showModalProducto && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalProducto(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism">
              <div className="modal-header">
                <h3>{modalProductoTitle}</h3>
                <button onClick={() => setShowModalProducto(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <form onSubmit={handleProductoFormSubmit} className="modal-form">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>SKU <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="LAP-HP-15"
                      required
                      disabled={productFormAction === 'edit'}
                      value={productFormData.sku}
                      onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                    />
                    <span className="input-hint">Código único de inventario</span>
                  </div>
                  <div className="form-group">
                    <label>Nombre de Producto <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Notebook HP Pavilion"
                      required
                      value={productFormData.nombre}
                      onChange={(e) => setProductFormData({ ...productFormData, nombre: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    placeholder="Detalle del producto, especificaciones, etc."
                    rows="3"
                    value={productFormData.descripcion}
                    onChange={(e) => setProductFormData({ ...productFormData, descripcion: e.target.value })}
                  ></textarea>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Categoría <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="Computación"
                      required
                      value={productFormData.categoria}
                      onChange={(e) => setProductFormData({ ...productFormData, categoria: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Precio ($) <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      placeholder="599000"
                      required
                      value={productFormData.precio}
                      onChange={(e) => setProductFormData({ ...productFormData, precio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Inicial <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      placeholder="10"
                      required
                      value={productFormData.stock}
                      onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="modal-footer">
                  <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalProducto(false)}>Cancelar</RippleButton>
                  <RippleButton type="submit" className="btn-primary">Guardar Producto</RippleButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PEDIDO MODAL (ADD NEW ORDER) */}
      <AnimatePresence>
        {showModalPedido && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalPedido(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism large">
              <div className="modal-header">
                <h3>Crear Nuevo Pedido</h3>
                <button onClick={() => setShowModalPedido(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <form onSubmit={handlePedidoFormSubmit} className="modal-form">
                <div className="form-section-title">Información General</div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Seleccionar Cliente <span className="required">*</span></label>
                    <select
                      required
                      value={orderFormData.cliente_rut}
                      onChange={(e) => setOrderFormData({ ...orderFormData, cliente_rut: e.target.value })}
                    >
                      <option value="">Seleccione un cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.rut} value={c.rut}>{`${c.nombre} (${c.rut})`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Número de Pedido <span className="required">*</span></label>
                    <input
                      type="text"
                      placeholder="PED-10001"
                      required
                      value={orderFormData.numero}
                      onChange={(e) => setOrderFormData({ ...orderFormData, numero: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* ITEMS SELECTION */}
                <div className="form-section-title">Ítems del Pedido</div>
                <div className="item-selector-box glassmorphism">
                  <div className="form-row-3 flex-grow-1" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group">
                      <label>Producto</label>
                      <select
                        value={orderAddItemSku}
                        onChange={(e) => setOrderAddItemSku(e.target.value)}
                      >
                        <option value="">Seleccione producto para añadir...</option>
                        {productos.map((p) => (
                          <option key={p.sku} value={p.sku}>
                            {`${p.nombre} - $${p.precio.toLocaleString('es-CL')} (Stock: ${p.stock})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={orderAddItemQty}
                        onChange={(e) => setOrderAddItemQty(e.target.value)}
                      />
                    </div>
                    <div className="form-group align-self-end">
                      <RippleButton type="button" onClick={handleAddItemToDraft} className="btn-cyan btn-block">
                        <i className="fa-solid fa-plus"></i> Añadir Ítem
                      </RippleButton>
                    </div>
                  </div>
                </div>
                
                <div className="table-container margin-y">
                  <table className="sleek-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th className="text-right">Cantidad</th>
                        <th className="text-right">Precio Unitario</th>
                        <th className="text-right">Subtotal</th>
                        <th className="text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftOrderItems.length === 0 ? (
                        <tr className="empty-row-placeholder">
                          <td colSpan="6" className="text-center text-muted">Aún no se han añadido ítems a este pedido.</td>
                        </tr>
                      ) : (
                        draftOrderItems.map((item) => (
                          <tr key={item.sku}>
                            <td><span className="font-semibold text-muted">{item.sku}</span></td>
                            <td><strong>{item.nombre_producto}</strong></td>
                            <td className="text-right font-semibold">{item.cantidad}</td>
                            <td className="text-right">${item.precio_unitario.toLocaleString('es-CL')}</td>
                            <td className="text-right font-semibold text-accent-cyan">${item.subtotal.toLocaleString('es-CL')}</td>
                            <td className="text-center">
                              <RippleButton type="button" className="btn-danger btn-icon-only" onClick={() => handleRemoveDraftItem(item.sku)}>
                                <i className="fa-solid fa-trash"></i>
                              </RippleButton>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TOTAL AND ADDRESS */}
                <div className="form-row-2 border-top padding-top">
                  <div className="form-group">
                    <label>Dirección de Envío (Autocompletado del Cliente)</label>
                    <div className="address-preview-box">
                      {selectedClientAddressPreview()}
                    </div>
                  </div>
                  <div className="order-total-display">
                    <span className="total-label">Total del Pedido:</span>
                    <span className="total-value">
                      ${draftOrderItems.reduce((acc, curr) => acc + curr.subtotal, 0).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalPedido(false)}>Cancelar</RippleButton>
                  <RippleButton type="submit" className="btn-primary">Registrar Pedido</RippleButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPDATE ORDER STATUS MODAL */}
      <AnimatePresence>
        {showModalPedidoStatus && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalPedidoStatus(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism">
              <div className="modal-header">
                <h3>Actualizar Estado del Pedido</h3>
                <button onClick={() => setShowModalPedidoStatus(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <form onSubmit={handlePedidoStatusFormSubmit} className="modal-form">
                <div className="form-group">
                  <label>Seleccione Nuevo Estado</label>
                  <select
                    required
                    value={statusUpdateSelect}
                    onChange={(e) => setStatusUpdateSelect(e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="despachado">Despachado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  {statusUpdateSelect === 'cancelado' && (
                    <p className="input-hint text-warning margin-top-sm" style={{ display: 'block' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> Al cambiar a "Cancelado", los ítems se reintegrarán automáticamente al stock general.
                    </p>
                  )}
                </div>
                <div className="modal-footer">
                  <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalPedidoStatus(false)}>Cancelar</RippleButton>
                  <RippleButton type="submit" className="btn-primary">Actualizar Estado</RippleButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXPAND ORDER DETAILS MODAL */}
      <AnimatePresence>
        {showModalPedidoDetails && detailedOrder && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalPedidoDetails(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism large">
              <div className="modal-header">
                <h3>Detalles del Pedido {detailedOrder.numero_pedido}</h3>
                <button onClick={() => setShowModalPedidoDetails(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="modal-body">
                <div className="details-grid-2">
                  <div className="details-section">
                    <h4>Información del Cliente</h4>
                    <p><strong>RUT:</strong> {detailedOrder.cliente_rut}</p>
                    <p><strong>Nombre:</strong> {clientes.find((c) => c.rut === detailedOrder.cliente_rut)?.nombre || 'Cliente Registrado'}</p>
                    <p>
                      <strong>Despacho en:</strong>{' '}
                      {`${detailedOrder.direccion_envio.calle} N°${detailedOrder.direccion_envio.numero}, ${detailedOrder.direccion_envio.comuna}, ${detailedOrder.direccion_envio.ciudad}`}
                    </p>
                  </div>
                  <div className="details-section">
                    <h4>Información de Venta</h4>
                    <p>
                      <strong>Fecha Compra:</strong>{' '}
                      {new Date(detailedOrder.fecha_pedido).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>Estado Actual:</strong>{' '}
                      <span className={`status-badge status-${detailedOrder.estado}`}>
                        {detailedOrder.estado}
                      </span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>Total Facturado:</strong>{' '}
                      <span className="text-accent-violet font-semibold">
                        ${detailedOrder.total.toLocaleString('es-CL')}
                      </span>
                    </p>
                  </div>
                </div>
                
                <h4 className="margin-top">Detalle de Ítems</h4>
                <div className="table-container">
                  <table className="sleek-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th className="text-right">Cantidad</th>
                        <th className="text-right">Precio Unitario</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedOrder.items.map((item) => (
                        <tr key={item.sku}>
                          <td><span className="font-semibold text-muted">{item.sku}</span></td>
                          <td><strong>{item.nombre_producto}</strong></td>
                          <td className="text-right font-semibold">{item.cantidad}</td>
                          <td className="text-right">${item.precio_unitario.toLocaleString('es-CL')}</td>
                          <td className="text-right font-semibold text-accent-cyan">${item.subtotal.toLocaleString('es-CL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalPedidoDetails(false)}>Cerrar</RippleButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE DIALOG */}
      <AnimatePresence>
        {showModalDelete && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModalDelete(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-card glassmorphism">
              <div className="modal-header">
                <h3>Confirmar Eliminación</h3>
                <button onClick={() => setShowModalDelete(false)} className="btn-close-modal"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="modal-body text-center">
                <div className="delete-warning-icon">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p>¿Está seguro que desea eliminar este registro?</p>
                <p className="text-muted text-sm margin-top-sm">
                  Esta acción es irreversible y se reflejará permanentemente en la base de datos MongoDB.
                </p>
              </div>
              <div className="modal-footer justify-center">
                <RippleButton type="button" className="btn-secondary" onClick={() => setShowModalDelete(false)}>Cancelar</RippleButton>
                <RippleButton type="button" className="btn-danger" onClick={handleConfirmDeleteClick}>Eliminar Registro</RippleButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
