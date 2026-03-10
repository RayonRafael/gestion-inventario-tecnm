'use strict';

/**
 * ========================================
 * CONFIGURACIÓN Y CONSTANTES GLOBALES
 * ========================================
 */
const DOM = {
    modal: {
        container: document.getElementById('custom-modal'),
        icon: document.getElementById('modal-icon'),
        title: document.getElementById('modal-title'),
        message: document.getElementById('modal-message'),
        confirmBtn: document.getElementById('modal-confirm-btn'),
        cancelBtn: document.getElementById('modal-cancel-btn'),
        closeBtn: document.querySelector('.modal-close')
    },
    login: {
        alumnoForm: document.getElementById('alumno-login-form'),
        adminForm: document.getElementById('admin-login-form'),
        section: document.querySelector('.login-section')
    },
    delivery: {
        section: document.getElementById('delivery-section'),
        form: document.getElementById('delivery-form'),
        itemSelect: document.getElementById('delivery-item'),
        quantity: document.getElementById('delivery-quantity'),
        department: document.getElementById('delivery-department'),
        observations: document.getElementById('delivery-observations'),
        list: document.getElementById('my-deliveries-list')
    },
    tabs: {
        buttons: document.querySelectorAll('.tab-btn'),
        contents: document.querySelectorAll('.tab-content')
    }
};

const MESSAGES = {
    authError: 'Error de autenticación',
    networkError: 'Error de red. Por favor intenta más tarde.',
    missingFields: 'Por favor completa todos los campos requeridos.',
    invalidControl: 'El número de control debe tener exactamente 8 dígitos',
    invalidRFC: 'Formato de RFC inválido. Ejemplo: XAXX010101000'
};

/**
 * ========================================
 * SISTEMA DE MODALES
 * ========================================
 */
const Modal = {
    show(type, title, message, onConfirm = null, onCancel = null) {
        if (!DOM.modal.container) return;

        // Reset state
        DOM.modal.icon.className = 'modal-icon';
        DOM.modal.cancelBtn.style.display = 'none';

        // Configure logic based on type
        const config = {
            success: { icon: '✅', class: 'success', title: '¡Éxito!' },
            error: { icon: '❌', class: 'error', title: 'Error' },
            confirm: { icon: '❓', class: 'confirm', title: 'Confirmar acción', showCancel: true },
            info: { icon: 'ℹ️', class: 'info', title: 'Información' }
        }[type] || { icon: 'ℹ️', class: 'info', title: title || 'Información' };

        // Update UI
        DOM.modal.icon.textContent = config.icon;
        DOM.modal.icon.classList.add(config.class);
        DOM.modal.title.textContent = title || config.title;
        DOM.modal.message.textContent = message;

        if (config.showCancel) {
            DOM.modal.cancelBtn.style.display = 'inline-block';
        }

        DOM.modal.container.style.display = 'block';

        // Event Handlers
        const close = () => {
            DOM.modal.container.style.display = 'none';
            if (config.showCancel && onCancel) onCancel();
        };

        const confirm = () => {
            DOM.modal.container.style.display = 'none';
            if (onConfirm) onConfirm();
        };

        // Bind events (removing previous listeners not needed if we overwrite onclick)
        DOM.modal.closeBtn.onclick = close;
        DOM.modal.cancelBtn.onclick = config.showCancel ? close : null;
        DOM.modal.confirmBtn.onclick = confirm;

        // Close on outside click
        window.onclick = (e) => {
            if (e.target === DOM.modal.container) close();
        };
    },

    success(msg, cb) { this.show('success', null, msg, cb); },
    error(msg, cb) { this.show('error', null, msg, cb); },
    confirm(msg, cb, onCancel) { this.show('confirm', null, msg, cb, onCancel); }
};

// Expose internal Modal methods to global scope for HTML inline compatibility
window.showModal = Modal.show;
window.showSuccessModal = Modal.success.bind(Modal);
window.showErrorModal = Modal.error.bind(Modal);
window.showConfirmModal = Modal.confirm.bind(Modal);


/**
 * ========================================
 * LÓGICA DE APLICACIÓN
 * ========================================
 */

