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

    if (!modal) return;

    modalIcon.className = 'modal-icon';

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

    closeBtn.onclick = function () {
        modal.style.display = 'none';
        if (onCancel && type === 'confirm') onCancel();
    };

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            if (onCancel && type === 'confirm') onCancel();
        }
    };

    confirmBtn.onclick = function () {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

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
// Panel de Alumno - Lógica Principal
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        database.ref('users/' + user.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (!userData || userData.tipo !== 'alumno') {
                    showErrorModal('Acceso no autorizado');
                    window.location.href = 'login.html';
                    return;
                }

                // Store in sessionStorage for easy access
                sessionStorage.setItem('user', JSON.stringify({ uid: user.uid, ...userData }));

                const userNameElem = document.getElementById('user-name');
                if (userNameElem) userNameElem.textContent = `${userData.nombre} ${userData.apellidoPaterno}`;

                // Inicializar secciones
                initDashboard();
                initDeliveryForm();
                initInventorySection();
                initExternalInventorySection();
                initReportsSection();

                // Cargar datos iniciales
                loadAvailableItems();
                loadDeliveryHistory(user.uid);
                loadMyRentals(user.uid);
                initLogout();
            });
    });
});

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

    if (!windowOverlay || !windowTitle) return;

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
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    if (sectionId === 'inventory') {
        loadInventory();
    } else if (sectionId === 'external-inventory') {
        loadExternalInventory();
    } else if (sectionId === 'delivery-history') {
        loadDeliveryHistory(user.uid);
    } else if (sectionId === 'my-rentals') {
        loadMyRentals(user.uid);
    } else if (sectionId === 'request-delivery') {
        loadAvailableItems();
    } else if (sectionId === 'user-reports') {
        initReportsSection();
    }
}

// ========================================
// Inventario Interno
// ========================================
function initInventorySection() {
    const addBtn = document.getElementById('add-inventory-item');
    if (addBtn) {
        addBtn.onclick = handleAddInventoryItem;
    }
}

function handleAddInventoryItem() {
    const name = document.getElementById('inventory-name').value;
    const brand = document.getElementById('inventory-brand').value.trim();
    const model = document.getElementById('inventory-model').value.trim();
    const unit = document.getElementById('inventory-unit').value;
    const serial = document.getElementById('inventory-serial').value.trim();
    const quantity = parseInt(document.getElementById('inventory-quantity').value);
    const description = document.getElementById('inventory-description').value.trim();

    if (!name || !brand || !model || !unit || !serial || isNaN(quantity)) {
        showErrorModal('Por favor completa todos los campos requeridos');
        return;
    }

    const itemData = {
        name, brand, model, unit,
        serialNumber: serial,
        quantity,
        description,
        lastUpdated: Date.now()
    };

    database.ref('inventory').push(itemData)
        .then(() => {
            showSuccessModal('✅ Equipo registrado con éxito');
            loadInventory();
            // Clear form
            ['inventory-brand', 'inventory-model', 'inventory-serial', 'inventory-quantity', 'inventory-description'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            document.getElementById('inventory-name').value = '';
            document.getElementById('inventory-unit').value = '';
        });
}

function loadInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6">Cargando inventario...</td></tr>';

    database.ref('inventory').once('value').then(snapshot => {
        const items = snapshot.val() || {};
        const entries = Object.entries(items);

        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay equipos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = entries.map(([id, item]) => `
            <tr>
                <td>${item.name}</td>
                <td>${item.brand}</td>
                <td>${item.model}</td>
                <td>${item.serialNumber}</td>
                <td>${item.quantity}</td>
                <td>
                    <button class="btn-action edit" onclick="editInventoryItem('${id}')">✏️</button>
                    <!-- Usuario no puede eliminar -->
                </td>
            </tr>
        `).join('');
    });
}

window.editInventoryItem = function (id) {
    database.ref('inventory/' + id).once('value').then(snapshot => {
        const item = snapshot.val();
        if (!item) return;

        const newQtyStr = prompt(`Actualizar stock para ${item.name} (${item.serialNumber}):`, item.quantity);
        if (newQtyStr !== null) {
            const newQty = parseInt(newQtyStr);
            if (!isNaN(newQty)) {
                database.ref('inventory/' + id).update({ quantity: newQty, lastUpdated: Date.now() })
                    .then(() => {
                        showSuccessModal('Stock actualizado');
                        loadInventory();
                    });
            }
        }
    });
};

