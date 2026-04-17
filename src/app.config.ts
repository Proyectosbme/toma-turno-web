import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
    INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
    KEYCLOAK_EVENT_SIGNAL,
    KeycloakEventType
} from 'keycloak-angular';
import { filter, firstValueFrom } from 'rxjs';
import Keycloak from 'keycloak-js';
import { environment } from './environments/environment';
import { AuthApiClient } from '@auth/api/auth-api.client';
import { AuthService } from '@auth/services/auth.service';
import { BrandingService } from '@core/layout/service/branding.service';

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
                    // Adjunta el token a cualquier llamada que empiece con /api
                    urlPattern: /^\/api\//,
                    httpMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
                }
            ]
        },
        provideKeycloak({
            config: {
                url: environment.keycloak.url,
                realm: environment.keycloak.realm,
                clientId: environment.keycloak.clientId
            },
            initOptions: {
                onLoad: 'login-required',   // fuerza login al arrancar
                pkceMethod: 'S256',        // PKCE con SHA-256
                checkLoginIframe: false
            },
            features: [
                withAutoRefreshToken({
                    onInactivityTimeout: 'logout',
                    sessionTimeout: 1800_000     // 30 min de inactividad
                })
            ],
            providers: [AutoRefreshTokenService, UserActivityService]
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: (authApi: AuthApiClient, authService: AuthService, branding: BrandingService, kc: Keycloak, injector: Injector) =>
                async () => {
                    try {
                        // Nuestro APP_INITIALIZER corre en paralelo con el de Keycloak.
                        // Si el token aún no está listo, esperamos a AuthSuccess/Ready antes de consultar el perfil.
                        if (!kc.authenticated) {
                            const keycloakSignal = injector.get(KEYCLOAK_EVENT_SIGNAL);
                            await firstValueFrom(
                                toObservable(keycloakSignal, { injector }).pipe(
                                    filter(e =>
                                        e.type === KeycloakEventType.AuthSuccess ||
                                        e.type === KeycloakEventType.AuthError ||
                                        e.type === KeycloakEventType.Ready
                                    )
                                )
                            );
                        }

                        if (kc.authenticated) {
                            const codigoUsuario = authService.getCodigoUsuario();
                            if (codigoUsuario) {
                                const perfil = await authApi.getPerfil();
                                authService.setPerfilBackend(perfil);
                            }
                        }
                    } catch {
                        // Sin sesión activa o sin perfil en BD todavía
                    }
                    await branding.cargar();
                },
            deps: [AuthApiClient, AuthService, BrandingService, Keycloak, Injector],
            multi: true
        },
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: TomaTurnoPreset, options: { darkModeSelector: '.app-dark' } } })
    ]
};
