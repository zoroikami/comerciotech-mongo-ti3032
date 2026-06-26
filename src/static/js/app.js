/* ==========================================================================
   ComercioTech JS - Frontend Logic and REST API Client
   ========================================================================== */

// 1. Application State
const state = {
    currentUser: null,
    activeTab: 'tab-dashboard',
    clientes: [],
    productos: [],
    pedidos: [],
    selectedOrderItems: [], // Draft items for order creation
    currentItemIdToDelete: null,
    deleteType: null // 'cliente', 'producto', 'pedido'
};

// 2. DOM Elements Selection
const DOM = {
    loginContainer: document.getElementById('login-container'),
    appContainer: document.getElementById('app-container'),
    loginForm: document.getElementById('login-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    togglePassword: document.getElementById('toggle-password'),
    btnSubmitLogin: document.getElementById('btn-login'),
    
    // Sidebar elements
    currentUserName: document.getElementById('current-user-name'),
    currentUserRoleBadge: document.getElementById('current-user-role-badge'),
    btnLogout: document.getElementById('btn-logout'),
    navButtons: document.querySelectorAll('.nav-btn'),
    
    // Tab title
    tabTitle: document.getElementById('tab-title'),
    tabSubtitle: document.getElementById('tab-subtitle'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // Search boxes
    searchClientes: document.getElementById('search-clientes'),
    searchProductos: document.getElementById('search-productos'),
    searchPedidos: document.getElementById('search-pedidos'),
    
    // Dashboard Stats
    statVentas: document.getElementById('stat-ventas'),
    statClientes: document.getElementById('stat-clientes'),
    statProductos: document.getElementById('stat-productos'),
    statPedidos: document.getElementById('stat-pedidos'),
    tableTopProducts: document.getElementById('table-top-products').querySelector('tbody'),
    
    // Tables
    tableClientes: document.getElementById('table-clientes').querySelector('tbody'),
    tableProductos: document.getElementById('table-productos').querySelector('tbody'),
    tablePedidos: document.getElementById('table-pedidos').querySelector('tbody'),
    
    // Modals
    modalCliente: document.getElementById('modal-cliente'),
    modalProducto: document.getElementById('modal-producto'),
    modalPedido: document.getElementById('modal-pedido'),
    modalPedidoStatus: document.getElementById('modal-pedido-status'),
    modalPedidoDetails: document.getElementById('modal-pedido-details'),
    modalDelete: document.getElementById('modal-delete'),
    
    // Add Buttons
    btnAddCliente: document.getElementById('btn-add-cliente'),
    btnAddProducto: document.getElementById('btn-add-producto'),
    btnAddPedido: document.getElementById('btn-add-pedido'),
    
    // Modal Forms
    formCliente: document.getElementById('form-cliente'),
    formProducto: document.getElementById('form-producto'),
    formPedido: document.getElementById('form-pedido'),
    formPedidoStatus: document.getElementById('form-pedido-status'),
    
    // Toast Container
    toastContainer: document.getElementById('toast-container'),
    
    // Confirm Delete button
    btnConfirmDelete: document.getElementById('btn-confirm-delete')
};

// 3. API Request Wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Inject mock session headers if user is logged in
    if (state.currentUser) {
        headers['X-User-Role'] = state.currentUser.rol;
        headers['X-User-Username'] = state.currentUser.username;
        headers['X-User-Name'] = state.currentUser.nombre;
    }
    
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(endpoint, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `Error de servidor: ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`API Call failed (${endpoint}):`, error);
        showToast(error.message, 'error');
        throw error;
    }
}

// 4. Toast Notification System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Remove toast after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// 5. Authentication Flow
async function handleLogin(e) {
    e.preventDefault();
    const username = DOM.loginUsername.value.trim();
    const password = DOM.loginPassword.value.trim();
    
    if (!username || !password) return;
    
    DOM.btnSubmitLogin.disabled = true;
    DOM.btnSubmitLogin.innerHTML = 'Verificando... <i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const res = await apiCall('/api/auth/login', 'POST', { username, password });
        if (res.success) {
            state.currentUser = res.user;
            
            // Save to sessionStorage
            sessionStorage.setItem('ct_user', JSON.stringify(state.currentUser));
            
            // Load dashboard
            initializeDashboard();
            showToast(`¡Bienvenido, ${state.currentUser.nombre}!`, 'success');
        }
    } catch (err) {
        // Error is handled by apiCall toast
    } finally {
        DOM.btnSubmitLogin.disabled = false;
        DOM.btnSubmitLogin.innerHTML = 'Iniciar Sesión <i class="fa-solid fa-arrow-right-to-bracket"></i>';
    }
}

async function handleLogout() {
    try {
        await apiCall('/api/auth/logout', 'POST');
    } catch (e) {}
    
    state.currentUser = null;
    sessionStorage.removeItem('ct_user');
    
    // Show login page
    DOM.appContainer.classList.add('hidden');
    DOM.loginContainer.classList.remove('hidden');
    DOM.loginForm.reset();
    showToast('Sesión cerrada correctamente.', 'info');
}

// 6. View Navigation (Tabs)
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update active nav button
    DOM.navButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide tab panels
    DOM.tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.remove('hidden');
        } else {
            pane.classList.add('hidden');
        }
    });
    
    // Set Header titles based on selected tab
    const tabName = tabId.replace('tab-', '');
    if (tabName === 'dashboard') {
        DOM.tabTitle.textContent = 'Inicio';
        DOM.tabSubtitle.textContent = 'Resumen ejecutivo y analíticas comerciales de la base de datos.';
        loadDashboardStats();
    } else if (tabName === 'clientes') {
        DOM.tabTitle.textContent = 'Gestión de Clientes';
        DOM.tabSubtitle.textContent = 'Registro, consulta y administración de perfiles de clientes ComercioTech.';
        loadClientes();
    } else if (tabName === 'productos') {
        DOM.tabTitle.textContent = 'Catálogo de Productos';
        DOM.tabSubtitle.textContent = 'Inventario, precios, categorización y atributos variables de productos.';
        loadProductos();
    } else if (tabName === 'pedidos') {
        DOM.tabTitle.textContent = 'Gestión de Pedidos';
        DOM.tabSubtitle.textContent = 'Órdenes de compra, ciclo de vida del pedido e historial de transacciones.';
        loadPedidos();
    }
}

// 7. Modals helper
function openModal(modal) {
    modal.classList.remove('hidden');
}

function closeModal(modal) {
    modal.classList.add('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// 8. Data Fetching & Rendering

// --- DASHBOARD ---
async function loadDashboardStats() {
    try {
        const res = await apiCall('/api/dashboard/stats');
        if (res.success) {
            DOM.statVentas.textContent = `$${res.stats.ventas.toLocaleString('es-CL')}`;
            DOM.statClientes.textContent = res.stats.clientes;
            DOM.statProductos.textContent = res.stats.productos;
            DOM.statPedidos.textContent = res.stats.pedidos;
            
            // Top products
            DOM.tableTopProducts.innerHTML = '';
            if (res.stats.top_productos.length === 0) {
                DOM.tableTopProducts.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aún no hay transacciones para calcular estadísticas.</td></tr>`;
            } else {
                res.stats.top_productos.forEach(prod => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><span class="font-semibold text-muted">${prod._id}</span></td>
                        <td>${prod.nombre}</td>
                        <td class="text-right font-semibold">${prod.cantidad}</td>
                        <td class="text-right font-semibold text-accent-cyan">$${prod.total.toLocaleString('es-CL')}</td>
                    `;
                    DOM.tableTopProducts.appendChild(tr);
                });
            }
        }
    } catch (err) {}
}

// --- CLIENTES ---
async function loadClientes() {
    try {
        const data = await apiCall('/api/clientes');
        state.clientes = data;
        renderClientes(data);
    } catch (err) {}
}

function renderClientes(list) {
    DOM.tableClientes.innerHTML = '';
    if (list.length === 0) {
        DOM.tableClientes.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No se encontraron clientes en la base de datos.</td></tr>`;
        return;
    }
    
    list.forEach(cli => {
        const tr = document.createElement('tr');
        const dir = cli.direccion;
        const addressStr = `${dir.calle} N°${dir.numero}, ${dir.comuna}, ${dir.ciudad}`;
        
        // Disable delete buttons for non-admin users
        const deleteBtn = state.currentUser.rol === 'admin' 
            ? `<button class="btn btn-danger btn-icon-only" onclick="confirmDelete('${cli.rut}', 'cliente')" title="Eliminar Cliente"><i class="fa-regular fa-trash-can"></i></button>`
            : `<button class="btn btn-secondary btn-icon-only" disabled title="Eliminar (Solo Admin)"><i class="fa-regular fa-trash-can"></i></button>`;
            
        tr.innerHTML = `
            <td><span class="font-semibold text-muted">${cli.rut}</span></td>
            <td><strong>${cli.nombre}</strong></td>
            <td>${cli.email}</td>
            <td>${cli.telefono}</td>
            <td><span class="text-sm text-secondary">${addressStr}</span></td>
            <td>
                <div class="action-buttons-group">
                    <button class="btn btn-cyan btn-icon-only" onclick="editCliente('${cli.rut}')" title="Editar Cliente"><i class="fa-regular fa-pen-to-square"></i></button>
                    ${deleteBtn}
                </div>
            </td>
        `;
        DOM.tableClientes.appendChild(tr);
    });
}

// --- PRODUCTOS ---
async function loadProductos() {
    try {
        const data = await apiCall('/api/productos');
        state.productos = data;
        renderProductos(data);
    } catch (err) {}
}

function renderProductos(list) {
    DOM.tableProductos.innerHTML = '';
    if (list.length === 0) {
        DOM.tableProductos.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay productos disponibles en el catálogo.</td></tr>`;
        return;
    }
    
    list.forEach(prod => {
        const tr = document.createElement('tr');
        
        // Non-admin can't manage catalog, hide or disable edit/delete
        const actionBtn = state.currentUser.rol === 'admin' 
            ? `
                <div class="action-buttons-group">
                    <button class="btn btn-cyan btn-icon-only" onclick="editProducto('${prod.sku}')" title="Editar Producto"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button class="btn btn-danger btn-icon-only" onclick="confirmDelete('${prod.sku}', 'producto')" title="Eliminar Producto"><i class="fa-regular fa-trash-can"></i></button>
                </div>
              `
            : `<span class="text-xs text-muted"><i class="fa-solid fa-lock"></i> Solo Lectura</span>`;
            
        tr.innerHTML = `
            <td><span class="font-semibold text-muted">${prod.sku}</span></td>
            <td><strong>${prod.nombre}</strong></td>
            <td><span class="text-sm text-secondary">${prod.descripcion || 'Sin descripción'}</span></td>
            <td><span class="role-badge role-vendedor">${prod.categoria}</span></td>
            <td class="text-right font-semibold">$${prod.precio.toLocaleString('es-CL')}</td>
            <td class="text-right font-semibold">${prod.stock}</td>
            <td>${actionBtn}</td>
        `;
        DOM.tableProductos.appendChild(tr);
    });
}

// --- PEDIDOS ---
async function loadPedidos() {
    try {
        const data = await apiCall('/api/pedidos');
        state.pedidos = data;
        renderPedidos(data);
    } catch (err) {}
}

function renderPedidos(list) {
    DOM.tablePedidos.innerHTML = '';
    if (list.length === 0) {
        DOM.tablePedidos.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No se registran pedidos en el sistema.</td></tr>`;
        return;
    }
    
    list.forEach(ped => {
        const tr = document.createElement('tr');
        const fecha = new Date(ped.fecha_pedido).toLocaleDateString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        let badgeClass = 'status-pending';
        if (ped.estado === 'pagado') badgeClass = 'status-paid';
        if (ped.estado === 'despachado') badgeClass = 'status-shipped';
        if (ped.estado === 'entregado') badgeClass = 'status-delivered';
        if (ped.estado === 'cancelado') badgeClass = 'status-cancelled';
        
        const deleteBtn = state.currentUser.rol === 'admin'
            ? `<button class="btn btn-danger btn-icon-only" onclick="confirmDelete('${ped.numero_pedido}', 'pedido')" title="Eliminar Pedido"><i class="fa-regular fa-trash-can"></i></button>`
            : `<button class="btn btn-secondary btn-icon-only" disabled title="Eliminar (Solo Admin)"><i class="fa-regular fa-trash-can"></i></button>`;
            
        tr.innerHTML = `
            <td><span class="font-semibold text-muted">${ped.numero_pedido}</span></td>
            <td><span class="font-semibold">${ped.cliente_rut}</span></td>
            <td><span class="text-sm text-secondary">${fecha}</span></td>
            <td><span class="status-badge ${badgeClass}">${ped.estado}</span></td>
            <td class="text-right font-semibold text-accent-cyan">$${ped.total.toLocaleString('es-CL')}</td>
            <td>
                <button class="btn btn-secondary" onclick="viewPedidoDetails('${ped.numero_pedido}')">
                    <i class="fa-solid fa-eye"></i> Ver Detalle
                </button>
            </td>
            <td>
                <div class="action-buttons-group">
                    <button class="btn btn-cyan btn-icon-only" onclick="editPedidoStatus('${ped.numero_pedido}', '${ped.estado}')" title="Cambiar Estado"><i class="fa-solid fa-arrows-spin"></i></button>
                    ${deleteBtn}
                </div>
            </td>
        `;
        DOM.tablePedidos.appendChild(tr);
    });
}

// 9. Forms Submissions & Modals triggers

// --- CLIENTE CONTROLLER ---
function editCliente(rut) {
    const cli = state.clientes.find(c => c.rut === rut);
    if (!cli) return;
    
    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    DOM.formCliente.dataset.action = 'edit';
    DOM.formCliente.dataset.id = rut;
    
    // Read only RUT on edit
    document.getElementById('cli-rut').value = cli.rut;
    document.getElementById('cli-rut').disabled = true;
    
    document.getElementById('cli-nombre').value = cli.nombre;
    document.getElementById('cli-email').value = cli.email;
    document.getElementById('cli-telefono').value = cli.telefono;
    document.getElementById('cli-calle').value = cli.direccion.calle;
    document.getElementById('cli-numero').value = cli.direccion.numero;
    document.getElementById('cli-comuna').value = cli.direccion.comuna;
    document.getElementById('cli-ciudad').value = cli.direccion.ciudad;
    
    openModal(DOM.modalCliente);
}

DOM.btnAddCliente.addEventListener('click', () => {
    document.getElementById('modal-cliente-title').textContent = 'Registrar Nuevo Cliente';
    DOM.formCliente.dataset.action = 'add';
    DOM.formCliente.dataset.id = '';
    
    DOM.formCliente.reset();
    document.getElementById('cli-rut').disabled = false;
    
    openModal(DOM.modalCliente);
});

DOM.formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = DOM.formCliente.dataset.action;
    const id = DOM.formCliente.dataset.id;
    
    const clientData = {
        rut: document.getElementById('cli-rut').value.trim(),
        nombre: document.getElementById('cli-nombre').value.trim(),
        email: document.getElementById('cli-email').value.trim(),
        telefono: document.getElementById('cli-telefono').value.trim(),
        direccion: {
            calle: document.getElementById('cli-calle').value.trim(),
            numero: document.getElementById('cli-numero').value.trim(),
            comuna: document.getElementById('cli-comuna').value.trim(),
            ciudad: document.getElementById('cli-ciudad').value.trim()
        }
    };
    
    try {
        if (action === 'add') {
            await apiCall('/api/clientes', 'POST', clientData);
            showToast('Cliente creado exitosamente.', 'success');
        } else {
            await apiCall(`/api/clientes/${id}`, 'PUT', clientData);
            showToast('Cliente actualizado exitosamente.', 'success');
        }
        closeModal(DOM.modalCliente);
        loadClientes();
    } catch (err) {}
});

