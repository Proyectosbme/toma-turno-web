export const environment = {
    production: false,
    apiUrl: '/api',
    wsUrl: '',   // vacío = usa location.host con el proxy de desarrollo
    keycloak: {
        url:      'http://localhost:9095',
        realm:    'tomaturno',
        clientId: 'angular-frontend'
    }
};