// Helper: Authenticate against Firebase and validate User Data
async function authenticateUser(email, password, typeValidationFn) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        if (!snapshot.exists()) throw new Error('Usuario no encontrado en la base de datos');

        const userData = snapshot.val();

        // Custom validation based on login type (alumno vs admin)
        if (!typeValidationFn(userData)) throw new Error('Credenciales incorrectas para este tipo de usuario');

        // Sanitize and save session
        const sessionData = {
            uid: user.uid,
            tipo: userData.tipo,
            nombre: userData.nombre,
            apellidoPaterno: userData.apellidoPaterno,
            apellidoMaterno: userData.apellidoMaterno,
            ...(userData.numeroControl && { numeroControl: userData.numeroControl }),
            ...(userData.carrera && { carrera: userData.carrera }),
            ...(userData.rfc && { rfc: userData.rfc }),
            ...(userData.area && { area: userData.area })
        };

        sessionStorage.setItem('user', JSON.stringify(sessionData));
        return sessionData;

    } catch (error) {
        let msg = MESSAGES.authError;
        // Map Firebase error codes to user-friendly messages
        const errorMap = {
            'auth/invalid-email': 'Formato de email inválido.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/user-not-found': 'Usuario no encontrado.'
        };

        throw new Error(errorMap[error.code] || error.message);
    }
}