// --- PRODUCTO CONTROLLER ---
function editProducto(sku) {
    const prod = state.productos.find(p => p.sku === sku);
    if (!prod) return;
    
    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    DOM.formProducto.dataset.action = 'edit';
    DOM.formProducto.dataset.id = sku;
    
    // Read only SKU on edit
    document.getElementById('prod-sku').value = prod.sku;
    document.getElementById('prod-sku').disabled = true;
    
    document.getElementById('prod-nombre').value = prod.nombre;
    document.getElementById('prod-descripcion').value = prod.descripcion || '';
    document.getElementById('prod-categoria').value = prod.categoria;
    document.getElementById('prod-precio').value = prod.precio;
    document.getElementById('prod-stock').value = prod.stock;
    
    openModal(DOM.modalProducto);
}

DOM.btnAddProducto.addEventListener('click', () => {
    // Only admins can register products
    if (state.currentUser.rol !== 'admin') {
        showToast('Acceso Denegado. Solo administradores pueden agregar productos.', 'error');
        return;
    }
    
    document.getElementById('modal-producto-title').textContent = 'Registrar Nuevo Producto';
    DOM.formProducto.dataset.action = 'add';
    DOM.formProducto.dataset.id = '';
    
    DOM.formProducto.reset();
    document.getElementById('prod-sku').disabled = false;
    
    openModal(DOM.modalProducto);
});

