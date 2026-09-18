const backendHost = window.location.hostname;

export const environment = {
    production: false,
    apiUrl: '/api',
    // Ruta relativa: pasa por el proxy de ng serve (proxy.conf.json), que ya reenvía
    // /ws-turnos a ws://localhost:8085/turnos. Así el navegador solo habla wss:// con
    // ng serve, y no necesita que el backend tenga su propio certificado HTTPS.
    wsUrl: '/ws-turnos',
    keycloak: {
        url:      `https://${backendHost}:9443`,
        realm:    'tomaturno',
        clientId: 'angular-frontend'
    }
};
