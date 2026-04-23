export const environment = {
    production: false,
    apiUrl: '/api',
    wsUrl: '',   // vacío = usa location.host con el proxy de desarrollo
    keycloak: {
        url:      'https://sso-qa.coop1.com.sv',
        realm:    'servicios-tomaturnos',
        clientId: 'angular-frontend'
    }
};