// Global function used in buttons
function switchTab(tabType) {
    DOM.tabs.buttons.forEach(btn => btn.classList.remove('active'));
    DOM.tabs.contents.forEach(content => content.classList.remove('active'));

    const index = tabType === 'alumno' ? 0 : 1;
    const formId = tabType === 'alumno' ? 'alumno-form' : 'administrativo-form';

    if (DOM.tabs.buttons[index]) DOM.tabs.buttons[index].classList.add('active');
    const form = document.getElementById(formId);
    if (form) form.classList.add('active');
}
window.switchTab = switchTab; // Ensure global availability

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIN FORM HANDLERS ---

    const handleLoginSubmit = async (e, type) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        try {
            btn.textContent = 'Iniciando sesión...';
            btn.disabled = true;

            let email, password;
            let successRedirect = 'admin.html'; // Default for admin

            if (type === 'alumno') {
                const control = document.getElementById('alumno-control').value.trim();
                password = document.getElementById('alumno-password').value.trim();

                if (!control || !password) throw new Error(MESSAGES.missingFields);
                if (!/^[0-9]{8}$/.test(control)) throw new Error(MESSAGES.invalidControl);

                email = `${control}@alumno.tecnm.mx`;

                // Validate user is 'alumno'
                await authenticateUser(email, password, (data) => data.tipo === 'alumno');
                successRedirect = 'alumno.html';

            } else {
                const rfc = document.getElementById('admin-rfc').value.trim();
                password = document.getElementById('admin-password').value.trim();

                if (!rfc || !password) throw new Error(MESSAGES.missingFields);
                if (!/^[A-Z0-9]{12,13}$/.test(rfc)) throw new Error(MESSAGES.invalidRFC);

                email = `${rfc}@tecnm.mx`;

                // Admin validation allow generic types for now as per original logic
                await authenticateUser(email, password, () => true);
            }

            window.location.href = successRedirect;

        } catch (error) {
            console.error(error);
            Modal.error(error.message);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    };

    if (DOM.login.alumnoForm) {
        DOM.login.alumnoForm.addEventListener('submit', (e) => handleLoginSubmit(e, 'alumno'));
    }

    if (DOM.login.adminForm) {
        DOM.login.adminForm.addEventListener('submit', (e) => handleLoginSubmit(e, 'admin'));
    }

    // --- DELIVERY SECTION LOGIC (INJECTED) ---

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('delivery')) {
        const user = JSON.parse(sessionStorage.getItem('user'));

        // Check if user is logged in as student
        if (user && user.tipo === 'alumno' && DOM.login.section && DOM.delivery.section) {
            // Swap views
            DOM.login.section.style.display = 'none';
            DOM.delivery.section.style.display = 'block';

            setupLogoutButton();
            loadAvailableItems(user);
            loadMyDeliveries(user.uid);

            DOM.delivery.form.addEventListener('submit', (e) => handleDeliverySubmit(e, user));
        }
    }

    function setupLogoutButton() {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'student-logout-btn';
        logoutBtn.innerHTML = '🚪 Cerrar Sesión';
        logoutBtn.onclick = () => {
            Modal.confirm('¿Estás seguro de que deseas cerrar sesión?', async () => {
                try {
                    await auth.signOut();
                    sessionStorage.removeItem('user');
                    // Reload to clear state/params
                    window.location.href = window.location.pathname;
                } catch (err) {
                    Modal.error('Error al cerrar sesión: ' + err.message);
                }
            });
        };

        const container = document.createElement('div');
        container.className = 'student-logout-container';
        container.appendChild(logoutBtn);
        // Insert at top of delivery section
        DOM.delivery.section.insertBefore(container, DOM.delivery.section.firstChild);
    }

    async function loadAvailableItems(user) {
        const itemSelect = DOM.delivery.itemSelect;
        itemSelect.innerHTML = '<option value="">Cargando equipos...</option>';

        try {
            const snapshot = await database.ref('inventory').once('value');
            const items = snapshot.val() || {};

            // Build options string
            const options = Object.entries(items).map(([id, item]) =>
                `<option value="${id}" data-serial="${item.serialNumber}">${item.name} - ${item.serialNumber}</option>`
            ).join('');

            itemSelect.innerHTML = '<option value="">Selecciona un equipo</option>' + options;

            if (user.carrera) {
                DOM.delivery.department.value = user.carrera;
            }

        } catch (err) {
            console.error('Error loading inventory:', err);
            itemSelect.innerHTML = '<option value="">Error al cargar equipos</option>';
        }
    }

    async function loadMyDeliveries(userId) {
        const container = DOM.delivery.list;
        container.innerHTML = '<p>Cargando tus solicitudes...</p>';

        try {
            const snapshot = await database.ref('pendingDeliveries')
                .orderByChild('userId')
                .equalTo(userId)
                .once('value');

            const deliveries = snapshot.val();

            if (!deliveries) {
                container.innerHTML = '<p>No tienes solicitudes pendientes</p>';
                return;
            }

            // Render items
            container.innerHTML = Object.values(deliveries).map(d => {
                const statusLabels = { pending: 'Pendiente de autorización', approved: 'Aprobada', rejected: 'Rechazada' };
                const label = statusLabels[d.status] || d.status;
                const date = new Date(d.dateRequested).toLocaleDateString('es-MX');

                return `
                    <div class="delivery-item ${d.status}">
                        <h4>${d.itemName} - ${d.quantity} ${d.quantity > 1 ? 'unidades' : 'unidad'}</h4>
                        <p><strong>Estado:</strong> ${label}</p>
                        <p><strong>Fecha:</strong> ${date}</p>
                        <p><strong>Departamento:</strong> ${d.department}</p>
                        ${d.observations ? `<p><strong>Observaciones:</strong> ${d.observations}</p>` : ''}
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            container.innerHTML = '<p>Error al cargar historial.</p>';
        }
    }

    async function handleDeliverySubmit(e, user) {
        e.preventDefault();

        const itemSelect = DOM.delivery.itemSelect;
        const selectedOption = itemSelect.options[itemSelect.selectedIndex];

        // Validations
        if (!selectedOption.value) return Modal.error('Por favor selecciona un equipo');

        const quantity = parseInt(DOM.delivery.quantity.value);
        if (!quantity || quantity < 1) return Modal.error('Por favor ingresa una cantidad válida');

        const payload = {
            userId: user.uid,
            userName: `${user.nombre} ${user.apellidoPaterno} ${user.apellidoMaterno}`,
            itemId: itemSelect.value,
            itemName: selectedOption.text.split(' - ')[0],
            serialNumber: selectedOption.dataset.serial,
            quantity: quantity,
            department: DOM.delivery.department.value,
            observations: DOM.delivery.observations.value || '',
            dateRequested: Date.now(),
            status: 'pending'
        };

        try {
            await database.ref('pendingDeliveries').push(payload);

            Modal.success('Solicitud enviada exitosamente. Espera la autorización del administrador.');

            // Reset form strictly
            itemSelect.value = '';
            DOM.delivery.quantity.value = '';
            DOM.delivery.observations.value = '';

            // Restore department if needed
            if (user.carrera) DOM.delivery.department.value = user.carrera;

            loadMyDeliveries(user.uid);

        } catch (err) {
            console.error(err);
            Modal.error('Error al enviar solicitud: ' + err.message);
        }
    }

    // --- UI EFFECTS ---

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (!header) return;

        const isScrolled = window.scrollY > 50;

        header.style.boxShadow = isScrolled
            ? '0 4px 12px rgba(0, 0, 0, 0.15)'
            : 'var(--shadow)';

        header.style.background = isScrolled
            ? 'linear-gradient(to right, var(--tec-blue-dark), var(--tec-blue))'
            : 'var(--tec-blue-dark)';
    });
});