DOM.formProducto.addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = DOM.formProducto.dataset.action;
    const id = DOM.formProducto.dataset.id;
    
    const productData = {
        sku: document.getElementById('prod-sku').value.trim(),
        nombre: document.getElementById('prod-nombre').value.trim(),
        descripcion: document.getElementById('prod-descripcion').value.trim(),
        categoria: document.getElementById('prod-categoria').value.trim(),
        precio: parseFloat(document.getElementById('prod-precio').value),
        stock: parseInt(document.getElementById('prod-stock').value)
    };
    
    try {
        if (action === 'add') {
            await apiCall('/api/productos', 'POST', productData);
            showToast('Producto agregado al catálogo.', 'success');
        } else {
            await apiCall(`/api/productos/${id}`, 'PUT', productData);
            showToast('Producto actualizado correctamente.', 'success');
        }
        closeModal(DOM.modalProducto);
        loadProductos();
    } catch (err) {}
});

// --- PEDIDO CONTROLLER (ORDER CREATOR / BASKET SYSTEM) ---

DOM.btnAddPedido.addEventListener('click', async () => {
    // Reset draft list
    state.selectedOrderItems = [];
    renderDraftOrderItems();
    
    // Auto increment ped ID or set a clean demo ID
    const count = state.pedidos.length + 1;
    document.getElementById('ped-numero').value = `PED-100${count}`;
    
    // Load clients dropdown
    const selectClientes = document.getElementById('ped-cliente');
    selectClientes.innerHTML = '<option value="">Seleccione un cliente...</option>';
    
    // Query local list of clients
    if (state.clientes.length === 0) {
        await loadClientes();
    }
    state.clientes.forEach(cli => {
        const opt = document.createElement('option');
        opt.value = cli.rut;
        opt.textContent = `${cli.nombre} (${cli.rut})`;
        selectClientes.appendChild(opt);
    });
    
    // Load products dropdown
    const selectProds = document.getElementById('ped-add-item-sku');
    selectProds.innerHTML = '<option value="">Seleccione producto para añadir...</option>';
    
    if (state.productos.length === 0) {
        await loadProductos();
    }
    state.productos.forEach(prod => {
        const opt = document.createElement('option');
        opt.value = prod.sku;
        opt.textContent = `${prod.nombre} - $${prod.precio.toLocaleString('es-CL')} (Stock: ${prod.stock})`;
        selectProds.appendChild(opt);
    });
    
    document.getElementById('ped-direccion-envio-preview').textContent = 'No se ha seleccionado ningún cliente.';
    document.getElementById('ped-total-display').textContent = '$0';
    
    openModal(DOM.modalPedido);
});

