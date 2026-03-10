// ========================================
// MODAL FUNCTIONS
// ========================================
function showModal(type, title, message, onConfirm = null, onCancel = null) {
    const modal = document.getElementById('custom-modal');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const closeBtn = document.querySelector('.modal-close');

    // Reset styles
    modalIcon.className = 'modal-icon';

    // Set content based on type
    if (type === 'success') {
        modalIcon.textContent = '✅';
        modalIcon.classList.add('success');
        modalTitle.textContent = title || '¡Éxito!';
    } else if (type === 'error') {
        modalIcon.textContent = '❌';
        modalIcon.classList.add('error');
        modalTitle.textContent = title || 'Error';
    } else if (type === 'confirm') {
        modalIcon.textContent = '❓';
        modalIcon.classList.add('confirm');
        modalTitle.textContent = title || 'Confirmar acción';
        cancelBtn.style.display = 'inline-block';
    } else {
        modalIcon.textContent = 'ℹ️';
        modalTitle.textContent = title || 'Información';
    }

    modalMessage.textContent = message;
    modal.style.display = 'block';

    // Close modal on close button click
    closeBtn.onclick = function () {
        modal.style.display = 'none';
        if (onCancel && type === 'confirm') onCancel();
    };

    // Close modal on outside click
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            if (onCancel && type === 'confirm') onCancel();
        }
    };

    // Confirm button
    confirmBtn.onclick = function () {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    // Cancel button (only for confirm)
    if (type === 'confirm') {
        cancelBtn.onclick = function () {
            modal.style.display = 'none';
            if (onCancel) onCancel();
        };
        cancelBtn.style.display = 'inline-block';
    } else {
        cancelBtn.style.display = 'none';
    }
}

function showSuccessModal(message, onConfirm = null) {
    showModal('success', '¡Éxito!', message, onConfirm);
}

function showErrorModal(message, onConfirm = null) {
    showModal('error', 'Error', message, onConfirm);
}

function showConfirmModal(message, onConfirm, onCancel = null) {
    showModal('confirm', 'Confirmar acción', message, onConfirm, onCancel);
}

// ========================================
// Panel de Administrador - Lógica Principal
// ========================================

