<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=false; section>

    <#if section = "header"></#if>

    <#if section = "form">
    <div class="tt-wrapper">
        <div class="tt-card">

            <div class="tt-header">
                <div class="tt-brand-icon">&#x1F512;</div>
                <div class="tt-title">Iniciar Sesión</div>
                <div class="tt-subtitle">Ingrese sus credenciales para continuar</div>
            </div>

            <form action="${url.loginAction}" method="post">

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

                <#if message?has_content && message.type = 'error'>
                <div class="tt-error">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
                </#if>

                <button type="submit" class="tt-btn">Iniciar Sesión</button>

                <div class="tt-forgot">
                    <a href="${url.loginResetCredentialsUrl}">¿Olvidaste tu contraseña?</a>
                </div>

                <div class="tt-register-link">
                    <span>¿Eres nuevo?</span>
                    <a href="${properties.registroUrl!'https://tomaturnos.coop1.com.sv/auth/registro'}">Regístrate aquí</a>
                </div>

            </form>
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
