export const environment = {
    production: true,
    apiUrl: 'https://192.168.1.132:8443',
    wsUrl: 'wss://192.168.1.132:8443/turnos',
    keycloak: {
        url:      'https://sso-qa.coop1.com.sv',
        realm:    'servicios-tomaturnos',
        clientId: 'angular-frontend'
    }
};
