// Configuración de Firebase para TeCNM Veracruz
// Proyecto: tecn-m-veracruz-inventario

const firebaseConfig = {
    apiKey: "AIzaSyBNeCklgsKk9zej0RtdP6nqhe_Y3_v9dyo",
    authDomain: "tecnm-veracruz-inventario.firebaseapp.com",
    databaseURL: "https://tecnm-veracruz-inventario-default-rtdb.firebaseio.com",
    projectId: "tecnm-veracruz-inventario",
    storageBucket: "tecnm-veracruz-inventario.firebasestorage.app",
    messagingSenderId: "659601231602",
    appId: "1:659601231602:web:c1084317ac1ae2da60ca6b"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a Firebase
const auth = firebase.auth();
const database = firebase.database();