// Auto-fill address on select client
document.getElementById('ped-cliente').addEventListener('change', (e) => {
    const rut = e.target.value;
    const preview = document.getElementById('ped-direccion-envio-preview');
    if (!rut) {
        preview.textContent = 'No se ha seleccionado ningún cliente.';
        return;
    }
    const cli = state.clientes.find(c => c.rut === rut);
    if (cli) {
        const dir = cli.direccion;
        preview.textContent = `${dir.calle} N°${dir.numero}, ${dir.comuna}, ${dir.ciudad}`;
    }
});

// Add item to draft list
document.getElementById('btn-add-item-to-list').addEventListener('click', () => {
    const sku = document.getElementById('ped-add-item-sku').value;
    const cantidad = parseInt(document.getElementById('ped-add-item-cantidad').value);
    
    if (!sku) {
        showToast('Debe seleccionar un producto.', 'error');
        return;
    }
    
    if (isNaN(cantidad) || cantidad <= 0) {
        showToast('Cantidad inválida.', 'error');
        return;
    }
    
    const prod = state.productos.find(p => p.sku === sku);
    if (!prod) return;
    
    // Check local stock
    if (prod.stock < cantidad) {
        showToast(`Stock insuficiente. Solo quedan ${prod.stock} unidades en catálogo.`, 'error');
        return;
    }
    
    // Check if product is already in list
    const existing = state.selectedOrderItems.find(item => item.sku === sku);
    if (existing) {
        if (prod.stock < (existing.cantidad + cantidad)) {
            showToast(`No es posible agregar más unidades de ${prod.nombre}. Límite de stock excedido.`, 'error');
            return;
        }
        existing.cantidad += cantidad;
        existing.subtotal = existing.cantidad * existing.precio_unitario;
    } else {
        state.selectedOrderItems.push({
            sku: prod.sku,
            nombre_producto: prod.nombre,
            cantidad: cantidad,
            precio_unitario: prod.precio,
            subtotal: cantidad * prod.precio
        });
    }
    
    renderDraftOrderItems();
    showToast(`${prod.nombre} añadido al pedido.`, 'success');
});