document.addEventListener('DOMContentLoaded', function () {

    // Verificar si el usuario está autenticado - SIN ALERT
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Redirigir SILENTMENTE sin mostrar alerta
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // Verificar que el usuario es administrador
        database.ref('users/' + user.uid).once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    showErrorModal('Usuario no autorizado');
                    window.location.href = 'login.html';
                    return;
                }

                const userData = snapshot.val();

                // Cargar información del usuario
                loadUserInfo(user, userData);
                loadDashboardStats();
                loadUsersList();

                // Inicializar eventos
                initDashboard();
                initTabs();
                initUserFilters();
                initLogout();
                initForms();

                // Inicializar inventario
                initInventory();

                // Cargar entregas pendientes
                loadPendingDeliveries();

                // Cargar historial de entregas
                loadDeliveryHistoryAdmin();

                // Inicializar filtros de historial
                initHistoryFilters();
            })
            .catch(error => {
                console.error('Error al verificar usuario:', error);
                showErrorModal('Error al cargar información del usuario');
                window.location.href = 'login.html';
            });
    });

    // ========================================
    // Cargar información del usuario
    // ========================================
    function loadUserInfo(user, userData) {
        const userName = document.getElementById('user-name');
        const adminUsername = document.getElementById('admin-username');
        const adminEmail = document.getElementById('admin-email');
        const lastLogin = document.getElementById('last-login');

        const nombreCompleto = `${userData.nombre} ${userData.apellidoPaterno} ${userData.apellidoMaterno}`;

        if (userName) userName.textContent = nombreCompleto;
        if (adminUsername) adminUsername.textContent = nombreCompleto;
        if (adminEmail) adminEmail.textContent = user.email;
        if (lastLogin) lastLogin.textContent = new Date().toLocaleString('es-MX');
    }

    // ========================================
    // Inicializar Dashboard & Ventanas Flotantes
    // ========================================
    function initDashboard() {
        const optionCards = document.querySelectorAll('.option-card');
        const windowOverlay = document.getElementById('window-overlay');
        const closeBtn = document.querySelector('.close-btn');
        const windowTitle = document.getElementById('window-title-text');

        optionCards.forEach(card => {
            card.addEventListener('click', function () {
                const sectionId = this.getAttribute('data-section');
                const title = this.querySelector('h3').textContent;
                const iconClass = this.querySelector('i').className;

                openFloatingWindow(sectionId, title, iconClass);
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeFloatingWindow);
        }

        if (windowOverlay) {
            windowOverlay.addEventListener('click', function (e) {
                if (e.target === this) closeFloatingWindow();
            });
        }
    }

    function openFloatingWindow(sectionId, title, iconClass) {
        const windowOverlay = document.getElementById('window-overlay');
        const windowTitle = document.getElementById('window-title-text');

        if (!windowOverlay || !windowTitle) {
            console.error('Window header elements not found');
            return;
        }

        // Hide all sections first
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show window overlay
        windowOverlay.style.display = 'flex';

        // Set title and icon
        windowTitle.innerHTML = `<i class="${iconClass}"></i> <span>${title}</span>`;

        // Show specific section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');

            // Initialize specific section logic
            initializeSectionLogic(sectionId);
        } else {
            console.error('Section not found:', sectionId);
        }
    }

    function closeFloatingWindow() {
        const windowOverlay = document.getElementById('window-overlay');
        windowOverlay.style.display = 'none';

        // Deactivate all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
    }

    function initializeSectionLogic(sectionId) {
        if (sectionId === 'external-inventory') {
            initExternalInventorySection();
        } else if (sectionId === 'direct-delivery') {
            initDirectDeliverySection();
        } else if (sectionId === 'direct-rental') {
            initDirectRentalSection();
        } else if (sectionId === 'pending-rentals') {
            loadPendingRentals();
        } else if (sectionId === 'rental-history') {
            initRentalHistorySection();
        } else if (sectionId === 'inventory') {
            loadInventory();
            loadSerialNumbers();
        } else if (sectionId === 'dashboard') {
            loadDashboardStats();
        } else if (sectionId === 'create-user') {
            initTabs();
        } else if (sectionId === 'users-list') {
            loadUsersList();
        } else if (sectionId === 'pending-deliveries') {
            loadPendingDeliveries();
        } else if (sectionId === 'delivery-history') {
            loadDeliveryHistoryAdmin();
        }
    }

    // ========================================
    // Inicializar Tabs (Crear Usuario)
    // ========================================
    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', function () {
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                this.classList.add('active');

                const tab = this.getAttribute('data-tab');
                const formId = `${tab}-form`;
                document.getElementById(formId).classList.add('active');
            });
        });
    }

    // ========================================
    // Inicializar Filtros de Usuarios
    // ========================================
    function initUserFilters() {
        document.querySelectorAll('.btn-filter').forEach(button => {
            button.addEventListener('click', function () {
                document.querySelectorAll('.btn-filter').forEach(btn => {
                    btn.classList.remove('active');
                });

                this.classList.add('active');

                const filter = this.getAttribute('data-filter');
                filterUsersList(filter);
            });
        });
    }

    // ========================================
    // Inicializar Filtros de Historial
    // ========================================
    function initHistoryFilters() {
        document.querySelectorAll('.btn-filter').forEach(button => {
            button.addEventListener('click', function () {
                // Solo aplicar a los filtros del historial
                const parentSection = this.closest('.content-section');
                if (parentSection && parentSection.id === 'delivery-history') {
                    document.querySelectorAll('#delivery-history .btn-filter').forEach(btn => {
                        btn.classList.remove('active');
                    });

                    this.classList.add('active');

                    const filter = this.getAttribute('data-filter');
                    loadDeliveryHistoryAdmin(filter);
                }
            });
        });
    }

    // ========================================
    // Inicializar Cierre de Sesión
    // ========================================
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                showConfirmModal(
                    '¿Estás seguro de que deseas cerrar sesión?',
                    () => {
                        auth.signOut().then(() => {
                            sessionStorage.removeItem('user');
                            showSuccessModal('Sesión cerrada correctamente', () => {
                                window.location.href = 'login.html';
                            });
                        }).catch(error => {
                            showErrorModal('Error al cerrar sesión: ' + error.message);
                        });
                    }
                );
            });
        }
    }

    // ========================================
    // Inicializar Formularios
    // ========================================
    function initForms() {
        // Formulario de Alumno
        const createAlumnoForm = document.getElementById('create-alumno-form');
        if (createAlumnoForm) {
            createAlumnoForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const numControl = document.getElementById('alumno-num-control').value.trim();
                const nombre = document.getElementById('alumno-nombre').value.trim();
                const apPaterno = document.getElementById('alumno-ap-paterno').value.trim();
                const apMaterno = document.getElementById('alumno-ap-materno').value.trim();
                const carrera = document.getElementById('alumno-carrera').value;
                const pass = document.getElementById('alumno-password').value;
                const passConf = document.getElementById('alumno-confirm-password').value;

                // Validaciones básicas
                if (!/^[0-9]{8}$/.test(numControl)) {
                    showErrorModal('El número de control debe tener 8 dígitos numéricos');
                    return;
                }

                if (pass.length < 6) {
                    showErrorModal('La contraseña debe tener al menos 6 caracteres');
                    return;
                }

                if (pass !== passConf) {
                    showErrorModal('Las contraseñas no coinciden');
                    return;
                }

                if (!carrera) {
                    showErrorModal('Selecciona una carrera');
                    return;
                }

                // Crear usuario
                const email = `${numControl}@alumno.tecnm.mx`;
                const btn = this.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'Creando...';
                btn.disabled = true;

                auth.createUserWithEmailAndPassword(email, pass)
                    .then(userCredential => {
                        return database.ref('users/' + userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            tipo: 'alumno',
                            numeroControl: numControl,
                            nombre: nombre,
                            apellidoPaterno: apPaterno,
                            apellidoMaterno: apMaterno,
                            carrera: carrera,
                            email: email,
                            createdAt: Date.now()
                        });
                    })
                    .then(() => {
                        showSuccessModal(`✅ Alumno creado exitosamente\n\nNúmero de Control: ${numControl}\nContraseña: ${pass}`);
                        this.reset();
                        loadUsersList();
                        loadDashboardStats();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        let msg = 'Error al crear alumno:\n';
                        if (error.code === 'auth/email-already-in-use') {
                            msg += 'Este número de control ya está registrado';
                        } else if (error.code === 'auth/weak-password') {
                            msg += 'Contraseña demasiado débil (mínimo 6 caracteres)';
                        } else {
                            msg += error.message;
                        }
                        showErrorModal(msg);
                    })
                    .finally(() => {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    });
            });
        }

        // Formulario de Administrativo
        const createAdminForm = document.getElementById('create-admin-form');
        if (createAdminForm) {
            createAdminForm.addEventListener('submit', function (e) {
                e.preventDefault();

                const rfc = document.getElementById('admin-rfc').value.trim().toUpperCase();
                const nombre = document.getElementById('admin-nombre').value.trim();
                const apPaterno = document.getElementById('admin-ap-paterno').value.trim();
                const apMaterno = document.getElementById('admin-ap-materno').value.trim();
                const area = document.getElementById('admin-area').value;
                const pass = document.getElementById('admin-password').value;
                const passConf = document.getElementById('admin-confirm-password').value;

                // Validaciones básicas
                if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc)) {
                    showErrorModal('RFC inválido. Ejemplo: XAXX010101000');
                    return;
                }

                if (pass.length < 6) {
                    showErrorModal('La contraseña debe tener al menos 6 caracteres');
                    return;
                }

                if (pass !== passConf) {
                    showErrorModal('Las contraseñas no coinciden');
                    return;
                }

                if (!area) {
                    showErrorModal('Selecciona un área');
                    return;
                }

                // Crear usuario
                const email = `${rfc.toLowerCase()}@tecnm.mx`;
                const btn = this.querySelector('button[type="submit"]');
                const originalText = btn.textContent;
                btn.textContent = 'Creando...';
                btn.disabled = true;

                auth.createUserWithEmailAndPassword(email, pass)
                    .then(userCredential => {
                        return database.ref('users/' + userCredential.user.uid).set({
                            uid: userCredential.user.uid,
                            tipo: 'administrativo',
                            rfc: rfc,
                            nombre: nombre,
                            apellidoPaterno: apPaterno,
                            apellidoMaterno: apMaterno,
                            area: area,
                            email: email,
                            createdAt: Date.now()
                        });
                    })
                    .then(() => {
                        showSuccessModal(`✅ Administrativo creado exitosamente\n\nRFC: ${rfc}\nContraseña: ${pass}`);
                        this.reset();
                        loadUsersList();
                        loadDashboardStats();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        let msg = 'Error al crear administrativo:\n';
                        if (error.code === 'auth/email-already-in-use') {
                            msg += 'Este RFC ya está registrado';
                        } else if (error.code === 'auth/weak-password') {
                            msg += 'Contraseña demasiado débil (mínimo 6 caracteres)';
                        } else {
                            msg += error.message;
                        }
                        showErrorModal(msg);
                    })
                    .finally(() => {
                        btn.textContent = originalText;
                        btn.disabled = false;
                    });
            });
        }
    }

    // ========================================
    // Inicializar Inventario
    // ========================================
    function initInventory() {
        // Cargar inventario
        loadInventory();

        // Cargar números de serie para autocompletado
        loadSerialNumbers();

        // Manejar botón de agregar equipo
        const addButton = document.getElementById('add-inventory-item');
        if (addButton) {
            addButton.addEventListener('click', handleAddInventoryItem);
        }

        // Manejar filtros de inventario
        document.querySelectorAll('.btn-filter').forEach(button => {
            button.addEventListener('click', function () {
                // Solo aplicar a los filtros del inventario
                const parentSection = this.closest('.content-section');
                if (parentSection && parentSection.id === 'inventory') {
                    document.querySelectorAll('#inventory .btn-filter').forEach(btn => {
                        btn.classList.remove('active');
                    });

                    this.classList.add('active');

                    const filter = this.getAttribute('data-filter');
                    filterInventory(filter);
                }
            });
        });
    }

    // ========================================
    // Cargar inventario
    // ========================================
    function loadInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6">Cargando inventario...</td></tr>';

        database.ref('inventory').once('value').then(snapshot => {
            const items = snapshot.val() || {};
            const itemEntries = Object.entries(items);

            if (itemEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay equipos registrados</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            itemEntries.forEach(([id, item]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.brand}</td>
                    <td>${item.model}</td>
                    <td>${item.serialNumber}</td>
                    <td>${item.quantity}</td>
                    <td>
                        <button class="btn-action edit" onclick="editInventoryItem('${id}')">✏️</button>
                        <button class="btn-action delete" onclick="deleteInventoryItem('${id}')">🗑️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // ========================================
    // Cargar números de serie para autocompletado
    // ========================================
    function loadSerialNumbers() {
        const datalist = document.getElementById('serialNumbers');
        if (!datalist) return;

        database.ref('inventory').once('value').then(snapshot => {
            const items = snapshot.val() || {};
            let options = '';

            Object.values(items).forEach(item => {
                options += `<option value="${item.serialNumber}">`;
            });

            datalist.innerHTML = options;
        });
    }

    // ========================================
    // Manejar agregar equipo al inventario
    // ========================================
    function handleAddInventoryItem() {
        const name = document.getElementById('inventory-name').value.trim();
        const brand = document.getElementById('inventory-brand').value.trim();
        const model = document.getElementById('inventory-model').value.trim();
        const serial = document.getElementById('inventory-serial').value.trim();
        const quantity = parseInt(document.getElementById('inventory-quantity').value);
        const unit = document.getElementById('inventory-unit').value;
        const description = document.getElementById('inventory-description').value.trim();

        // Validaciones
        if (!name || !brand || !model || !serial || !quantity || !unit || !description) {
            showErrorModal('Por favor completa todos los campos');
            return;
        }

        if (quantity < 1) {
            showErrorModal('La cantidad debe ser mayor a 0');
            return;
        }

        // Crear nuevo equipo
        const itemData = {
            name: name,
            brand: brand,
            model: model,
            serialNumber: serial,
            quantity: quantity,
            unit: unit,
            description: description,
            createdAt: Date.now()
        };

        // Guardar en Firebase
        database.ref('inventory').push(itemData)
            .then(() => {
                showSuccessModal('✅ Equipo registrado exitosamente');
                // Limpiar formulario
                document.getElementById('inventory-name').value = '';
                document.getElementById('inventory-brand').value = '';
                document.getElementById('inventory-model').value = '';
                document.getElementById('inventory-serial').value = '';
                document.getElementById('inventory-quantity').value = '';
                document.getElementById('inventory-unit').value = '';
                document.getElementById('inventory-description').value = '';

                // Recargar inventario
                loadInventory();
                loadSerialNumbers();
            })
            .catch(error => {
                console.error('Error al registrar equipo:', error);
                showErrorModal('Error al registrar equipo: ' + error.message);
            });
    }

    // ========================================
    // Filtrar inventario
    // ========================================
    function filterInventory(filter) {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6">Filtrando...</td></tr>';

        database.ref('inventory').once('value').then(snapshot => {
            let items = snapshot.val() || {};

            if (filter === 'low-stock') {
                items = Object.fromEntries(
                    Object.entries(items).filter(([k, v]) => v.quantity <= 5)
                );
            }

            const itemEntries = Object.entries(items);

            if (itemEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay equipos con este filtro</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            itemEntries.forEach(([id, item]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.brand}</td>
                    <td>${item.model}</td>
                    <td>${item.serialNumber}</td>
                    <td>${item.quantity}</td>
                    <td>
                        <button class="btn-action edit" onclick="editInventoryItem('${id}')">✏️</button>
                        <button class="btn-action delete" onclick="deleteInventoryItem('${id}')">🗑️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // ========================================
    // Cargar entregas pendientes
    // ========================================
    function loadPendingDeliveries() {
        const tbody = document.getElementById('pending-deliveries-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6">Cargando entregas...</td></tr>';

        database.ref('pendingDeliveries').once('value').then(snapshot => {
            const deliveries = snapshot.val() || {};
            const deliveryEntries = Object.entries(deliveries);

            if (deliveryEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay entregas pendientes</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            deliveryEntries.forEach(([id, delivery]) => {
                const row = document.createElement('tr');
                const date = new Date(delivery.dateRequested).toLocaleDateString('es-MX');

                row.innerHTML = `
                    <td>${delivery.userName}</td>
                    <td>${delivery.itemName} (${delivery.serialNumber})</td>
                    <td>${delivery.quantity}</td>
                    <td>${delivery.department}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action edit" onclick="approveDelivery('${id}')">✅ Aprobar</button>
                        <button class="btn-action delete" onclick="rejectDelivery('${id}')">❌ Rechazar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // ========================================
    // Aprobar entrega
    // ========================================
    window.approveDelivery = function (deliveryId) {
        showConfirmModal(
            '¿Estás seguro de aprobar esta entrega?',
            () => {
                database.ref('pendingDeliveries/' + deliveryId).once('value')
                    .then(snapshot => {
                        if (!snapshot.exists()) {
                            throw new Error('Entrega no encontrada');
                        }

                        const delivery = snapshot.val();

                        // Verificar que el equipo existe en el inventario
                        return database.ref('inventory/' + delivery.itemId).once('value')
                            .then(itemSnapshot => {
                                if (!itemSnapshot.exists()) {
                                    throw new Error('El equipo ya no está en el inventario');
                                }

                                const item = itemSnapshot.val();

                                // Verificar stock disponible
                                if (item.quantity < delivery.quantity) {
                                    throw new Error('No hay suficiente stock disponible');
                                }

                                // Reducir inventario
                                const newQuantity = item.quantity - delivery.quantity;

                                return database.ref('inventory/' + delivery.itemId).update({
                                    quantity: newQuantity
                                })
                                    .then(() => {
                                        // Mover a entregas aprobadas
                                        return database.ref('deliveries').push({
                                            ...delivery,
                                            dateApproved: Date.now(),
                                            status: 'approved'
                                        });
                                    })
                                    .then(() => {
                                        // Eliminar de pendientes
                                        return database.ref('pendingDeliveries/' + deliveryId).remove();
                                    })
                                    .then(() => {
                                        showSuccessModal('✅ Entrega aprobada exitosamente');
                                        // Generar PDF
                                        generateDeliveryPDF(delivery);
                                        // Recargar entregas
                                        loadPendingDeliveries();
                                        loadDeliveryHistoryAdmin();
                                    });
                            });
                    })
                    .catch(error => {
                        console.error('Error al aprobar entrega:', error);
                        showErrorModal('Error al aprobar entrega: ' + error.message);
                    });
            }
        );
    };

    // ========================================
    // Rechazar entrega
    // ========================================
    window.rejectDelivery = function (deliveryId) {
        showConfirmModal(
            '¿Estás seguro de rechazar esta entrega?',
            () => {
                database.ref('pendingDeliveries/' + deliveryId).remove()
                    .then(() => {
                        showSuccessModal('✅ Entrega rechazada exitosamente');
                        loadPendingDeliveries();
                        loadDeliveryHistoryAdmin();
                    })
                    .catch(error => {
                        console.error('Error al rechazar entrega:', error);
                        showErrorModal('Error al rechazar entrega: ' + error.message);
                    });
            }
        );
    };

    // ========================================
    // Generar PDF de entrega
    // ========================================
    function generateDeliveryPDF(delivery) {
        // Usar jsPDF para generar el PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurar el PDF para que coincida con tu formato
        doc.setFontSize(12);

        // Cabecera
        doc.text('Instituto Tecnológico de Veracruz', 10, 10);
        doc.text('Subdirección de Servicios Administrativos', 10, 15);
        doc.text('Centro de Cómputo', 10, 20);

        // Fecha y folio
        const date = new Date(delivery.dateApproved || delivery.dateRequested);
        const fecha = date.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const folio = `Folio ${Math.floor(Math.random() * 1000)}`;

        doc.text(`H. Veracruz, Veracruz, ${fecha}`, 10, 30);
        doc.text(folio, 150, 30);

        // Asunto
        doc.text('Asignación y Resguardo de Equipo', 10, 40);

        // Texto del formato
        doc.text('Por este medio le envío un cordial saludo, el motivo principal del', 10, 50);
        doc.text('mismo es informarle que se le ha asignado para su uso y resguardo', 10, 55);
        doc.text('el equipo que a continuación se describe:', 10, 60);

        // Tabla de equipos
        doc.setFontSize(10);
        doc.text('Cantidad', 10, 75);
        doc.text('Descripción', 30, 75);
        doc.text('Marca', 90, 75);
        doc.text('Modelo', 120, 75);
        doc.text('Serie', 150, 75);

        doc.line(10, 77, 190, 77);

        doc.text(delivery.quantity.toString(), 10, 85);
        doc.text(delivery.itemName, 30, 85);
        doc.text('HP', 90, 85); // Marca (puedes obtenerla del inventario)
        doc.text('Pro Mini 400 G9', 120, 85); // Modelo
        doc.text(delivery.serialNumber, 150, 85);

        // Observaciones
        if (delivery.observations) {
            doc.text('Observaciones:', 10, 100);
            doc.text(delivery.observations, 10, 105);
        }

        // Secciones de "ENTREGÓ" y "RECIBIÓ"
        doc.rect(10, 120, 80, 40);
        doc.text('ENTREGÓ', 15, 125);
        doc.text('INSTITUTO TECNOLÓGICO DE', 15, 135);
        doc.text('VERACRUZ', 15, 140);
        doc.text('CENTRO DE CÓMPUTO', 15, 145);

        doc.rect(100, 120, 80, 40);
        doc.text('RECIBIÓ', 105, 125);
        doc.text(delivery.userName, 105, 135);
        doc.text(delivery.department, 105, 140);

        // Guardar PDF
        doc.save(`entrega-${delivery.itemId}-${date.getTime()}.pdf`);
    }

    // ========================================
    // EXTERNAL INVENTORY MANAGEMENT
    // ========================================

    // Initialize External Inventory Section
    function initExternalInventorySection() {
        loadExternalInventory();
        loadPendingRentals();

        // Initialize filters
        document.querySelectorAll('#external-inventory .btn-filter').forEach(button => {
            button.addEventListener('click', function () {
                document.querySelectorAll('#external-inventory .btn-filter').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const filter = this.getAttribute('data-filter');
                loadExternalInventory(filter);
            });
        });
    }

    // Load external inventory
    function loadExternalInventory(filter = 'all') {
        const tbody = document.getElementById('external-inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8">Cargando equipos foráneos...</td></tr>';

        database.ref('externalInventory').once('value').then(snapshot => {
            const items = snapshot.val() || {};
            let itemsArray = Object.entries(items).map(([id, data]) => ({ id, ...data }));

            // Filter by status
            if (filter === 'available') {
                itemsArray = itemsArray.filter(item => item.estado === 'disponible');
            } else if (filter === 'assigned') {
                itemsArray = itemsArray.filter(item => item.estado === 'asignado');
            }

            if (itemsArray.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay equipos foráneos registrados</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            itemsArray.forEach(item => {
                const estadoClass = item.estado === 'disponible' ? 'approved' : 'pending';
                const estadoText = item.estado === 'disponible' ? 'Disponible' : 'Asignado';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.clave}</td>
                    <td>${item.folio || '-'}</td>
                    <td>${item.marca} / ${item.modelo}</td>
                    <td>${item.serie}</td>
                    <td>${item.edificio || ''} - ${item.depto || ''} / ${item.responsable || '-'}</td>
                    <td>${item.proveedor || '-'}</td>
                    <td><span class="user-type-badge ${estadoClass}">${estadoText}</span></td>
                    <td>
                        <button class="btn-action edit" onclick="editExternalItem('${item.id}')" title="Editar">✏️</button>
                        <button class="btn-action delete" onclick="deleteExternalItem('${item.id}')" title="Eliminar">🗑️</button>
                        ${item.estado === 'asignado' ?
                        `<button class="btn-action edit" onclick="returnExternalItem('${item.id}')" title="Devolver">↩️</button>` :
                        ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // Add external equipment
    document.getElementById('add-external-item')?.addEventListener('click', function () {
        const clave = document.getElementById('external-clave').value.trim();
        const folio = document.getElementById('external-folio').value.trim();
        const marca = document.getElementById('external-marca').value.trim();
        const modelo = document.getElementById('external-modelo').value.trim();
        const serie = document.getElementById('external-serie').value.trim();
        const proveedor = document.getElementById('external-proveedor').value.trim();
        const edificio = document.getElementById('external-edificio').value.trim();
        const depto = document.getElementById('external-depto').value.trim();
        const responsable = document.getElementById('external-responsable').value.trim();
        const descripcion = document.getElementById('external-descripcion').value.trim();

        if (!clave || !folio || !marca || !modelo || !serie || !proveedor || !edificio || !depto || !responsable || !descripcion) {
            showErrorModal('Por favor completa todos los campos');
            return;
        }

        const itemData = {
            clave: clave,
            folio: folio,
            marca: marca,
            modelo: modelo,
            serie: serie,
            proveedor: proveedor,
            edificio: edificio,
            depto: depto,
            responsable: responsable,
            descripcion: descripcion,
            estado: 'disponible', // Por defecto disponible al registrar
            createdAt: Date.now()
        };

        database.ref('externalInventory').push(itemData)
            .then(() => {
                showSuccessModal('✅ Equipo foráneo registrado exitosamente');
                // Clear form
                document.getElementById('external-clave').value = '';
                document.getElementById('external-folio').value = '';
                document.getElementById('external-marca').value = '';
                document.getElementById('external-modelo').value = '';
                document.getElementById('external-serie').value = '';
                document.getElementById('external-proveedor').value = '';
                document.getElementById('external-edificio').value = '';
                document.getElementById('external-depto').value = '';
                document.getElementById('external-responsable').value = '';
                document.getElementById('external-descripcion').value = '';

                loadExternalInventory();
            })
            .catch(error => {
                console.error('Error al registrar equipo:', error);
                showErrorModal('Error al registrar equipo: ' + error.message);
            });
    });

    // Load pending rentals
    function loadPendingRentals() {
        const tbody = document.getElementById('pending-rentals-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6">Cargando rentas pendientes...</td></tr>';

        database.ref('externalRentals').orderByChild('status').equalTo('pending').once('value').then(snapshot => {
            const rentals = snapshot.val() || {};
            const rentalEntries = Object.entries(rentals);

            if (rentalEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay rentas pendientes</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            rentalEntries.forEach(([id, rental]) => {
                const row = document.createElement('tr');
                const date = new Date(rental.fechaSolicitud).toLocaleDateString('es-MX');

                row.innerHTML = `
                    <td>${rental.userName}</td>
                    <td>${rental.descripcion} (${rental.serie})</td>
                    <td>${rental.cantidad}</td>
                    <td>${rental.ubicacion}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-action edit" onclick="approveRental('${id}')">✅ Aprobar</button>
                        <button class="btn-action delete" onclick="rejectRental('${id}')">❌ Rechazar</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    // Approve rental
    window.approveRental = function (rentalId) {
        showConfirmModal(
            '¿Estás seguro de aprobar esta renta?',
            () => {
                database.ref('externalRentals/' + rentalId).once('value')
                    .then(snapshot => {
                        if (!snapshot.exists()) {
                            throw new Error('Renta no encontrada');
                        }

                        const rental = snapshot.val();

                        // Check if equipment is available
                        return database.ref('externalInventory/' + rental.itemId).once('value')
                            .then(itemSnapshot => {
                                if (!itemSnapshot.exists()) {
                                    throw new Error('El equipo ya no está en el inventario');
                                }

                                const item = itemSnapshot.val();

                                // Check stock
                                if (item.cantidad < rental.cantidad) {
                                    throw new Error('No hay suficiente stock disponible');
                                }

                                // Update inventory: mark as assigned
                                const newQuantity = item.cantidad - rental.cantidad;
                                const updates = {
                                    cantidad: newQuantity,
                                    estado: 'asignado',
                                    ubicacion: rental.ubicacion,
                                    usuarioAsignado: rental.userName,
                                    fechaEntrega: Date.now()
                                };

                                return database.ref('externalInventory/' + rental.itemId).update(updates)
                                    .then(() => {
                                        // Update rental status
                                        return database.ref('externalRentals/' + rentalId).update({
                                            status: 'approved',
                                            fechaEntrega: Date.now()
                                        });
                                    })
                                    .then(() => {
                                        showSuccessModal('✅ Renta aprobada exitosamente');
                                        // Generate PDF
                                        generateExternalRentalPDF(rental);
                                        // Reload data
                                        loadPendingRentals();
                                        loadExternalInventory();
                                        // Reload rental history if visible
                                        if (document.getElementById('rental-history').classList.contains('active')) {
                                            initRentalHistorySection();
                                        }
                                    });
                            });
                    })
                    .catch(error => {
                        console.error('Error al aprobar renta:', error);
                        showErrorModal('Error al aprobar renta: ' + error.message);
                    });
            }
        );
    };

    // Reject rental
    window.rejectRental = function (rentalId) {
        showConfirmModal(
            '¿Estás seguro de rechazar esta renta?',
            () => {
                database.ref('externalRentals/' + rentalId).update({ status: 'rejected' })
                    .then(() => {
                        showSuccessModal('✅ Renta rechazada exitosamente');
                        loadPendingRentals();
                        // Reload rental history if visible
                        if (document.getElementById('rental-history').classList.contains('active')) {
                            initRentalHistorySection();
                        }
                    })
                    .catch(error => {
                        console.error('Error al rechazar renta:', error);
                        showErrorModal('Error al rechazar renta: ' + error.message);
                    });
            }
        );
    };

    // Return equipment
    window.returnExternalItem = function (itemId) {
        showConfirmModal(
            '¿Estás seguro de marcar este equipo como devuelto?',
            () => {
                database.ref('externalInventory/' + itemId).update({
                    estado: 'disponible',
                    ubicacion: null,
                    usuarioAsignado: null,
                    fechaRecibido: Date.now()
                })
                    .then(() => {
                        showSuccessModal('✅ Equipo marcado como devuelto');
                        loadExternalInventory();
                        // Reload rental history if visible
                        if (document.getElementById('rental-history').classList.contains('active')) {
                            initRentalHistorySection();
                        }
                    })
                    .catch(error => {
                        console.error('Error al devolver equipo:', error);
                        showErrorModal('Error al devolver equipo: ' + error.message);
                    });
            }
        );
    };

    // ========================================
    // RENTAL HISTORY SECTION (CORREGIDO)
    // ========================================
    function initRentalHistorySection() {
        // Load stats and chart
        loadRentalReports();

        // Setup report generation button (CORREGIDO: Evita duplicados)
        const generateBtn = document.getElementById('generate-report');
        if (generateBtn) {
            // Remove any existing listeners
            const newBtn = generateBtn.cloneNode(true);
            generateBtn.parentNode.replaceChild(newBtn, generateBtn);

            newBtn.addEventListener('click', function () {
                const startDateInput = document.getElementById('start-date');
                const endDateInput = document.getElementById('end-date');

                if (!startDateInput || !endDateInput) {
                    showErrorModal('No se encontraron los campos de fecha');
                    return;
                }

                const startDate = startDateInput.value;
                const endDate = endDateInput.value;

                if (!startDate || !endDate) {
                    showErrorModal('Por favor selecciona ambas fechas');
                    return;
                }

                // Validate date range
                if (new Date(startDate) > new Date(endDate)) {
                    showErrorModal('La fecha de inicio no puede ser mayor a la fecha de fin');
                    return;
                }

                // Update chart with selected date range
                loadRentalChart(startDate, endDate);

                // Generate PDF report
                showSuccessModal('Generando reporte, por favor espera...', () => {
                    generateRentalReportPDF(startDate, endDate);
                });
            });
        }
    }

    // Load rental reports
    function loadRentalReports() {
        // Load stats
        database.ref('externalRentals').once('value').then(snapshot => {
            const rentals = snapshot.val() || {};
            const total = Object.keys(rentals).length;
            const assigned = Object.values(rentals).filter(r => r.status === 'approved').length;

            document.getElementById('total-rentals').textContent = total;
            document.getElementById('assigned-equipment').textContent = assigned;

            // Count unique businesses
            const businesses = new Set(Object.values(rentals).map(r => r.ubicacion));
            document.getElementById('businesses-served').textContent = businesses.size;
        });

        // Load chart data (last 7 days by default)
        loadRentalChart();
    }

    // Load rental chart with REAL data from Firebase (CORREGIDO: Sintaxis válida)
    function loadRentalChart(startDate = null, endDate = null) {
        const ctx = document.getElementById('rental-chart');
        if (!ctx) return;

        // Query Firebase for rentals in date range
        let query = database.ref('externalRentals');

        if (startDate && endDate) {
            const startTimestamp = new Date(startDate).getTime();
            const endTimestamp = new Date(endDate).getTime();
            query = query.orderByChild('fechaSolicitud').startAt(startTimestamp).endAt(endTimestamp);
        }

        query.once('value').then(snapshot => {
            const rentals = snapshot.val() || {};
            const rentalArray = Object.values(rentals);

            // Aggregate rentals by day
            const dayMap = {};
            rentalArray.forEach(rental => {
                const date = new Date(rental.fechaSolicitud);
                const dayKey = date.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                dayMap[dayKey] = (dayMap[dayKey] || 0) + 1;
            });

            // Prepare labels and data (last 7 days)
            const labels = Object.keys(dayMap).slice(-7);
            const dataValues = Object.values(dayMap).slice(-7);

            // Destroy existing chart if exists
            if (window.rentalChart) {
                window.rentalChart.destroy();
            }

            // CORREGIDO: Sintaxis válida de Chart.js
            window.rentalChart = new Chart(ctx, {
                type: 'bar',
                data: {  // <-- ¡CORREGIDO! Propiedad 'data' añadida
                    labels: labels.length > 0 ? labels : ['Sin datos'],
                    datasets: [{
                        label: 'Rentas por día',
                        data: dataValues.length > 0 ? dataValues : [0],  // <-- ¡CORREGIDO!
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: startDate && endDate ?
                                `Rentas del ${formatDate(startDate)} al ${formatDate(endDate)}` :
                                'Rentas de los últimos 7 días'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Rentas'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Fecha'
                            }
                        }
                    }
                }
            });
        }).catch(error => {
            console.error('Error loading rental chart:', error);
            showErrorModal('Error al cargar la gráfica de rentas');
        });
    }

    // ========================================
    // Generate PDF Report for External Rentals (CORREGIDO)
    // ========================================
    function generateRentalReportPDF(startDate, endDate) {
        // Query Firebase for rentals in date range
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();

        database.ref('externalRentals')
            .orderByChild('fechaSolicitud')
            .startAt(startTimestamp)
            .endAt(endTimestamp)
            .once('value')
            .then(snapshot => {
                const rentals = snapshot.val() || {};
                const rentalArray = Object.values(rentals);

                if (rentalArray.length === 0) {
                    showErrorModal('No hay rentas en el rango de fechas seleccionado');
                    return;
                }

                // Create PDF
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Header
                doc.setFontSize(18);
                doc.text('Reporte de Rentas Externas', 105, 15, null, null, 'center');
                doc.setFontSize(12);
                doc.text(`Periodo: ${formatDate(startDate)} a ${formatDate(endDate)}`, 105, 25, null, null, 'center');
                doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 105, 32, null, null, 'center');

                // Summary statistics
                const totalRentals = rentalArray.length;
                const approved = rentalArray.filter(r => r.status === 'approved').length;
                const pending = rentalArray.filter(r => r.status === 'pending').length;
                const rejected = rentalArray.filter(r => r.status === 'rejected').length;
                const businesses = new Set(rentalArray.map(r => r.ubicacion));

                doc.setFontSize(14);
                doc.text('Resumen Estadístico', 15, 45);
                doc.setFontSize(11);
                doc.text(`Total de Rentas: ${totalRentals}`, 15, 55);
                doc.text(`Rentas Aprobadas: ${approved}`, 15, 62);
                doc.text(`Rentas Pendientes: ${pending}`, 15, 69);
                doc.text(`Rentas Rechazadas: ${rejected}`, 15, 76);
                doc.text(`Negocios Atendidos: ${businesses.size}`, 15, 83);

                // Table headers
                const headers = ['Fecha', 'Usuario', 'Equipo', 'Cantidad', 'Ubicación', 'Estado'];
                let yPos = 95;

                // Draw table header
                doc.setFillColor(0, 86, 163); // TecNM blue
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.rect(10, yPos - 5, 190, 10, 'F');

                headers.forEach((header, i) => {
                    const xPos = 15 + (i * 30);
                    doc.text(header, xPos, yPos, null, null, 'center');
                });

                yPos += 12;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                // Table data
                rentalArray.slice(0, 25).forEach((rental, index) => { // Limit to 25 per page
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;

                        // Repeat headers on new page
                        doc.setFillColor(0, 86, 163);
                        doc.setTextColor(255, 255, 255);
                        doc.setFont('helvetica', 'bold');
                        doc.rect(10, yPos - 5, 190, 10, 'F');

                        headers.forEach((header, i) => {
                            const xPos = 15 + (i * 30);
                            doc.text(header, xPos, yPos, null, null, 'center');
                        });

                        yPos += 12;
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'normal');
                    }

                    const date = new Date(rental.fechaSolicitud).toLocaleDateString('es-MX');
                    const statusText = {
                        'pending': 'Pendiente',
                        'approved': 'Aprobada',
                        'rejected': 'Rechazada',
                        'returned': 'Devuelta'
                    }[rental.status] || rental.status;

                    const statusColor = {
                        'pending': '#f39c12',
                        'approved': '#27ae60',
                        'rejected': '#e74c3c',
                        'returned': '#3498db'
                    }[rental.status] || '#95a5a6';

                    // Status badge background
                    doc.setFillColor(parseInt(statusColor.slice(1, 3), 16),
                        parseInt(statusColor.slice(3, 5), 16),
                        parseInt(statusColor.slice(5, 7), 16));
                    doc.rect(165, yPos - 3, 25, 6, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.text(statusText.substring(0, 6), 177, yPos, null, null, 'center');
                    doc.setTextColor(0, 0, 0);

                    // Table row data
                    doc.text(date, 15, yPos, null, null, 'center');
                    doc.text(truncateText(rental.userName, 15), 45, yPos, null, null, 'center');
                    doc.text(truncateText(`${rental.descripcion} (${rental.serie})`, 20), 75, yPos, null, null, 'center');
                    doc.text(rental.cantidad.toString(), 105, yPos, null, null, 'center');
                    doc.text(truncateText(rental.ubicacion, 15), 135, yPos, null, null, 'center');

                    yPos += 10;
                });

                // Footer
                doc.setFontSize(10);
                doc.text('Instituto Tecnológico de Veracruz - Centro de Cómputo', 105, 290, null, null, 'center');
                doc.text(`Página ${doc.internal.getNumberOfPages()}`, 190, 290, null, null, 'right');

                // Save PDF
                const fileName = `reporte-rentas-${formatDateForFilename(startDate)}-a-${formatDateForFilename(endDate)}.pdf`;
                doc.save(fileName);

                showSuccessModal(`Reporte generado exitosamente: ${fileName}`);
            })
            .catch(error => {
                console.error('Error generating report:', error);
                showErrorModal('Error al generar el reporte: ' + error.message);
            });
    }

    // Helper functions for PDF
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatDateForFilename(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    // ========================================
    // Generate PDF for External Rental
    // ========================================
    function generateExternalRentalPDF(rental) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.text('Instituto Tecnológico de Veracruz', 10, 10);
        doc.text('Subdirección de Servicios Administrativos', 10, 15);
        doc.text('Centro de Cómputo', 10, 20);

        // Title
        doc.text('Formato de Renta de Equipo Externo', 10, 30);

        // Rental details
        doc.text(`Clave: ${rental.clave}`, 10, 40);
        doc.text(`Descripción: ${rental.descripcion}`, 10, 45);
        doc.text(`Marca: ${rental.marca}`, 10, 50);
        doc.text(`Modelo: ${rental.modelo}`, 10, 55);
        doc.text(`Serie: ${rental.serie}`, 10, 60);
        doc.text(`Cantidad: ${rental.cantidad}`, 10, 65);
        doc.text(`Ubicación (Negocio): ${rental.ubicacion}`, 10, 70);
        doc.text(`Departamento: ${rental.departamento}`, 10, 75);

        // Dates
        const fechaEntrega = new Date(rental.fechaEntrega || Date.now()).toLocaleDateString('es-MX');
        doc.text(`Fecha de Entrega: ${fechaEntrega}`, 10, 85);

        // Sections
        doc.rect(10, 100, 80, 40);
        doc.text('ENTREGÓ', 15, 105);
        doc.text('INSTITUTO TECNOLÓGICO DE', 15, 115);
        doc.text('VERACRUZ', 15, 120);
        doc.text('CENTRO DE CÓMPUTO', 15, 125);

        doc.rect(100, 100, 80, 40);
        doc.text('RECIBIÓ', 105, 105);
        doc.text(rental.userName, 105, 115);
        doc.text(rental.ubicacion, 105, 120);

        // Save PDF
        doc.save(`renta-${rental.clave}-${Date.now()}.pdf`);
    }

    // ========================================
    // Cargar Historial de Entregas (Admin)
    // ========================================
    function loadDeliveryHistoryAdmin(filter = 'all') {
        const container = document.getElementById('admin-history-container');
        if (!container) return;

        container.innerHTML = '<p>Cargando historial...</p>';

        database.ref('deliveries').once('value')
            .then(snapshot => {
                const deliveries = snapshot.val() || {};
                let deliveriesArray = Object.entries(deliveries).map(([id, data]) => ({ id, ...data }));

                if (filter !== 'all') {
                    deliveriesArray = deliveriesArray.filter(d => d.status === filter);
                }

                if (deliveriesArray.length === 0) {
                    container.innerHTML = '<p class="no-data">No hay entregas en este historial</p>';
                    return;
                }

                // Ordenar por fecha (más reciente primero)
                deliveriesArray.sort((a, b) => (b.dateApproved || b.dateRequested) - (a.dateApproved || a.dateRequested));

                // Renderizar
                container.innerHTML = `
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Equipo</th>
                                <th>Cantidad</th>
                                <th>Departamento</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${deliveriesArray.map(d => {
                    const date = new Date(d.dateApproved || d.dateRequested).toLocaleDateString('es-MX');
                    const statusClass = d.status === 'approved' ? 'approved' : 'rejected';
                    const statusText = d.status === 'approved' ? 'Aprobada' : 'Rechazada';

                    return `
                                    <tr>
                                        <td>${d.userName}</td>
                                        <td>${d.itemName} (${d.serialNumber})</td>
                                        <td>${d.quantity}</td>
                                        <td>${d.department}</td>
                                        <td><span class="user-type-badge ${statusClass}">${statusText}</span></td>
                                        <td>${date}</td>
                                    </tr>
                                `;
                }).join('')}
                        </tbody>
                    </table>
                `;
            })
            .catch(error => {
                console.error('Error al cargar historial:', error);
                container.innerHTML = '<p class="error">Error al cargar historial</p>';
            });
    }

    // ========================================
    // Editar equipo del inventario
    // ========================================
    window.editInventoryItem = function (itemId) {
        showSuccessModal(`Editar equipo: ${itemId}\n(Implementar en futuras versiones)`);
    };

    // ========================================
    // Eliminar equipo del inventario
    // ========================================
    window.deleteInventoryItem = function (itemId) {
        showConfirmModal(
            '¿Estás seguro de eliminar este equipo del inventario?',
            () => {
                database.ref('inventory/' + itemId).remove()
                    .then(() => {
                        showSuccessModal('✅ Equipo eliminado exitosamente');
                        loadInventory();
                        loadSerialNumbers();
                    })
                    .catch(error => {
                        console.error('Error al eliminar equipo:', error);
                        showErrorModal('Error al eliminar equipo: ' + error.message);
                    });
            }
        );
    };

    // ========================================
    // Editar equipo del inventario externo
    // ========================================
    window.editExternalItem = function (itemId) {
        showSuccessModal(`Editar equipo externo: ${itemId}\n(Implementar en futuras versiones)`);
    };

    // ========================================
    // Eliminar equipo del inventario externo
    // ========================================
    window.deleteExternalItem = function (itemId) {
        showConfirmModal(
            '¿Estás seguro de eliminar este equipo del inventario externo?',
            () => {
                database.ref('externalInventory/' + itemId).remove()
                    .then(() => {
                        showSuccessModal('✅ Equipo eliminado exitosamente');
                        loadExternalInventory();
                    })
                    .catch(error => {
                        console.error('Error al eliminar equipo:', error);
                        showErrorModal('Error al eliminar equipo: ' + error.message);
                    });
            }
        );
    };

    // ========================================
    // Cargar Estadísticas del Dashboard
    // ========================================
    function loadDashboardStats() {
        database.ref('users').once('value')
            .then(snapshot => {
                const users = snapshot.val() || {};
                const total = Object.keys(users).length;
                let alumnos = 0, admins = 0;

                Object.values(users).forEach(u => {
                    if (u.tipo === 'alumno') alumnos++;
                    if (u.tipo === 'administrativo') admins++;
                });

                const totalUsersElem = document.getElementById('total-users');
                const totalAlumnosElem = document.getElementById('total-alumnos');
                const totalAdminsElem = document.getElementById('total-administrativos');

                if (totalUsersElem) totalUsersElem.textContent = total;
                if (totalAlumnosElem) totalAlumnosElem.textContent = alumnos;
                if (totalAdminsElem) totalAdminsElem.textContent = admins;
            });
    }

    // ========================================
    // Cargar Lista de Usuarios
    // ========================================
    function loadUsersList() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

        database.ref('users').once('value').then(snapshot => {
            const users = snapshot.val() || {};
            const userEntries = Object.entries(users);

            if (userEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay usuarios</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            userEntries.forEach(([uid, data]) => {
                const id = data.tipo === 'alumno' ? data.numeroControl : data.rfc;
                const nombre = `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
                const area = data.tipo === 'alumno' ? data.carrera : data.area;

                tbody.innerHTML += `
                    <tr>
                        <td><span class="user-type-badge ${data.tipo}">${data.tipo === 'alumno' ? 'Usuario' : 'Administrador'}</span></td>
                        <td>${id}</td>
                        <td>${nombre}</td>
                        <td>${area}</td>
                        <td>
                            <button class="btn-action edit" onclick="editUser('${uid}')">✏️</button>
                            <button class="btn-action delete" onclick="deleteUser('${uid}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        });
    }

    // ========================================
    // Filtrar Lista de Usuarios
    // ========================================
    function filterUsersList(filter) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5">Filtrando...</td></tr>';

        database.ref('users').once('value').then(snapshot => {
            let users = snapshot.val() || {};

            if (filter === 'alumno') {
                users = Object.fromEntries(
                    Object.entries(users).filter(([k, v]) => v.tipo === 'alumno')
                );
            } else if (filter === 'administrativo') {
                users = Object.fromEntries(
                    Object.entries(users).filter(([k, v]) => v.tipo === 'administrativo')
                );
            }

            const userEntries = Object.entries(users);

            if (userEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay usuarios</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            userEntries.forEach(([uid, data]) => {
                const id = data.tipo === 'alumno' ? data.numeroControl : data.rfc;
                const nombre = `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
                const area = data.tipo === 'alumno' ? data.carrera : data.area;

                tbody.innerHTML += `
                    <tr>
                        <td><span class="user-type-badge ${data.tipo}">${data.tipo === 'alumno' ? 'Usuario' : 'Administrador'}</span></td>
                        <td>${id}</td>
                        <td>${nombre}</td>
                        <td>${area}</td>
                        <td>
                            <button class="btn-action edit" onclick="editUser('${uid}')">✏️</button>
                            <button class="btn-action delete" onclick="deleteUser('${uid}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
        });
    }

    // ========================================
    // DIRECT DELIVERY / RENTAL (ADMIN)
    // ========================================

    function initDirectDeliverySection() {
        const itemSelect = document.getElementById('direct-delivery-item');
        if (!itemSelect) return;

        loadAvailableItemsForAdmin('direct-delivery-item');

        const submitBtn = document.getElementById('submit-direct-delivery');
        if (submitBtn) {
            submitBtn.onclick = handleDirectDelivery;
        }
    }

    function initDirectRentalSection() {
        const itemSelect = document.getElementById('direct-rental-item');
        if (!itemSelect) return;

        loadAvailableExternalItemsForAdmin('direct-rental-item');

        const submitBtn = document.getElementById('submit-direct-rental');
        if (submitBtn) {
            submitBtn.onclick = handleDirectRental;
        }
    }

    function loadAvailableItemsForAdmin(selectId) {
        const itemSelect = document.getElementById(selectId);
        itemSelect.innerHTML = '<option value="">Cargando equipos...</option>';

        database.ref('inventory').once('value').then(snapshot => {
            const items = snapshot.val() || {};
            let options = '<option value="">Selecciona un equipo</option>';

            Object.entries(items).forEach(([id, item]) => {
                options += `<option value="${id}" data-serial="${item.serialNumber}" data-name="${item.name}">${item.name} (${item.serialNumber}) - Stock: ${item.quantity}</option>`;
            });

            itemSelect.innerHTML = options;
        });
    }

    function loadAvailableExternalItemsForAdmin(selectId) {
        const itemSelect = document.getElementById(selectId);
        itemSelect.innerHTML = '<option value="">Cargando equipos...</option>';

        database.ref('externalInventory').orderByChild('estado').equalTo('disponible').once('value').then(snapshot => {
            const items = snapshot.val() || {};
            let options = '<option value="">Selecciona un equipo</option>';

            Object.entries(items).forEach(([id, item]) => {
                options += `<option value="${id}" data-clave="${item.clave}" data-serie="${item.serie}" data-desc="${item.marca} ${item.modelo}">${item.marca} ${item.modelo} (${item.serie})</option>`;
            });

            itemSelect.innerHTML = options;
        });
    }

    function handleDirectDelivery() {
        const itemSelect = document.getElementById('direct-delivery-item');
        const quantity = parseInt(document.getElementById('direct-delivery-quantity').value);
        const destinatario = document.getElementById('direct-delivery-destinatario').value.trim();
        const depto = document.getElementById('direct-delivery-department').value.trim();
        const obs = document.getElementById('direct-delivery-observations').value.trim();

        if (!itemSelect.value || !quantity || !destinatario || !depto) {
            showErrorModal('Por favor completa todos los campos requeridos');
            return;
        }

        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const itemId = itemSelect.value;
        const itemName = selectedOption.dataset.name;
        const serial = selectedOption.dataset.serial;

        showConfirmModal(`¿Confirmar entrega directa de ${quantity} ${itemName} a ${destinatario}?`, () => {
            database.ref('inventory/' + itemId).once('value').then(snap => {
                const item = snap.val();
                if (item.quantity < quantity) {
                    showErrorModal('No hay suficiente stock');
                    return;
                }

                const newQty = item.quantity - quantity;
                const deliveryData = {
                    userId: 'admin',
                    userName: destinatario,
                    itemId: itemId,
                    itemName: itemName,
                    serialNumber: serial,
                    quantity: quantity,
                    department: depto,
                    observations: obs,
                    dateRequested: Date.now(),
                    dateApproved: Date.now(),
                    status: 'approved'
                };

                database.ref('inventory/' + itemId).update({ quantity: newQty })
                    .then(() => database.ref('deliveries').push(deliveryData))
                    .then(() => {
                        showSuccessModal('✅ Entrega directa registrada con éxito');
                        document.getElementById('direct-delivery-quantity').value = '';
                        document.getElementById('direct-delivery-destinatario').value = '';
                        document.getElementById('direct-delivery-observations').value = '';
                        loadAvailableItemsForAdmin('direct-delivery-item');
                        loadInventory();
                    })
                    .catch(err => showErrorModal('Error: ' + err.message));
            });
        });
    }

    function handleDirectRental() {
        const itemSelect = document.getElementById('direct-rental-item');
        const quantity = parseInt(document.getElementById('direct-rental-quantity').value);
        const destinatario = document.getElementById('direct-rental-destinatario').value.trim();
        const ubicacion = document.getElementById('direct-rental-ubicacion').value.trim();
        const obs = document.getElementById('direct-rental-observations').value.trim();

        if (!itemSelect.value || !quantity || !destinatario || !ubicacion) {
            showErrorModal('Por favor completa todos los campos requeridos');
            return;
        }

        const selectedOption = itemSelect.options[itemSelect.selectedIndex];
        const itemId = itemSelect.value;
        const clave = selectedOption.dataset.clave;
        const serie = selectedOption.dataset.serie;
        const desc = selectedOption.dataset.desc;

        showConfirmModal(`¿Confirmar renta directa a ${destinatario} en ${ubicacion}?`, () => {
            const rentalData = {
                userId: 'admin',
                userName: destinatario,
                itemId: itemId,
                clave: clave,
                serie: serie,
                descripcion: desc,
                cantidad: quantity,
                ubicacion: ubicacion,
                fechaSolicitud: Date.now(),
                fechaEntrega: Date.now(),
                status: 'approved',
                observations: obs
            };

            database.ref('externalInventory/' + itemId).update({
                estado: 'asignado',
                ubicacion: ubicacion,
                usuarioAsignado: destinatario,
                fechaEntrega: Date.now()
            })
                .then(() => database.ref('externalRentals').push(rentalData))
                .then(() => {
                    showSuccessModal('✅ Renta directa registrada con éxito');
                    document.getElementById('direct-rental-quantity').value = '';
                    document.getElementById('direct-rental-destinatario').value = '';
                    document.getElementById('direct-rental-ubicacion').value = '';
                    document.getElementById('direct-rental-observations').value = '';
                    loadAvailableExternalItemsForAdmin('direct-rental-item');
                    loadExternalInventory();
                })
                .catch(err => showErrorModal('Error: ' + err.message));
        });
    }

    // ========================================
    // Funciones Globales (para botones de acción)
    // ========================================
    window.editUser = function (uid) {
        showSuccessModal('Editar usuario: ' + uid);
    };

    window.deleteUser = function (uid) {
        showConfirmModal(
            '¿Eliminar este usuario?',
            () => {
                database.ref('users/' + uid).remove().then(() => {
                    showSuccessModal('Usuario eliminado');
                    loadUsersList();
                    loadDashboardStats();
                });
            }
        );
    };
});