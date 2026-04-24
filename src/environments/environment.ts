export const environment = {
    production: false,
    apiUrl: '/api',
     wsUrl: 'wss://localhost:8085/turnos',   // vacío = usa location.host con el proxy de desarrollo
    keycloak: {
        url:      'https://sso-qa.coop1.com.sv',
        realm:    'servicios-tomaturno',
        clientId: 'angular-frontend'
    }
};