function removeDraftItem(sku) {
    state.selectedOrderItems = state.selectedOrderItems.filter(item => item.sku !== sku);
    renderDraftOrderItems();
}

function renderDraftOrderItems() {
    const tbody = document.getElementById('table-pedido-items-selected').querySelector('tbody');
    tbody.innerHTML = '';
    
    if (state.selectedOrderItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row-placeholder">
                <td colspan="6" class="text-center text-muted">Aún no se han añadido ítems a este pedido.</td>
            </tr>
        `;
        document.getElementById('ped-total-display').textContent = '$0';
        return;
    }
    
    let total = 0;
    state.selectedOrderItems.forEach(item => {
        total += item.subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="font-semibold text-muted">${item.sku}</span></td>
            <td><strong>${item.nombre_producto}</strong></td>
            <td class="text-right font-semibold">${item.cantidad}</td>
            <td class="text-right">$${item.precio_unitario.toLocaleString('es-CL')}</td>
            <td class="text-right font-semibold text-accent-cyan">$${item.subtotal.toLocaleString('es-CL')}</td>
            <td class="text-center">
                <button type="button" class="btn btn-danger btn-icon-only" onclick="removeDraftItem('${item.sku}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('ped-total-display').textContent = `$${total.toLocaleString('es-CL')}`;
}

DOM.formPedido.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rut = document.getElementById('ped-cliente').value;
    const num = document.getElementById('ped-numero').value.trim();
    
    if (!rut || !num) return;
    
    if (state.selectedOrderItems.length === 0) {
        showToast('Debe agregar al menos un ítem al pedido.', 'error');
        return;
    }
    
    const cli = state.clientes.find(c => c.rut === rut);
    const total = state.selectedOrderItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    
    const pedidoData = {
        numero_pedido: num,
        cliente_rut: rut,
        estado: 'pendiente',
        items: state.selectedOrderItems,
        total: total,
        direccion_envio: {
            calle: cli.direccion.calle,
            numero: cli.direccion.numero,
            comuna: cli.direccion.comuna,
            ciudad: cli.direccion.ciudad
        }
    };
    
    try {
        await apiCall('/api/pedidos', 'POST', pedidoData);
        showToast('Pedido registrado con éxito.', 'success');
        closeModal(DOM.modalPedido);
        loadPedidos();
        
        // Refresh product stock list
        loadProductos();
    } catch (err) {}
});

// --- VER DETALLE PEDIDO ---
async function viewPedidoDetails(numero) {
    try {
        const ped = await apiCall(`/api/pedidos/${numero}`);
        
        document.getElementById('details-pedido-title').textContent = `Detalles del Pedido ${ped.numero_pedido}`;
        document.getElementById('details-cli-rut').textContent = ped.cliente_rut;
        
        // Search client name
        const cli = state.clientes.find(c => c.rut === ped.cliente_rut);
        document.getElementById('details-cli-nombre').textContent = cli ? cli.nombre : 'Cargando nombre...';
        
        const dir = ped.direccion_envio;
        document.getElementById('details-cli-direccion').textContent = `${dir.calle} N°${dir.numero}, ${dir.comuna}, ${dir.ciudad}`;
        
        const fecha = new Date(ped.fecha_pedido).toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('details-ped-fecha').textContent = fecha;
        
        const statusSpan = document.getElementById('details-ped-estado');
        statusSpan.textContent = ped.estado;
        statusSpan.className = 'status-badge';
        if (ped.estado === 'pendiente') statusSpan.classList.add('status-pending');
        if (ped.estado === 'pagado') statusSpan.classList.add('status-paid');
        if (ped.estado === 'despachado') statusSpan.classList.add('status-shipped');
        if (ped.estado === 'entregado') statusSpan.classList.add('status-delivered');
        if (ped.estado === 'cancelado') statusSpan.classList.add('status-cancelled');
        
        document.getElementById('details-ped-total').textContent = `$${ped.total.toLocaleString('es-CL')}`;
        
        // Render items table
        const tbody = document.getElementById('table-pedido-items-details').querySelector('tbody');
        tbody.innerHTML = '';
        ped.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="font-semibold text-muted">${item.sku}</span></td>
                <td><strong>${item.nombre_producto}</strong></td>
                <td class="text-right font-semibold">${item.cantidad}</td>
                <td class="text-right">$${item.precio_unitario.toLocaleString('es-CL')}</td>
                <td class="text-right font-semibold text-accent-cyan">$${item.subtotal.toLocaleString('es-CL')}</td>
            `;
            tbody.appendChild(tr);
        });
        
        openModal(DOM.modalPedidoDetails);
    } catch (err) {}
}

