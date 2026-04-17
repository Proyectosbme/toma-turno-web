<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=false; section>

    <#if section = "header"></#if>

    <#if section = "form">
    <div class="tt-wrapper">
        <div class="tt-gradient-border">
            <div class="tt-card">

                <!-- Logo / ícono -->
                <div class="tt-header">
                    <#if realm.displayNameHtml??>
                        <div class="tt-icon">&#xE91C;</div>
                    </#if>
                    <div class="tt-title">${(realm.displayName)!'TOMATURNO'}</div>
                    <div class="tt-subtitle">Inicie sesión para continuar</div>
                </div>

                <!-- Formulario -->
                <form action="${url.loginAction}" method="post">

                    <!-- Usuario -->
                    <div class="tt-field">
                        <label for="username" class="tt-label">Usuario</label>
                        <input id="username"
                               name="username"
                               type="text"
                               class="tt-input"
                               placeholder="Código de usuario"
                               value="${(login.username)!''}"
                               autofocus
                               autocomplete="off" />
                    </div>

                    <!-- Contraseña -->
                    <div class="tt-field">
                        <label for="password" class="tt-label">Contraseña</label>
                        <div class="tt-input-wrap">
                            <input id="password"
                                   name="password"
                                   type="password"
                                   class="tt-input"
                                   placeholder="Contraseña"
                                   autocomplete="current-password" />
                            <span class="tt-eye" onclick="togglePassword()">&#xE946;</span>
                        </div>
                    </div>

                    <!-- Error -->
                    <#if message?has_content && message.type = 'error'>
                    <div class="tt-error">
                        ${kcSanitize(message.summary)?no_esc}
                    </div>
                    </#if>

                    <!-- Botón -->
                    <button type="submit" class="tt-btn">
                        Iniciar Sesión
                    </button>

                    <!-- Registro -->
                    <div class="tt-register-link">
                        <span>¿Eres nuevo?</span>
                        <a href="${properties.registroUrl!'http://localhost:4200/auth/registro'}">Regístrate aquí</a>
                    </div>

                </form>
            </div>
        </div>
    </div>

    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            const eye   = document.querySelector('.tt-eye');
            if (input.type === 'password') {
                input.type = 'text';
                eye.style.opacity = '1';
            } else {
                input.type = 'password';
                eye.style.opacity = '0.5';
            }
        }
    </script>
    </#if>

</@layout.registrationLayout>
