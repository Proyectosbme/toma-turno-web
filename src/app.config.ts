import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { MessageService } from 'primeng/api';
import {
    provideKeycloak,
    withAutoRefreshToken,
    AutoRefreshTokenService,
    UserActivityService,
    includeBearerTokenInterceptor,
    INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG
} from 'keycloak-angular';
import { environment } from './environments/environment';

const TomaTurnoPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{sky.50}',
            100: '{sky.100}',
            200: '{sky.200}',
            300: '{sky.300}',
            400: '{sky.400}',
            500: '{sky.500}',
            600: '{sky.600}',
            700: '{sky.700}',
            800: '{sky.800}',
            900: '{sky.900}',
            950: '{sky.950}'
        }
    }
});

export const appConfig: ApplicationConfig = {
    providers: [
        MessageService,
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withEnabledBlockingInitialNavigation()
        ),
        provideHttpClient(
            withFetch(),
            withInterceptors([includeBearerTokenInterceptor])
        ),
        {
            provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
            useValue: [
                {
                    // Adjunta el token a cualquier URL que contenga /api/
                    urlPattern: /\/api\//,
                    httpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
                }
            ]
        },
        provideKeycloak({
            config: {
                url: `http://${window.location.hostname}:9095`,
                realm: environment.keycloak.realm,
                clientId: environment.keycloak.clientId
            },
            initOptions: {
                onLoad: window.location.pathname.startsWith('/auth/') ? 'check-sso' : 'login-required',
                pkceMethod: 'S256',
                checkLoginIframe: false,
                locale: 'es'
            },
            features: [
                withAutoRefreshToken({
                    onInactivityTimeout: 'logout',
                    sessionTimeout: 1800_000     // 30 min de inactividad
                })
            ],
            providers: [AutoRefreshTokenService, UserActivityService]
        }),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: TomaTurnoPreset, options: { darkModeSelector: '.app-dark' } } })
    ]
};