// --- ACTUALIZAR ESTADO PEDIDO ---
function editPedidoStatus(numero, currentStatus) {
    document.getElementById('status-pedido-num').value = numero;
    document.getElementById('status-pedido-select').value = currentStatus;
    
    // Warn if current status is not canceled and they might change it to canceled
    const warn = document.getElementById('cancel-warning-msg');
    warn.style.display = 'none';
    
    openModal(DOM.modalPedidoStatus);
}

// Show cancel warning on status change
document.getElementById('status-pedido-select').addEventListener('change', (e) => {
    const val = e.target.value;
    const warn = document.getElementById('cancel-warning-msg');
    if (val === 'cancelado') {
        warn.style.display = 'block';
    } else {
        warn.style.display = 'none';
    }
});

DOM.formPedidoStatus.addEventListener('submit', async (e) => {
    e.preventDefault();
    const num = document.getElementById('status-pedido-num').value;
    const newStatus = document.getElementById('status-pedido-select').value;
    
    try {
        await apiCall(`/api/pedidos/${num}`, 'PUT', { estado: newStatus });
        showToast('Estado del pedido actualizado.', 'success');
        closeModal(DOM.modalPedidoStatus);
        loadPedidos();
        loadProductos(); // Reload stock in case it was cancelled
    } catch (err) {}
});