// ========================================
// Equipo Foráneo (Inventario Externo)
// ========================================
function initExternalInventorySection() {
    const addBtn = document.getElementById('add-external-item');
    if (addBtn) {
        addBtn.onclick = handleAddExternalItem;
    }
}

function handleAddExternalItem() {
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

    if (!clave || !folio || !marca || !modelo || !serie || !responsable) {
        showErrorModal('Por favor completa los campos principales');
        return;
    }

    const itemData = {
        clave, folio, marca, modelo, serie, proveedor,
        edificio, depto, responsable, descripcion,
        estado: 'asignado',
        fechaRegistro: Date.now()
    };

    database.ref('externalInventory').push(itemData)
        .then(() => {
            showSuccessModal('✅ Equipo foráneo registrado');
            loadExternalInventory();
            ['external-clave', 'external-folio', 'external-marca', 'external-modelo', 'external-serie',
                'external-proveedor', 'external-edificio', 'external-depto', 'external-responsable', 'external-descripcion'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
        });
}

function loadExternalInventory() {
    const tbody = document.getElementById('external-inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

    database.ref('externalInventory').once('value').then(snapshot => {
        const items = snapshot.val() || {};
        const entries = Object.entries(items);

        if (entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No hay equipos foráneos</td></tr>';
            return;
        }

        tbody.innerHTML = entries.map(([id, item]) => `
            <tr>
                <td>${item.clave}</td>
                <td>${item.folio}</td>
                <td>${item.marca} ${item.modelo}</td>
                <td>${item.serie}</td>
                <td>${item.edificio} / ${item.depto}</td>
                <td><span class="user-type-badge approved">${item.estado || 'asignado'}</span></td>
                <td>
                    <button class="btn-action edit" onclick="editExternalItem('${id}')">✏️</button>
                </td>
            </tr>
        `).join('');
    });
}

window.editExternalItem = function (id) {
    database.ref('externalInventory/' + id).once('value').then(snap => {
        const item = snap.val();
        if (!item) return;
        const newResp = prompt('Cambiar persona responsable:', item.responsable);
        if (newResp !== null) {
            database.ref('externalInventory/' + id).update({ responsable: newResp })
                .then(() => {
                    showSuccessModal('Responsable actualizado');
                    loadExternalInventory();
                });
        }
    });
};

// ========================================
// Reportes
// ========================================
function initReportsSection() {
    const btnDept = document.getElementById('print-report-dept');
    const btnPers = document.getElementById('print-report-person');

    if (btnDept) btnDept.onclick = () => generateUserReport('department');
    if (btnPers) btnPers.onclick = () => generateUserReport('person');
}

function generateUserReport(type) {
    const startDateStr = document.getElementById('report-start-date').value;
    const endDateStr = document.getElementById('report-end-date').value;

    if (!startDateStr || !endDateStr) {
        showErrorModal('Por favor selecciona un rango de fechas');
        return;
    }

    const startDate = new Date(startDateStr).getTime();
    const endDate = new Date(endDateStr).setHours(23, 59, 59, 999);

    database.ref('deliveries').once('value').then(snap => {
        const deliveries = snap.val() || {};
        const filtered = Object.values(deliveries).filter(d =>
            d.dateApproved >= startDate && d.dateApproved <= endDate
        );

        if (filtered.length === 0) {
            showErrorModal('No hay entregas aprobadas en ese rango de fechas');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('TECNM - Instituto Tecnológico de Veracruz', 10, 20);
        doc.setFontSize(14);
        doc.text(`Reporte de Entregas por ${type === 'department' ? 'Departamento' : 'Persona'}`, 10, 30);
        doc.setFontSize(10);
        doc.text(`Periodo: ${startDateStr} a ${endDateStr}`, 10, 38);

        let y = 50;
        doc.setFont(undefined, 'bold');
        doc.text('Fecha', 10, y);
        doc.text('Equipo', 35, y);
        doc.text('Cant', 85, y);
        doc.text(type === 'department' ? 'Depto' : 'Persona', 105, y);
        doc.text('Ubicación', 145, y);
        doc.text('Fact/Serie', 175, y);
        doc.line(10, y + 2, 200, y + 2);

        doc.setFont(undefined, 'normal');
        y += 10;

        filtered.forEach(d => {
            if (y > 270) { doc.addPage(); y = 20; }
            const dateStr = new Date(d.dateApproved).toLocaleDateString();
            doc.text(dateStr, 10, y);
            doc.text(d.itemName.substring(0, 15), 35, y);
            doc.text(d.quantity.toString(), 85, y);
            doc.text((type === 'department' ? d.department : d.userName).substring(0, 15), 105, y);
            doc.text((d.location || d.edificio || 'CC').substring(0, 10), 145, y);
            doc.text((d.invoiceNum || d.serialNumber || 'N/A').substring(0, 10), 175, y);
            y += 8;
        });

        doc.save(`reporte-${type}-${Date.now()}.pdf`);
        showSuccessModal('Reporte generado exitosamente');
    });
}

// ========================================
// Formulario de Entrega
// ========================================
function initDeliveryForm() {
    const submitBtn = document.getElementById('submit-delivery');
    if (submitBtn) {
        submitBtn.onclick = function () {
            const itemSelect = document.getElementById('delivery-item');
            const qty = parseInt(document.getElementById('delivery-quantity').value);
            const dept = document.getElementById('delivery-department').value;
            const obs = document.getElementById('delivery-observations').value || '';

            if (!itemSelect.value || isNaN(qty)) {
                showErrorModal('Completa los campos obligatorios');
                return;
            }

            const user = JSON.parse(sessionStorage.getItem('user'));
            const selectedItem = itemSelect.options[itemSelect.selectedIndex];

            const deliveryData = {
                userId: user.uid,
                userName: `${user.nombre} ${user.apellidoPaterno}`,
                itemId: itemSelect.value,
                itemName: selectedItem.text.split(' - ')[0],
                serialNumber: selectedItem.dataset.serial || '',
                quantity: qty,
                department: dept,
                observations: obs,
                dateRequested: Date.now(),
                status: 'pending'
            };

            database.ref('pendingDeliveries').push(deliveryData)
                .then(() => {
                    showSuccessModal('Solicitud enviada a revisión');
                    itemSelect.value = '';
                    document.getElementById('delivery-quantity').value = '';
                    document.getElementById('delivery-observations').value = '';
                    loadDeliveryHistory(user.uid);
                });
        };
    }
}

// ========================================
// Auxiliares
// ========================================
function loadAvailableItems() {
    const select = document.getElementById('delivery-item');
    if (!select) return;
    database.ref('inventory').once('value').then(snap => {
        const items = snap.val() || {};
        let opts = '<option value="">Selecciona equipo</option>';
        Object.entries(items).forEach(([id, item]) => {
            opts += `<option value="${id}" data-serial="${item.serialNumber}">${item.name} - ${item.serialNumber} (Stock: ${item.quantity})</option>`;
        });
        select.innerHTML = opts;
    });
}

function loadDeliveryHistory(userId) {
    const container = document.getElementById('history-container');
    if (!container) return;

    container.innerHTML = 'Cargando...';
    database.ref('deliveries').orderByChild('userId').equalTo(userId).once('value').then(snap => {
        const deliveries = Object.values(snap.val() || {});
        if (deliveries.length === 0) {
            container.innerHTML = 'No hay entregas registradas';
            return;
        }

        deliveries.sort((a, b) => (b.dateApproved || 0) - (a.dateApproved || 0));

        let html = '<table class="users-table"><thead><tr><th>Equipo</th><th>Cant.</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>';
        deliveries.forEach(d => {
            const dateStr = d.dateApproved ? new Date(d.dateApproved).toLocaleDateString() : 'N/A';
            html += `<tr><td>${d.itemName}</td><td>${d.quantity}</td><td><span class="user-type-badge approved">Aprobada</span></td><td>${dateStr}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    });
}

function loadMyRentals(userId) {
    const container = document.getElementById('my-rentals-container');
    if (!container) return;
    database.ref('externalRentals').orderByChild('userId').equalTo(userId).once('value').then(snap => {
        const rentals = Object.values(snap.val() || {});
        if (rentals.length === 0) {
            container.innerHTML = 'No hay rentas registradas';
            return;
        }
        let html = '<table class="users-table"><thead><tr><th>Equipo</th><th>Ubicación</th><th>Fecha</th></tr></thead><tbody>';
        rentals.forEach(r => {
            html += `<tr><td>${r.descripcion}</td><td>${r.ubicacion}</td><td>${new Date(r.fechaSolicitud).toLocaleDateString()}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    });
}

function initLogout() {
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        showConfirmModal('¿Cerrar sesión?', () => {
            auth.signOut().then(() => window.location.href = 'login.html');
        });
    });
}