// --- ELIMINAR CONTROLLER (CONFIRM DIALOG) ---
function confirmDelete(id, type) {
    state.currentItemIdToDelete = id;
    state.deleteType = type;
    openModal(DOM.modalDelete);
}

DOM.btnConfirmDelete.addEventListener('click', async () => {
    const id = state.currentItemIdToDelete;
    const type = state.deleteType;
    
    if (!id || !type) return;
    
    try {
        if (type === 'cliente') {
            await apiCall(`/api/clientes/${id}`, 'DELETE');
            showToast('Cliente eliminado permanentemente.', 'success');
            loadClientes();
        } else if (type === 'producto') {
            await apiCall(`/api/productos/${id}`, 'DELETE');
            showToast('Producto removido del catálogo.', 'success');
            loadProductos();
        } else if (type === 'pedido') {
            await apiCall(`/api/pedidos/${id}`, 'DELETE');
            showToast('Pedido eliminado del historial.', 'success');
            loadPedidos();
            loadProductos(); // Reload stock in case it was canceled first or need stock recovery
        }
        closeAllModals();
    } catch (err) {}
});

// 10. Search filtering functions
DOM.searchClientes.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.clientes.filter(cli => 
        cli.rut.toLowerCase().includes(q) || 
        cli.nombre.toLowerCase().includes(q) ||
        cli.email.toLowerCase().includes(q)
    );
    renderClientes(filtered);
});

DOM.searchProductos.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.productos.filter(prod => 
        prod.sku.toLowerCase().includes(q) || 
        prod.nombre.toLowerCase().includes(q) ||
        prod.categoria.toLowerCase().includes(q)
    );
    renderProductos(filtered);
});

DOM.searchPedidos.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.pedidos.filter(ped => 
        ped.numero_pedido.toLowerCase().includes(q) || 
        ped.cliente_rut.toLowerCase().includes(q) ||
        ped.estado.toLowerCase().includes(q)
    );
    renderPedidos(filtered);
});

// 11. Initializer UI
function initializeDashboard() {
    // Hide login form, show main panel
    DOM.loginContainer.classList.add('hidden');
    DOM.appContainer.classList.remove('hidden');
    
    // Set user profile
    DOM.currentUserName.textContent = state.currentUser.nombre;
    DOM.currentUserRoleBadge.textContent = state.currentUser.rol;
    
    // Style badges
    if (state.currentUser.rol === 'admin') {
        DOM.currentUserRoleBadge.className = 'role-badge role-admin';
    } else {
        DOM.currentUserRoleBadge.className = 'role-badge role-vendedor';
    }
    
    // Trigger first loading
    switchTab('tab-dashboard');
}

// Check local storage session on page load
window.addEventListener('DOMContentLoaded', () => {
    const cachedUser = sessionStorage.getItem('ct_user');
    if (cachedUser) {
        state.currentUser = JSON.parse(cachedUser);
        initializeDashboard();
    } else {
        DOM.loginContainer.classList.remove('hidden');
        DOM.appContainer.classList.add('hidden');
    }
});

// Event Listeners for tabs buttons
DOM.navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Password view toggler
DOM.togglePassword.addEventListener('click', () => {
    const type = DOM.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    DOM.loginPassword.setAttribute('type', type);
    const icon = DOM.togglePassword.querySelector('i');
    if (type === 'password') {
        icon.className = 'fa-regular fa-eye';
    } else {
        icon.className = 'fa-regular fa-eye-slash';
    }
});

DOM.loginForm.addEventListener('submit', handleLogin);
DOM.btnLogout.addEventListener('click', handleLogout);

// Close modals triggers
document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

// Global close modal on click outside card
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAllModals();
        }
    });
});
